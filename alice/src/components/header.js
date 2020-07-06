import React from 'react';
import AliceSVG from '../assets/alice_avatar.svg';


const Header = ({socketStatus}) => {
  return(
    <div className="flex justify-between items-center mx-auto min-h-20 max-h-30 h-20 shadow-lg bg-indigo-500">
        <span className="flex items-center content-center pl-10">
          <img src={AliceSVG} className="rounded-full w-12 h-12 shadow-lg border-2" alt="Alice avatar"/>
          <label className="inline text-white font-bold pl-5">Alice</label>
        </span>
        <div className="pr-5">
          <label className="pr-5 text-white font-bold">Websocket Status: </label>
          <label>{socketStatus}</label>
        </div>
    </div>
  );
};

export default Header;