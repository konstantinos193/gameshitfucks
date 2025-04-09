"use client";

import { useEffect, useRef } from 'react';

interface SNESEmulatorProps {
  romUrl: string;
  width?: number;
  height?: number;
}

export default function SNESEmulator({ romUrl, width = 640, height = 480 }: SNESEmulatorProps) {
  const emulatorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!emulatorRef.current) return;
    
    // Load EmulatorJS scripts
    const script1 = document.createElement('script');
    script1.src = '/emulatorjs/data/loader.js';
    document.body.appendChild(script1);
    
    const script2 = document.createElement('script');
    script2.innerHTML = `
      EJS_player = '#game';
      EJS_gameUrl = '${romUrl}';
      EJS_core = 'snes';
      EJS_mouse = false;
      EJS_multitap = false;
      EJS_pathtodata = '/emulatorjs/data/';
      EJS_gameID = 'snes-game';
    `;
    document.body.appendChild(script2);
    
    // Cleanup
    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
      // Remove any other elements created by EmulatorJS
      const ejsElements = document.querySelectorAll('[id^="ejs-"]');
      ejsElements.forEach(element => element.remove());
    };
  }, [romUrl]);
  
  return (
    <div style={{ width, height }}>
      <div id="game" ref={emulatorRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
} 