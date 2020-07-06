import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getUrl } from './get-url';
import websocketWrapper from './proxy';

const ReadyState = {
  UNINSTANTIATED = -1,
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// export const useWebSocket = (url | null) => {
export const useWebSocket = (url) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [readyState, setReadyState] = useState({});
  const lastJsonMessage = useMemo(() => {
    if (lastMessage) {
      try {
        return JSON.parse(lastMessage.data);
      } catch (e) {
        return UNPARSABLE_JSON_OBJECT;
      }
    }
    return null;
  },[lastMessage]);
  const webSocketRef = useRef(null);
  const startRef = useRef(null);
  const reconnectCount = useRef(0);
  const messageQueue = useRef([]);
  const expectClose = useRef(false);


  // sends message
  const sendMessage = useCallback(message => {
    if (webSocketRef.current && webSocketRef.current.readyState === ReadyState.OPEN) {
      webSocketRef.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  }, []);


  // converts object into json before sending
  const sendJsonMessage = useCallback(message => {
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);
  

  useEffect(() => {
    if (url !== null && connect === true) {
      let removeListeners;

      const start = async () => {
        expectClose.current = false;
        convertedUrl.current = await getUrl(url, optionsCache);

      };

      startRef.current = () => {
        expectClose.current = true;
        start();
      };
    
      start();
      return () => {
        expectClose.current = true;
      };
    }
  }, [url, connect, optionsCache, sendMessage]);

  useEffect(() => {
    if (readyStateFromUrl === ReadyState.OPEN) {
      messageQueue.current.splice(0).forEach(message => {
        sendMessage(message);
      });
    }
  }, [readyStateFromUrl]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState: readyStateFromUrl,
  };
};
