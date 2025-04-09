"use client";

import { useLayoutEffect, useRef, useState } from 'react';

interface EmulatorJSProps {
  romUrl: string;
  gameId: string;
  romName: string;
  onReady?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    EJS_emulator?: {
      setVolume?: (volume: number) => void;
      reset?: () => void;
      start?: () => void;
      pause?: () => void;
      audioContext?: AudioContext;
    };
    EJS_player?: string;
    EJS_gameUrl?: string;
    EJS_core?: string;
    EJS_pathtodata?: string;
    EJS_gameID?: string;
    EJS_biosUrl?: string;
    EJS_color?: string;
    EJS_startOnLoaded?: boolean;
    EJS_DEBUG?: boolean;
    EJS_gameData?: Uint8Array;
    EJS_paths?: {
      [key: string]: string;
    };
    EJS_defaultOptions?: {
      shader?: string;
      'save-state-slot'?: number;
      'save-state-location'?: string;
      audio?: boolean;
    };
    EJS_onGameStart?: () => void;
    EJS_onLoadError?: (error: string) => void;
    EJS_gameName?: string;
  }
}

export default function EmulatorJS({ romUrl, gameId, romName, onReady, onError }: EmulatorJSProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);
  const mountedRef = useRef(false);
  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<any>(null);
  const cleanupInProgressRef = useRef(false);
  const scriptLoadedRef = useRef(false);

  const cleanup = async () => {
    if (cleanupInProgressRef.current) {
      return;
    }

    cleanupInProgressRef.current = true;
    console.debug('[EmulatorJS] Starting cleanup...');

    try {
      // Stop emulator and audio
      if (emulatorRef.current) {
        try {
          if (emulatorRef.current.pause) {
            await emulatorRef.current.pause();
          }
          if (emulatorRef.current.audioContext) {
            await emulatorRef.current.audioContext.close();
          }
        } catch (e) {
          console.warn('Error stopping emulator:', e);
        }
        emulatorRef.current = null;
      }

      // Clean up any lingering audio contexts
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        try {
          audio.pause();
          audio.srcObject = null;
          if (audio.parentNode) {
            audio.parentNode.removeChild(audio);
          }
        } catch (e) {
          console.warn('Error cleaning up audio element:', e);
        }
      });

      // Clean up container safely
      if (containerRef.current) {
        // First remove game container if it exists
        if (gameContainerRef.current && gameContainerRef.current.parentNode === containerRef.current) {
          containerRef.current.removeChild(gameContainerRef.current);
        }
        // Then clear any remaining content
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      // Clean up globals
      [
        'EJS_player',
        'EJS_gameUrl',
        'EJS_gameData',
        'EJS_core',
        'EJS_pathtodata',
        'EJS_gameID',
        'EJS_DEBUG',
        'EJS_startOnLoaded',
        'EJS_onGameStart',
        'EJS_onLoadError',
        'EJS_defaultOptions',
        'EJS_emulator'
      ].forEach(key => {
        try {
          // @ts-ignore
          if (window[key] !== undefined) {
            // @ts-ignore
            delete window[key];
          }
        } catch (e) {
          console.warn(`Error cleaning up ${key}:`, e);
        }
      });

      // Remove any lingering scripts safely
      const scripts = document.querySelectorAll('script[src*="emulatorjs"]');
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });

      gameContainerRef.current = null;
      initRef.current = false;
      scriptLoadedRef.current = false;

    } finally {
      cleanupInProgressRef.current = false;
    }
  };

  const loadEmulatorScript = async () => {
    if (scriptLoadedRef.current) return;

    let currentScript: HTMLScriptElement | null = null;
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await new Promise<void>((resolve, reject) => {
          currentScript = document.createElement('script');
          currentScript.src = 'https://cdn.emulatorjs.org/stable/data/loader.js';
          currentScript.crossOrigin = 'anonymous';
          currentScript.onload = () => {
            console.debug('[EmulatorJS] Loader script loaded');
            scriptLoadedRef.current = true;
            resolve();
          };
          currentScript.onerror = () => {
            reject(new Error('Failed to load loader script'));
          };
          document.body.appendChild(currentScript);
        });
        break;
      } catch (e) {
        retries++;
        if (retries === maxRetries) throw e;
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (currentScript && currentScript.parentNode) {
          currentScript.parentNode.removeChild(currentScript);
          currentScript = null;
        }
      }
    }
  };

  useLayoutEffect(() => {
    let isMounted = true;
    mountedRef.current = true;

    const initialize = async () => {
      if (!containerRef.current || cleanupInProgressRef.current || initRef.current || !isMounted) {
        return;
      }

      try {
        // Clean up first
        await cleanup();

        // Wait a bit to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted || !containerRef.current) return;

        // Create game div
        const gameDiv = document.createElement('div');
        gameDiv.id = 'game';
        gameDiv.style.width = '100%';
        gameDiv.style.height = '100%';
        gameDiv.style.position = 'relative';
        containerRef.current.appendChild(gameDiv);
        gameContainerRef.current = gameDiv;

        // Set up EmulatorJS configuration
        window.EJS_player = '#game';
        window.EJS_gameUrl = romUrl;
        window.EJS_gameName = romName;
        window.EJS_gameID = gameId;
        window.EJS_core = 'snes9x';
        window.EJS_DEBUG = true;
        window.EJS_startOnLoaded = true;
        window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';

        // Set default options
        window.EJS_defaultOptions = {
          'save-state-slot': 1,
          'save-state-location': 'browser',
          'audio': true,
          'shader': 'disabled'
        };

        // Set up callbacks
        window.EJS_onGameStart = () => {
          if (mountedRef.current && !cleanupInProgressRef.current) {
            console.debug('[EmulatorJS] Game started successfully:', romName);
            try {
              emulatorRef.current = window.EJS_emulator;
              setIsLoading(false);
              onReady?.();
            } catch (err) {
              console.warn('[EmulatorJS] Error in game start callback:', err);
            }
          }
        };

        window.EJS_onLoadError = (error: string) => {
          if (mountedRef.current && !cleanupInProgressRef.current) {
            console.error('[EmulatorJS] Load error:', error);
            onError?.(error);
          }
        };

        // Keep loading state true until game starts
        setIsLoading(true);

        // Fetch ROM data
        console.debug('[EmulatorJS] Fetching ROM from:', romUrl);
        const response = await fetch(romUrl);
        if (!response.ok) throw new Error('Failed to fetch ROM');
        
        if (!isMounted) return;

        const arrayBuffer = await response.arrayBuffer();
        window.EJS_gameData = new Uint8Array(arrayBuffer);
        console.debug('[EmulatorJS] ROM data loaded, size:', window.EJS_gameData.length);

        // Load emulator script
        await loadEmulatorScript();

        if (!isMounted) return;

        initRef.current = true;
        console.debug('[EmulatorJS] Initialization complete');

      } catch (error) {
        console.error('[EmulatorJS] Initialization error:', error);
        if (mountedRef.current) {
          setIsLoading(false);
          onError?.(error instanceof Error ? error.message : 'Failed to initialize emulator');
        }
        await cleanup();
      }
    };

    // Initialize
    initialize();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      mountedRef.current = false;
      cleanup();
    };
  }, [romUrl, gameId, romName, onReady, onError]);

  // Handle fullscreen changes
  useLayoutEffect(() => {
    const handleFullscreenChange = () => {
      if (!mountedRef.current) return;
      
      if (document.fullscreenElement === containerRef.current) {
        // Fullscreen entered
        if (gameContainerRef.current) {
          gameContainerRef.current.style.height = '100vh';
        }
      } else {
        // Fullscreen exited
        if (gameContainerRef.current) {
          gameContainerRef.current.style.height = '100%';
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-black"
      style={{ 
        minHeight: '480px',
        aspectRatio: '4/3',
      }}
    />
  );
}
