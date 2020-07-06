import { ec, eddsa } from 'elliptic'
import { HmacSHA256, AES, enc, mode, algo, pad } from 'crypto-js';
import BN from 'bn.js';
import randomBytes from 'randombytes';
import { hexStringToBytes, bytesToHex } from '../utils';

const useCrypto = () => {
  const ec25519 = new ec('curve25519');
  // const ed25519 = new eddsa('ed25519');

  // generates a Curve25519 keypair
  const GenerateKeyPair = async () => {
    let privateKey;
    do {
      privateKey = new BN(randomBytes(Math.ceil(ec25519.n.bitLength() / 8)))
    } while (privateKey.isZero() || privateKey.cmp(ec25519.n) >= 0)
    const publicKey = ec25519.g.mul(privateKey);

    return { publicKey: hexStringToBytes(publicKey.toString('hex', 32)), privateKey: hexStringToBytes(privateKey.toString('hex', 32)) };
  };

  // returns DH shared secret
  const DeriveSecret = async (myDHPrivKey, theirDHPubKey) => {
    const priv = ec25519.keyFromPrivate(myDHPrivKey);
    const kp = ec25519.keyPair(priv, priv.getPublic());
    const theirKey = ec25519.keyFromPublic(theirDHPubKey, 'hex');

    const bn = kp.derive(theirKey.getPublic());

    return new Uint8Array(bn.toArrayLike(new Uint8Array, 'be', 32));
  };

  const KdfRK = async (dhOut, rk) => {
    const keyHash = await hkdf(dhOut, 96, { salt: rk, info: "rsZUpEuXUqqwXBvSy3EcievAh4cMj6QL" });

    const rootKey = new Uint8Array(keyHash.slice(0, 32));
    const chainKey = new Uint8Array(keyHash.slice(32, 64));
    const headerKey = new Uint8Array(keyHash.slice(64, 96));

    return [ rootKey, chainKey, headerKey ];
  };

  const KdfCK = async (chKey) => {
    const chainKey = await HmacSHA256(Buffer.from(new Uint8Array([15])).toString('hex'), chKey).toString(enc.Hex);
    const msgKey = await HmacSHA256(Buffer.from(new Uint8Array([16])).toString('hex'), chKey).toString(enc.Hex);

    return [ msgKey, chainKey ];
  };

  const Encrypt = async (plaintext, mKey, AD) => {
    const [ encKey, authKey, iv ] = deriveEncKeys(mKey);

    const encrypted = await AES.encrypt(plaintext, encKey.toString('hex'), {
      mode: mode.CTR,
      iv,
      padding: pad.NoPadding,
    });
    const ciphertext = hexStringToBytes(encrypted.ciphertext.toString(enc.Hex));

    const sig = computeSignature(authKey, encrypted.ciphertext.toString(enc.Hex), AD);

    const sigBytes = hexStringToBytes(sig.toString('hex'));

    const c = new Uint8Array(ciphertext.length + sigBytes.length);
    c.set(ciphertext);
    c.set(sigBytes, ciphertext.length);

    return c;
  };


  const Decrypt = async (cipherAndSig, mKey, AD) => {
    const cipherAndSigBytes = hexStringToBytes(cipherAndSig);
    const [ encKey, authKey, _ ] = deriveEncKeys(mKey);

    const ciphertext = cipherAndSigBytes.slice(0, 32);
    const sig = cipherAndSigBytes.slice(32, 64);

    const computedSig = computeSignature(authKey, ciphertext, AD);

    if (sig === computedSig) {
      throw new Error(`Signatures do not match: message sig = ${sig} -- computed sig = ${computedSig}`);
    }

    const plaintext = await AES.decrypt(ciphertext, encKey, {
      mode: mode.CTR,
      padding: pad.NoPadding,
    }).toString(enc.Hex);

    return plaintext;
  };

  const deriveEncKeys = (messageKey) => {
    const keyHash = Hkdf(messageKey, 80, {salt: new ArrayBuffer(32), info: hexStringToBytes("pcwSByyx2CRdryCffXJwy7xgVZWtW5Sh")});

    const encKeyBuffer = keyHash.slice(0, 32);
    const authKeyBuffer = keyHash.slice(32, 64);
    const ivBuffer = keyHash.slice(64, 80);

    return [ encKeyBuffer, authKeyBuffer, ivBuffer ];
  };

  const computeSignature = (authKey, ciphertext, AD) => {
    const authKeyBytes = Buffer.isBuffer(authKey) ? authKey : Buffer.from(authKey);
    const ciphertextBytes = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext);
    const adBytes = Buffer.isBuffer(AD) ? AD : Buffer.from(AD);

    const hash = algo.HMAC.create(algo.SHA256, authKeyBytes.toString('hex'))
      .update(adBytes.toString('hex'))
      .update(ciphertextBytes.toString('hex'))
      .finalize();

      return hash.toString(enc.Hex);
  };

  const EncodeHeader = (header, AD) => {
    const u8 = new Uint8Array(40);
    const u32 = new Uint32Array(u8.buffer);

    u32[0] = header.n;
    u32[1] = header.pn;
    u8.set(hexStringToBytes(header.dh), 8);

    if(AD) {
      return (AD + hexStringToBytes(header.n.toString(16)) + hexStringToBytes(header.pn.toString(16)) + hexStringToBytes(header.dh));
    } else {
      return u8;
    }
  };


  // ikm = Initial Key Material
  // length = Hash Output Length
  const Hkdf = (ikm, length, { salt, info }) => {
    const sha256Length = 32;

    const PRK = _hkdf_extract(ikm, sha256Length, salt);

    return _hkdf_expand(sha256Length, PRK, length, info);
  };

  // First Part of HKDF extracts
  const _hkdf_extract = (ikm, hashLen, salt) => {
    const ikmBytes = Buffer.isBuffer(ikm) ? ikm : Buffer.from(ikm);
    const saltBytes = (salt && salt.length) ? Buffer.from(salt) : Buffer.alloc(hashLen, 0);

    const hmac = algo.HMAC.create(algo.SHA256, saltBytes.toString('hex'));
    hmac.update(ikmBytes.toString('hex'));
    return hmac.finalize();
    // return HmacSHA256(saltBytes).update(ikmBytes).finalize();
  };

  // Second Part of HKDF expands
  const _hkdf_expand = (hashLen, prk, length, info) => {
    const infoBytes = ArrayBuffer.from(info || "");
    const infoLen = infoBytes.length;

    const steps = Math.ceil(length / hashLen);

    if (steps > 0xFF) {
      throw new Error(`OKM length ${length} is too long for sha256 hash`);
    }

    const t = Buffer.alloc(hashLen * steps + infoLen + 1);

    for (let c = 1, start = 0, end = 0; c <= steps; ++c) {
      infoBytes.copy(t, end);
      t[end + infoLen] = c;

      const hash = algo.HMAC.create(algo.SHA256, prk)
        .update(t.slice(start, end + infoLen + 1).toString('hex'))
        .finalize();

        // put back to the same buffer
        const b = Buffer.from(hash.toString(enc.Hex));
        b.copy(t, end);

        start = end; // used for T(C-1) start
        end += hashLen; // used for T(C-1) end & overall end
    }

    return t.slice(0, length);
  };

  return {
    GenerateKeyPair,
    DeriveSecret,
    KdfRK,
    KdfCK,
    Encrypt,
    Decrypt,
    EncodeHeader,
  };
}

export default useCrypto;
