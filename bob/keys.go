package main

import (
	// "fmt"
	"crypto/ed25519"
	"crypto/rand"
	// "encoding/binary"
	"encoding/hex"
	dbl "github.com/status-im/doubleratchet"
	"golang.org/x/crypto/curve25519"
	"math/big"
)

func GenerateKeys() (X3DHBundle, AppBundle) {
	deviceId := generateDeviceId()
	// oneTimePreKeyQueue = generateOneTimePreKeys(10)
	registrationId := generateKeyId()

	identityKeyPair, err := dbl.DefaultCrypto{}.GenerateDH()
	if err != nil {
		panic(err)
	}

	signedPreKeyPair, err := dbl.DefaultCrypto{}.GenerateDH()
	if err != nil {
		panic(err)
	}

	signedPreKeySig := ed25519.Sign(ed25519.PrivateKey(identityKeyPair.PrivateKey().String()), []byte(signedPreKeyPair.PublicKey()))

	oneTimePreKeyPair, err := dbl.DefaultCrypto{}.GenerateDH()
	if err != nil {
		panic(err)
	}

	ephemeralKeyPair, err := dbl.DefaultCrypto{}.GenerateDH()
	if err != nil {
		panic(err)
	}

	spkId := generateKeyId()
	otpkId := generateKeyId()

	keyBundle := X3DHBundle{
		DeviceId:       deviceId,
		RegistrationId: registrationId,
		IdentityKey:    identityKeyPair.PublicKey().String(),
		SignedPreKey: SignedPreKeyBundle{
			Id:  spkId,
			Key: signedPreKeyPair.PublicKey().String(),
			Sig: hex.EncodeToString([]byte(signedPreKeySig)),
		},
		// Uncomment if we decide to implement One-Time Pre-keys
		// oneTimePreKeyQueue: generateOneTimePreKeys(10)
		// OneTimePreKey: oneTimePreKeyQueue[0].PublicKey,
		// OneTimePreKey: oneTimePreKeyQueue[0].PublicKey,
		OneTimePreKey: OneTimePreKeyBundle{
			Id:  otpkId,
			Key: oneTimePreKeyPair.PublicKey().String(),
		},
	}

	appBundle := AppBundle{
		DeviceId:    deviceId,
		IdentityKey: signedPreKeyPair.PrivateKey(),
		SignedPreKey: struct {
			Id  uint64
			Key dbl.Key
			Sig []byte
		}{
			Id:  spkId,
			Key: signedPreKeyPair.PrivateKey(),
			Sig: signedPreKeySig,
		},
		OneTimePreKey: struct {
			Id  uint64
			Key dbl.Key
		}{
			Id:  otpkId,
			Key: oneTimePreKeyPair.PrivateKey(),
		},
		EphemeralKeyPair: ephemeralKeyPair,
	}

	return keyBundle, appBundle
}

// Necessary to fully implement X3DH
func DeriveMasterSecret() []byte {
	return []byte{}
}

func deriveSharedSecret(dhPrivateKey string, dhPub dbl.Key) (dbl.Key, error) {
	var (
		dhOut   [32]byte
		privKey [32]byte
		pubKey  [32]byte
	)

	copy(privKey[:], dhPrivateKey[:32])
	copy(pubKey[:], dhPub[:32])

	curve25519.ScalarMult(&dhOut, &privKey, &pubKey)
	return dhOut[:], nil
}

func generateKeyId() uint64 {
	nBig, err := rand.Int(rand.Reader, big.NewInt(9223372036854775807))
	if err != nil {
		panic(err)
	}

	return nBig.Uint64()
}

func generateDeviceId() uint32 {
	// key := []byte{}
	// _, err := rand.Read(key[:])
	// if err != nil {
	// 	panic(err)
	// }

	// return binary.BigEndian.Uint32(key)

	return 0
}
