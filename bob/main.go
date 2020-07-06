package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/c-bata/go-prompt"
	"github.com/gorilla/websocket"
	dbl "github.com/status-im/doubleratchet"
)

var messageStore = []Message{}
var isEncrypted bool

// double-ratchet protocol variables
var (
	err              error
	bob              dbl.Session
	sharedSecret     = dbl.Key([]byte("9d0a39125ffd0ff12c7307e727b5191d1d9b65bd312b73e07915ba92b924d82b357559d2e175285c3bfac101faa8523342946b720434abedc0aa0d1b41e56809b7843e2f1c98391fad3a2d8a00f0b0a3799468fedda1e5fc53dcb2a6a40b0d37"))
	securedSocket    = &websocket.Conn{}
	socket           = &websocket.Conn{}
	broadcastIn      = make(chan SecuredMessage)
	broadcastOut     = make(chan Message)
	broadcastToQueue = make(chan Message)
	upgrader         = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		// ReadBufferSize:  1024,
		// WriteBufferSize: 1024,
	}
)

// x3DH variables
var (
	keyBundle X3DHBundle
	appBundle AppBundle
)

func main() {
	// Generates the X3DH key bundle
	keyBundle, appBundle = GenerateKeys()

	// Uncomment these two input prompts for production. They will not work while in debug mode.
	iOne := prompt.Input("Join a chat with Alice? Y/N ", func(d prompt.Document) []prompt.Suggest {
		s := []prompt.Suggest{
			{Text: "Yes", Description: "Let's begin the chat!"},
			{Text: "No", Description: "No thanks."},
		}
		return prompt.FilterHasPrefix(s, d.GetWordBeforeCursor(), true)
	})
	if iOne == "No" {
		os.Exit(0)
	}

	iTwo := prompt.Input("Will it be encrypted? Y/N ", func(d prompt.Document) []prompt.Suggest {
		s := []prompt.Suggest{
			{Text: "Yes", Description: "Use X3DH and Double Ratchet Protocol to protect my conversation!"},
			{Text: "No", Description: "I want my messages to be vulnerable."},
		}
		return prompt.FilterHasPrefix(s, d.GetWordBeforeCursor(), true)
	})
	if iTwo == "No" {
		isEncrypted = false
		fmt.Println("You are now in an unencrypted chat with Alice!")
		fmt.Print("\n\n")
	} else {
		isEncrypted = true
		fmt.Println("----------------------------------------------------")
		fmt.Println("--- You are now in an encrypted chat with Alice! ---")
		fmt.Print("----------------------------------------------------\n\n")
	}

	bob, err = dbl.New([]byte("Bob-session"), sharedSecret, appBundle.EphemeralKeyPair, nil)
	if err != nil {
		log.Fatal(err)
	}

	// normally this would be an X3DH exchange
	http.HandleFunc("/keys", func(w http.ResponseWriter, req *http.Request) {
		// Once X3DH is finished, this should be swapped out for the key bundle
		pub := struct {
			pubKey string
		}{
			pubKey: appBundle.EphemeralKeyPair.PublicKey().String(),
		}

		kb, err := json.Marshal(pub)
		if err != nil {
			log.Printf("error: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusOK)
		w.Write(kb)

	})
	http.HandleFunc("/securedMsg", func(w http.ResponseWriter, req *http.Request) {
		securedSocket, err = upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Printf("error: %v", err)
		}
		defer securedSocket.Close()

		for {

			var msg IncomingMessage

			err := securedSocket.ReadJSON(&msg)
			if err != nil {
				log.Printf("error: %v", err)
			}

			if msg.IdentityKey == "" && msg.Ciphertext == "" {
				return
			}

			adBytes, err := hex.DecodeString(msg.AD)
			if err != nil {
				log.Printf("error: %v", err)
			}

			cipherBytes, err := hex.DecodeString(msg.Ciphertext)
			if err != nil {
				log.Printf("error: %v", err)
			}

			dhBytes, err := hex.DecodeString(msg.Header.DH)
			if err != nil {
				log.Printf("error: %v", err)
			}

			var sMsg = SecuredMessage{
				Timestamp: time.Now().UTC(),
				AD:        adBytes,
				Author:    msg.Author,
				Message: dbl.Message{
					Ciphertext: cipherBytes,
					Header: dbl.MessageHeader{
						DH: dbl.Key(dhBytes),
						N:  msg.Header.N,
						PN: msg.Header.PN,
					},
				},
			}

			broadcastIn <- sMsg // chan SecuredMessage <- msg
		}
	})

	// handler for unencrypted message chat
	http.HandleFunc("/msg", func(w http.ResponseWriter, req *http.Request) {
		socket, err = upgrader.Upgrade(w, req, nil)
		if err != nil {
			log.Printf("error: %v", err)
		}
		defer socket.Close()

		for {
			var msg Message

			err := socket.ReadJSON(&msg)
			if err != nil {
				log.Printf("error: %v", err)
			}

			broadcastToQueue <- msg // chan Message <- msg
		}
	})

	go EncryptionHandler()
	go DecryptionHandler()
	go MessageQueueHandler()
	// Uncomment for production
	// go InputHandler()

	log.Println("http server started on :8080")
	go log.Fatal(http.ListenAndServe(":8080", nil))
}
