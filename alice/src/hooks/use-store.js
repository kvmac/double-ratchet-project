import {useState, useEffect} from 'react';
import { hexStringToBytes, bytesToHex } from '../utils';


export const useStore = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = sessionStorage.getItem(key);
      // Parse stored json or if none return initialValue

      if(item) {
        if(Buffer.isBuffer(initialValue)) {
          return hexStringToBytes(item);
        }

        return JSON.parse(item);
      }

      return initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  useEffect(() => {
    setValue(storedValue);
  }, []);

  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      let valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save to local storage
      if(value instanceof Uint8Array) {
        valueToStore = bytesToHex(value);

        sessionStorage.setItem(key, valueToStore);
      } else {
        sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }

      // Save state
      setStoredValue(valueToStore);
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [ storedValue, setValue ];
}

export const storeValue = (key, value) => {
  try {
    // Save to local storage
    value instanceof Uint8Array ?
      sessionStorage.setItem(key, bytesToHex(value)) :
      sessionStorage.setItem(key, JSON.stringify(value));

  } catch (error) {
    // A more advanced implementation would handle the error case
    console.log(error);
  }
};