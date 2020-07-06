import { useStore } from './use-store';

const useChain = (masterSecret) => {
  const [ rootKey, setRootKey ] = useStore("ROOT_KEY", masterSecret);
  const [ skippedMessages, setSkippedMessages ] = useStore("SKIPPED_MESSAGES", {});

  const [ sendingKey, setSendingKey ] = useStore("SENDING_CHAIN_KEY", "");
  const [ receivingKey, setReceivingKey ] = useStore("RECEIVING_CHAIN_KEY", "");

  const [ sendingNumber, setSendingNumber ] = useStore("SENDING_CHAIN_NUMBER", 0);
  const [ receivingNumber, setReceivingNumber ] = useStore("RECEIVING_CHAIN_NUMBER", 0);
  const [ previousChainNumber, setPreviousChainNumber ] = useStore("PREVIOUS_CHAIN_NUMBER", 0);

  const updateSendingChain = ({
    sendingKey,
    sendingNumber,
    previousChainNumber
  }) => {
    if (sendingKey) setSendingKey(sendingKey);
    if (sendingNumber) setSendingNumber(sendingNumber);
    if (previousChainNumber) setPreviousChainNumber(previousChainNumber);
  };

  const updateReceivingChain = ({
    receivingKey,
    receivingNumber
  }) => {
    if (receivingKey) setReceivingKey(receivingKey);
    if (receivingNumber) setReceivingNumber(receivingNumber);
  };

  const updateChain = ({
    rootKey,
    skippedMessages,
    sendingKey,
    sendingNumber,
    previousChainNumber,
    receivingKey,
    receivingNumber
  }) => {
    if (rootKey) setRootKey(rootKey);
    if (skippedMessages) setSkippedMessages(skippedMessages);
    if (sendingKey) setSendingKey(sendingKey);
    if (sendingNumber) setSendingNumber(sendingNumber);
    if (previousChainNumber) setPreviousChainNumber(previousChainNumber);
    if (receivingKey) setReceivingKey(receivingKey);
    if (receivingNumber) setReceivingNumber(receivingNumber);
  };

  return {
    rootChain: {
      key: rootKey,
      SKIPPED: skippedMessages
    },
    sendingChain: {
      key: sendingKey,
      pn: previousChainNumber,
      n: sendingNumber
    },
    receivingChain: {
      key: receivingKey,
      n: receivingNumber
    }, updateChain, updateSendingChain, updateReceivingChain };
};

export default useChain;