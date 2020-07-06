package main

import (
	"fmt"
	"log"
	"time"
	// "github.com/c-bata/go-prompt"
)

func DecryptionHandler() error {
	for {
		m := <-broadcastIn // <- chan SecuredMessage

		plaintext, err := bob.RatchetDecrypt(m.Message, nil)
		if err != nil {
			log.Fatal(err)
		}

		msg := Message{
			Timestamp: m.Timestamp,
			Author:    m.Author,
			Plaintext: string(plaintext),
		}

		broadcastToQueue <- msg // chan Message <- msg
	}
}

func EncryptionHandler() error {
	for {
		m := <-broadcastOut // <- chan Message

		dblMsg, err := bob.RatchetEncrypt([]byte(m.Plaintext), nil)

		msg := SecuredMessage{
			Timestamp: m.Timestamp,
			Author:    "Bob",
			Message:   dblMsg,
		}

		err = securedSocket.WriteJSON(msg) // ws SecuredMessage <- msg
		if err != nil {
			fmt.Println("Error!:  ", err)
			securedSocket.Close()
		}
	}
}

// Uncomment for production to allow server side, user message inputs
// func InputHandler() {
// 	for {
// 		input := prompt.Input(">>> ", func(d prompt.Document) []prompt.Suggest {
// 			s := []prompt.Suggest{
// 				{Text: "Quit", Description: "End chat"},
// 			}
// 			return prompt.FilterHasPrefix(s, d.GetWordBeforeCursor(), true)
// 		})

// 		msg := Message{
// 			Timestamp: time.Now().UTC(),
// 			Author:    "Bob",
// 			Text:      input,
// 		}

// 		if isEncrypted {
// 			broadcastOut <- msg	// chan Message <- msg
// 		} else {
// 			err = socket.WriteJSON(msg)
// 			if err != nil {
// 				fmt.Println("Error!:  ", err)
// 				securedSocket.Close()
// 			}
// 		}

// 		broadcastToQueue <- msg	// chan Message <- msg
// 	}
// }

func MessageQueueHandler() {
	for {
		msg := <-broadcastToQueue

		if msg != (Message{}) {
			fmt.Println(msg, time.Now())
			messageStore = append(messageStore, msg)
			fmt.Println(messageStore, time.Now())
		}
	}
}
