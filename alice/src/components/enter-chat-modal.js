import React, { useState } from 'react';
import ReactDOM from 'react-dom';

export const EnterChatModal = ({ isShowing, startChat }) => isShowing ? ReactDOM.createPortal(
  <React.Fragment className="overlay">
    <label>Chat with Bob?</label>
    <button onClick={startChat}>ENTER</button>
  </React.Fragment>
) : null;