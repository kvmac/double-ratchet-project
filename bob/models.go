package main

import (
	"time"

	dbl "github.com/status-im/doubleratchet"
)

// TODO: An ideal X3DH implementation would require a Key Distribution Center server
// But I'll just create a X3DH key bundle endpoint for now
type X3DHBundle struct {
	DeviceId       uint32              `json:"deviceId"`
	RegistrationId uint64              `json:"registrationId"`
	IdentityKey    string              `json:"identityKey"`
	SignedPreKey   SignedPreKeyBundle  `json:"signedPreKey"`
	OneTimePreKey  OneTimePreKeyBundle `json:"oneTimePreKey"`
}

type AppBundle struct {
	DeviceId         uint32
	RegistrationId   uint64  `json:"registrationId"`
	IdentityKey      dbl.Key `json:"identityKey"`
	SignedPreKey     interface{}
	OneTimePreKey    interface{}
	EphemeralKeyPair dbl.DHPair
}

type SignedPreKeyBundle struct {
	Id  uint64 `json:"id"`
	Key string `json:"key"`
	Sig string `json:"sig"`
}

type OneTimePreKeyBundle struct {
	Id  uint64 `json:"id"`
	Key string `json:"key"`
}

type Header struct {
	DH string `json:"dh"`
	N  uint32 `json:"n"`
	PN uint32 `json:"pn"`
}
type IncomingMessage struct {
	IdentityKey string `json:"identityKey"`
	Author      string `json:"author"`
	AD          string `json:"ad"`
	Header      Header `json:"header"`
	Ciphertext  string `json:"ciphertext"`
}

type SecuredMessage struct {
	Timestamp time.Time   `json:"timestamp"`
	AD        []byte      `json:"ad"`
	Author    string      `json:"author"`
	Message   dbl.Message `json:"message"`
}

type Message struct {
	Timestamp time.Time `json:"-"`
	Author    string    `json:"author"`
	Plaintext string    `json:"plaintext"`
}

type KeyPair struct {
	Public  dbl.Key `json:"public"`
	Private dbl.Key `json:"private"`
}
