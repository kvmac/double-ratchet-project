import React, {useState, useEffect} from 'react';
import axios from 'axios';
import useCrypto from './use-crypto';
import { useStore, storeValue } from './use-store';
import useChain from './use-chain';
import { hexStringToBytes, bytesToHex } from '../utils';

const useDoubleRatchet = (masterSecret, { maxSkip }) => {
  // immediately store master secret after X3DH
  storeValue("MASTER_SECRET", masterSecret);
  const MAX_SKIP = maxSkip || 20;

  const [ myDHPubKey, setMyDHPubKey ] = useStore("MY_DH_PUB_KEY", hexStringToBytes("901737441b60c4226be178a93839a192441cb3d0bf1321f9c95dd0831cebe93e"));
  const [ myDHPrivKey, setMyDHPrivKey ] = useStore("MY_DH_PRIV_KEY", hexStringToBytes("fa10936fe8e7652a9504cf0970bf46dee8c94593ebd87f35a13dd4e1f4edd1ac"));
  const [ theirDHPubKey, setTheirDHPubKey ] = useStore("THEIR_DH_PUB_KEY", hexStringToBytes("b05ea9404fea0c1c16640d96eec59c5412b8e07d4feac9d5a25dc458d0dae238"));

  // Initialize root, sending, and receiving chain hooks
  const { rootChain, sendingChain, receivingChain, updateChain, updateSendingChain, updateReceivingChain } = useChain(masterSecret);

  // Initialize Crypto hooks
  const { GenerateKeyPair, DeriveSecret, Hkdf, KdfRK, KdfCK, Encrypt, Decrypt, EncodeHeader } = useCrypto();

  useEffect(() => {
    (async () => {
      // This call will be removed once X3DH is implemented
      const res = await axios("localhost:8080/keys", {method: "get"});
      const { pubKey } = res.data;

      const [ rootKey, sendingKey ] = await Hkdf(masterSecret);

      await updateChain({
        rootKey,
        sendingKey
      });
      await setTheirDHPubKey(pubKey);
    })();
  }, [])

  const dhRatchet = async (header) => {
    setTheirDHPubKey(header.dh);
    const dhOutSending = await DeriveSecret(myDHPrivKey, header.dh);
    const [ rk, receivingKey ] = KdfRK(rootChain.key, dhOutSending);

    const newDHKeyPair = GenerateKeyPair();
    const dhOutReceiving = await DeriveSecret(newDHKeyPair.privateKey, header.dh);
    const [ rootKey, sendingKey ] = await KdfRK(rk, dhOutReceiving);

    await updateChain({
      previousChainNumber: sendingChain.n,
      receivingKey,
      sendingKey,
      sendingNumber: 0,
      receivingNumber: 0,
      rootKey
    });

    setMyDHPrivKey(newDHKeyPair.privateKey);
    setMyDHPubKey(newDHKeyPair.publicKey);
  };

  const trySkippedMessageKeys = async (header, ciphertext, AD) => {
    if (rootChain.SKIPPED[header.dh, header.n]) {
      let msgKey = rootChain.SKIPPED[header.dh, header.n];
      delete rootChain.SKIPPED[header.dh, header.n];

      const headerBytes = EncodeHeader(header, AD);

      return await Decrypt(ciphertext, msgKey, headerBytes);
    }

    return "";
  };

  const skipMessageKeys = async (until) => {
    if (receivingChain.n + MAX_SKIP < until) {
      throw new Error("Cannot skip that many message keys");
    }
    if (receivingChain.key) {
      const [ msgKey, receivingKey ] = await KdfCK(receivingChain.key);
      let skipped = rootChain.SKIPPED;
      skipped[theirDHPubKey, receivingChain.n] = msgKey;

      updateChain({
        receivingKey,
        receivingNumber: (receivingChain.n + 1),
        skippedMessages: skipped
      });
    }
  };

  const createHeader = (myDHPubKey, pn, n, AD) => {
    const h = {
      dh: myDHPubKey.toString('hex'),
      pn,
      n
    };

    return [ h, EncodeHeader(h, AD) ];
  };

  const RatchetEncrypt = async (plaintext, AD) => {
    const [ msgKey, sendingKey ] = await KdfCK(sendingChain.key);
    let [ header, encodedHeader ] = createHeader(myDHPubKey, sendingChain.pn, sendingChain.n, AD);

    updateSendingChain({
      sendingKey,
      sendingNumber: (sendingChain.n + 1)
    });

    const ciphertext = await Encrypt(plaintext, msgKey, encodedHeader);

    return {
      header,
      ciphertext: bytesToHex(ciphertext)
    };
  };

  const RatchetDecrypt = async ({header, ciphertext}, AD) => {
    const plaintext = trySkippedMessageKeys(header, ciphertext, AD);

    if (plaintext) {
      return plaintext;
    }
    if (header.dh !== theirDHPubKey) {
      skipMessageKeys(header.pn);
      dhRatchet(header);
    }

    skipMessageKeys(header.n);
    let [ msgKey, receivingKey ] = KdfCK(receivingChain.key);

    updateReceivingChain({
      receivingKey,
      receivingNumber: receivingChain.n + 1,
    });

    const encodedHeader = EncodeHeader(header, AD);

    return await Decrypt(ciphertext, msgKey, encodedHeader);
  };

  return [ RatchetEncrypt, RatchetDecrypt ];
};

export default useDoubleRatchet;