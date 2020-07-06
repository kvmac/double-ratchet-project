import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {ec, eddsa} from 'elliptic'
import useCrypto from './use-crypto';
import { useStore } from './use-store';
import useChain from './use-chain';

// TODO: remove initialMasterSecret once I get this thing running
const useX3dh = ({ uri, initialMasterSecret }) => {
  // my keys
  const [ myIdentityPrivKey, setMyIdentityPrivKey ] = useStore("MY_IDENTITY_PRIV_KEY", "");
  const [ myIdentityPubKey, setMyIdentityPubKey ] = useStore("MY_IDENTITY_PUB_KEY", "");
  const [ myDHPrivKey, setMyDHPrivKey ] = useStore("MY_DH_PRIV_KEY", "");
  const [ myDHPubKey, setMyDHPubKey ] = useStore("MY_DH_PUB_KEY", "");
  const [ masterSecret, setMasterSecret ] = useStore("MASTER_SECRET", "");

  // their keys
  const [ theirIdentityKey, setTheirIdentityKey ] = useStore("THEIR_IDENTITY_KEY", "");
  const [ theirSignedPreKey, setTheirSignedPreKey ] = useStore("THEIR_SIGNED_PRE_KEY", "");
  const [ theirPreKeySig, setTheirPreKeySig ] = useStore("THEIR_PRE_KEY_SIG", "");
  // const [ theirOneTimePreKey, setTheirOneTimePreKey ] = useState("");

  const [ AD, setAD ] = useState("");

  const { generateKeyPair, deriveSecret, KdfRK, KdfCK } = useCrypto();

  useEffect(() => {
    if (masterSecret) {
      setMasterSecret(initialMasterSecret);
      return;
    }

    async () => {

      const [ theirIdentityKey, theirSignedPreKey, theirSignedPreKeySig ] = await getX3dhBundle(uri);

      if (!ed25519Verify(theirIdentityKey, theirSignedPreKey, theirSignedPreKeySig)) {
        throw new Error("Pre-Key signature did not match Signed-Pre-Key");
      }

      // Initialize X3DH master_secret
      await initialize(theirSignedPreKey, theirIdentityKey);
    };
  }, [])

  const getX3dhBundle = async (uri) => {
    try {
    const res = await axios(uri, {method: "get"});

    const { identityKey, signedPreKey } = res.data;

    // return { identityKey, pre};
    return [ identityKey, signedPreKey.pubKey, signedPreKey.sig ];
    } catch(err) {
      console.log("error: ", err);
    }
  };


  const initialize = async (theirSignedPreKey, theirIdentityKey) => {
    const myIdentityKeyPair = await generateKeyPair();
    const myEphemeralKeyPair = await generateKeyPair();

    const dhOut1 = await DeriveSecret(myIdentityKeyPair, theirSignedPreKey);
    const dhOut2 = await DeriveSecret(myEphemeralKeyPair, theirIdentityKey);
    const dhOut3 = await DeriveSecret(myEphemeralKeyPair, theirSignedPreKey);
    // const dhOut4 = await deriveSecret(myEphemeralKeyPair, theirOneTimePreKey);

    await setMyIdentityPubKey(myIdentityKeyPair.publicKey);
    await setMyIdentityPrivKey(myIdentityKeyPair.privateKey);
    await setMyDHPubKey(myEphemeralKeyPair.publicKey);
    await setMyDHPrivKey(myEphemeralKeyPair.privateKey);
    await setAD(myIdentityKeyPair.publicKey + theirIdentityKey);
    await setMasterSecret(dhOut1 + dhOut2 + dhOut3);
  }

    return [ MasterSecret, MyIdentityKeyPair, MyDHKeyPair, AD ];
  }

  export default useX3dh;