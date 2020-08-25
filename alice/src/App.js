import React, { useRef, useCallback, useEffect, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import useDoubleRatchet from './hooks/use-double-ratchet';
import useX3dh from './hooks/use-x3dh';
import { getFormattedTime, hexStringToBytes, base64StringToBytes } from './utils';
// import { keyPair, ratchetEncrypt, ratchetDecrypt, setKeyBundle } from 'crypto';
import ChatBox from './components/chat-box';
import { EnterChatModal } from './components/enter-chat-modal';
import Header from './components/header';
import Footer from './components/footer';
import { useModal } from './hooks/use-modal';

import './App.css';
import './main.css'
const dummyMessages = [
    {text: "Hey, there!", author: "Bob", timestamp: "10:30:12pm"},
    {text: "Yo, waddup?", author: "Alice", timestamp: "10:30:56pm"},
    {text: "Nothing over here!", author: "Bob", timestamp: "10:31:44pm"},
    {text: "What about you?", author: "Bob", timestamp: "10:31:29pm"},
    {text: "Oh just hanging out over here with this encrypted chat..", author: "Alice", timestamp: "10:31:29pm"},
    {text: "Yeah, this shiz is dope!", author: "Bob", timestamp: "10:33:34pm"},
    {text: "Right?", author: "Alice", timestamp: "10:34:29pm"},
    {text: "Nobody can snoop on our convo here!", author: "Alice", timestamp: "10:37:32pm"},
    {text: "Gotta love that Double Ratchet Protocol, amirite??", author: "Alice", timestamp: "10:38:56pm"},
    {text: "Right you are!", author: "Bob", timestamp: "10:40:12pm"},
    {text: "Well I'm getting bored now.", author: "Alice", timestamp: "10:43:56pm"},
    {text: "Uh, well, only boring people get bored, so...", author: "Bob", timestamp: "10:45:32pm"},
    {text: ">:(", author: "Alice", timestamp: "10:46:56pm"},
];

export const App = () => {
  const [ socketUrl, setSocketUrl ] = useState('ws://localhost:8080/securedMsg');
  const { isShowing, toggle } = useModal(true);
  const [ isEncrypted, setIsEncrypted ] = useState(false);
  const [ messageHistory, setMessageHistory ] = useState([]);
  const [ theirPub, setTheirPub ] = useState('');

  // const [ MasterSecret, MyIdentityKeyPair, MyDHKeyPair, AD ] = useX3dh({ uri: "http://localhost:8080/keys" });


  // Initialize websocket
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => console.log('Opened connection to ws://localhost:8080'),
    shouldReconnect: (closeEvent) => true
    });


  useEffect(() => {
    if(!lastJsonMessage) {
      return;
    }

    (async () => {
      if(lastJsonMessage.public) {
        setTheirPub(base64StringToBytes(lastJsonMessage.public));
        return;
      }

      const msg = lastJsonMessage;
      const plaintext = await RatchetDecrypt(msg.data.message, null);

      const message = {
        timestamp: msg.data.timestamp,
        author: msg.data.author,
        text: plaintext
      };

      setMessageHistory((prev) => prev.concat(message));
    })();

  }, [lastJsonMessage]);

  const [ RatchetEncrypt, RatchetDecrypt ] = useDoubleRatchet(
    hexStringToBytes("697c0afabe85f6c67a3310e9304f2cd07d58374692faf14b9476a854ba08f15e"),
    theirPub,
    { maxSkip: 10 });

  const handleStartChat = () => {
    toggle();
    setSocketUrl('ws://localhost:8080/securedMsg');
  }

  const handleEncryptionToggle = () => {
    setSocketUrl(() => !isEncrypted ? "ws://localhost:8080/securedMsg" : "ws://localhost:8080/msg");
    setIsEncrypted(!isEncrypted);
  };

  const handleSendMessage = async (plaintext) => {
    console.log("message: ", plaintext);

    const m = {
      timestamp: getFormattedTime(),
      author: "Alice",
      text: plaintext,
    };
    setMessageHistory(prev => prev.concat(m));

    const { header, ciphertext, AD } = await RatchetEncrypt(plaintext, null);

    sendJsonMessage({
      // identityKey: myIdentityKeyPair.publicKey,
      author: "Alice",
      AD,
      identityKey: "",
      header,
      ciphertext
    });
  };

  const readyStateString = {
    0: 'CONNECTING', 1: 'OPEN', 2: 'CLOSING', 3: 'CLOSED',
  }[readyState];
  

  return (
    <div className="App h-full bg-indigo-700 static">
      <Header socketStatus={readyStateString} />

      <EnterChatModal isShowing={isShowing} startChat={handleStartChat} encryptChat={handleEncryptionToggle} />
      <ChatBox messages={messageHistory} sendMessage={handleSendMessage} />

      <Footer />
    </div>
  );
}

export default App;
