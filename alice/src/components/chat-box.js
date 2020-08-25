import React, { useState } from 'react';

import { getFormattedTime } from '../utils';

import BobSVG from '../assets/bob_avatar.svg';
import LockSVG from '../assets/lock.svg';


const ChatBox = ({messages, sendMessage}) => {

  return(
    <div className="flex-column mx-auto items-center justify-center shadow-lg mt-16 mx-8 max-w-lg min-h-full">
      <div className="flex flex-row h-full bg-white rounded-md px-4 pb-4 mb-10">
        <div className="flex-row w-full h-auto px-3 mb-2">
          <div className="flex justify-start items-center pt-8">
            <span className="pl-2">
              <img src={BobSVG} className="rounded-full w-10 h-10 shadow-lg border-2" alt="Bob avatar"/>
            </span>
            <label className="inline text-gray-700 font-bold pl-2">Bob</label>
          </div>

          <ChatScreen messages={messages} />
          <ChatInput sendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
};

const ChatScreen = ({ messages }) => {

  return(
    <div className="flex-column h-64 w-full h-fullover md:w-full flow-x-auto shadow-inner overflow-y-auto relative mt-6 mb-10 px-2 pt-2">
      <div className="flex-row pt-1 pb-1">
        <div className="flex justify-center pt-1 pb-1">
          <span className="inline-block w-auto bg-red-300 text-s rounded-lg pt-1 pb-1 pl-4 pr-4">{getFormattedTime()}</span>
        </div>
      </div>

      {messages.map((msg, i) => {
        const flexRowDir = msg.author === "Alice" ? "flex-row-reverse" : "flex-row";
        const messageAlignment = msg.author === "Alice" ? "bg-indigo-200" : "bg-purple-200";
        const timestampAlignment = msg.author === "Alice" ? "text-right pr-2" : "text-left pl-2";

        return(
          <div key={i} className={`flex ${flexRowDir} pt-1 pb-1`}>
            <div className="flex flex-col pt-1 pb-1">
              <span className={`inline-block w-auto rounded-lg pt-1 pb-1 pl-4 pr-4 ${messageAlignment}`}>{msg.text}</span>
              <span className={`block flex-none w-auto pb-1 text-xs mb-.5 ${timestampAlignment}`}>{msg.timestamp}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChatInput = ({ sendMessage }) => {
  const [ message, setMessage ] = useState("");

  const handleMessage = () => {
    if (!message) {
      return;
    }

    sendMessage(message);
    setMessage("");
  };

  return(
    <div className="flex flex-wrap -mx-3">
      <label className="px-4 pt-3 pb-2 text-gray-800 text-lg">Send encrypted message to Bob</label>
      <div className="w-full md:w-full px-3 mb-2 mt-2">
        <textarea className="bg-gray-100 rounded border border-gray-400 leading-normal resize-none w-full h-20 py-2 px-3 font-medium placeholder-gray-700 focus:outline-none focus:bg-white"
          onChange={(e) => setMessage(e.target.value)}
          value={message}
          name="body"
          required
          ></textarea>
      </div>
      <div className="w-full md:w-full flex items-start md:w-full px-3">
        <div className="flex items-start w-1/2 text-gray-700 px-2 mr-auto"></div>
        <div className="-mr-1">
          <button type='submit' className="bg-white text-gray-700 font-medium py-1 px-4 border border-gray-400 rounded-lg tracking-wide mr-1 hover:bg-gray-100"
            disabled={!message}
            onClick={handleMessage}
            >Send Message</button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;