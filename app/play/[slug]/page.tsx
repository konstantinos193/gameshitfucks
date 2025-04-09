"use client"

import { useState, useEffect, useRef } from "react"
import { use } from 'react'
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Gamepad,
  Save,
  Upload,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Keyboard,
  Info,
  X,
  Maximize,
  Minimize,
  Coins,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import gamesData from "@/data/games.json"
import EmulatorJS from "@/components/EmulatorJS"

// Configure IPFS gateway
const IPFS_GATEWAY = 'https://yappy-chocolate-squid.myfilebase.com/ipfs/';

// Collection CID for all ROMs
const COLLECTION_CID = 'QmWFxKVZc26TcHLjemPeonKXsZeT9c7Fjt8CCMb9qbTaJM';

// ROM CID mapping with exact CIDs
const ROM_CIDS: { [key: string]: string } = {
  'chrono-trigger': 'QmbX…HaB1',
  'final-fantasy-6': 'QmYC…tSJJ',
  'star-fox': 'Qmaq…mosA',
  'street-fighter-2-turbo': 'QmSb…RLtr',
  'super-mario-kart': 'QmaS…24Y4',
  'super-mario-rpg': 'QmVS…jMdL',
  'super-mario-world': 'QmXR…reBk',
  'yoshis-island': 'Qmdh…u1F9',
  'super-metroid': 'QmeJ…jeST',
  'zelda-a-link-to-the-past': 'QmcC…mwoF'
};

// Type for game data
type Game = {
  id: number;
  title: string;
  slug: string;
  year: number;
  hits: string;
  rating: number;
  genre: string;
  playTime: string;
  players: string;
  coverImage: string;
  bannerImage: string;
  romFileName: string;
  description: string[];
  features: string[];
  screenshots: string[];
  similarGames?: {
    id: number;
    title: string;
    slug: string;
    year: number;
    rating: number;
    image: string;
  }[];
};

// Helper function to get ROM URL
function getRomUrl(game: Game) {
  // Always use the collection CID with filename for consistent access
  return `${IPFS_GATEWAY}${COLLECTION_CID}/${encodeURIComponent(game.romFileName)}`;
}

// Helper function to shuffle array with a stable seed
function stableShuffleArray<T>(array: T[], seed: string): T[] {
  const newArray = [...array];
  const hash = seed.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
  }, 0);
  
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.abs((hash * (i + 1)) % (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Global variable to track if EmulatorJS is initialized
let emulatorJSInitialized = false

// Helper function to get game by slug with proper typing
function getGameBySlug(slug: string): Game | null {
  return (gamesData as { [key: string]: Game })[slug] || null;
}

export default function GamePlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  
  // Game state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(80)
  const [saveStates, setSaveStates] = useState<string[]>([])
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  // References
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const emulatorReadyRef = useRef(false)

  // Get game data based on slug
  const game = getGameBySlug(slug)

  useEffect(() => {
    setIsLoading(true);
    setIsReady(false);
    setError(null);
    emulatorReadyRef.current = false;
    setKey(prev => prev + 1);

    // Add timeout to detect stalled loading
    const timeoutId = setTimeout(() => {
      if (isLoading && !isReady && !error) {
        console.warn('Loading timeout - resetting emulator');
        setError('Loading timeout - please try again');
        setIsLoading(false);
        setKey(prev => prev + 1);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeoutId);
  }, [slug, isLoading, isReady, error]);

  const handleEmulatorReady = () => {
    if (emulatorReadyRef.current) return;
    emulatorReadyRef.current = true;
    
    console.debug('[DEBUG] Emulator ready event received');
    setIsReady(true);
    setIsLoading(false);
    setIsPlaying(true);
    setShowControls(true);
  };

  const handleEmulatorError = (error: string) => {
    console.error('[DEBUG] Emulator error:', error);
    setError(error);
    setIsLoading(false);
    setIsReady(false);
    setIsPlaying(false);
    emulatorReadyRef.current = false;
  };

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!gameContainerRef.current) return;

    try {
      if (!isFullscreen) {
        if (gameContainerRef.current.requestFullscreen) {
          await gameContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    if (!isReady || isLoading) {
      console.debug('[DEBUG] Cannot toggle play: Emulator not ready or loading')
      return
    }

      setIsPlaying(!isPlaying)
    
    // EmulatorJS API doesn't have a direct play/pause method
    // It's handled by the UI controls provided by the emulator
    console.debug('[DEBUG] Play state toggled (visual only)')
  }

  // Handle reset
  const resetGame = () => {
    if (window.confirm("Are you sure you want to reset the game? Any unsaved progress will be lost.")) {
      // Attempt to reset the emulator via EmulatorJS API
      try {
        // @ts-ignore - EmulatorJS global API
        if (window.EJS_emulator && window.EJS_emulator.reset) {
          // @ts-ignore
          window.EJS_emulator.reset()
          console.debug('[DEBUG] EmulatorJS reset triggered')
        }
      } catch (err) {
        console.error('[DEBUG] Failed to reset EmulatorJS:', err)
      }
    }
  }

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    try {
      // @ts-ignore - EmulatorJS global API
      if (window.EJS_emulator && window.EJS_emulator.setVolume) {
        // EmulatorJS volume is 0-1
        // @ts-ignore
        window.EJS_emulator.setVolume(newVolume / 100)
        console.debug(`[DEBUG] EmulatorJS volume set to ${newVolume / 100}`)
      }
    } catch (err) {
      console.error('[DEBUG] Failed to adjust EmulatorJS volume:', err)
    }
  }

  // Handle mute toggle
  const toggleMute = () => {
    const newMuteState = !isMuted
    setIsMuted(newMuteState)
    
    try {
      // @ts-ignore - EmulatorJS global API
      if (window.EJS_emulator) {
        // @ts-ignore
        if (newMuteState && window.EJS_emulator.setVolume) {
          // @ts-ignore
          window.EJS_emulator.setVolume(0)
        } else if (!newMuteState && window.EJS_emulator.setVolume) {
          // @ts-ignore
          window.EJS_emulator.setVolume(volume / 100)
        }
      }
    } catch (err) {
      console.error('[DEBUG] Failed to toggle EmulatorJS mute:', err)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
          <p className="mb-6">The game you're looking for doesn't exist or has been removed.</p>
          <Link href="/games">
            <Button>Back to Games</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get ROM URL using the helper function
  const romUrl = getRomUrl(game);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Game title and info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <p className="text-gray-400">
              {game.year} • {game.genre}
            </p>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Coins className="h-4 w-4 mr-2" /> Buy Our Token
              </Button>
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4 mr-2" /> Game Info
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>{game?.title}</DialogTitle>
                  <DialogDescription className="text-gray-400">Released in {game?.year}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-[120px] h-[160px] relative bg-gray-700/50 rounded-lg">
                      <Image
                        src={game?.coverImage || "/placeholder.svg"}
                        alt={game?.title || "Game cover"}
                        fill
                        priority
                        className="object-contain p-2"
                        sizes="120px"
                      />
                    </div>
                    <div className="flex-grow space-y-2">
                      <p>
                        <span className="font-semibold">Genre:</span> {game?.genre}
                      </p>
                      <p>
                        <span className="font-semibold">Rating:</span> {game?.rating}%
                      </p>
                      <p>
                        <span className="font-semibold">Players:</span> {game?.players}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-gray-300">{game?.description?.[0]}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Link href={`/games/${slug}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </div>

        {/* Game container */}
        <div
          ref={gameContainerRef}
          className={`relative bg-black rounded-lg overflow-hidden mx-auto ${
            isFullscreen ? "fixed inset-0 z-50" : "max-w-[800px]"
          }`}
          style={!isFullscreen ? { aspectRatio: "4/3" } : {}}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          onTouchStart={(e) => {
            setShowControls(true);
            // Add passive flag to touch events
            if (e.currentTarget.addEventListener) {
              e.currentTarget.addEventListener('touchstart', () => {}, { passive: true });
            }
          }}
          onTouchEnd={() => {
            if (isPlaying) {
              setTimeout(() => setShowControls(false), 3000);
            }
          }}
        >
          <EmulatorJS
            key={key}
            romUrl={romUrl}
            core="snes9x"
          />

          {/* Error overlay */}
          {error && !isLoading && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20">
              <div className="text-red-500 mb-4">
                <div className="w-16 h-16 mx-auto mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-xl font-bold mb-2">Failed to load game</p>
                <p className="text-sm">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  setKey(prev => prev + 1);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Game controls */}
          {showControls && isReady && !error && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={togglePlay}>
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={resetGame}>
                          <RotateCcw className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset Game</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="flex items-center gap-2 ml-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={toggleMute}>
                            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="w-24 hidden sm:block">
                      <Slider
                        value={[volume]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) => handleVolumeChange(value[0])}
                        disabled={isMuted}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Keyboard className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-gray-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Keyboard Controls</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          EmulatorJS uses these keyboard shortcuts.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-4">
                          <h4 className="font-semibold">D-Pad</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-400">Up</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Arrow Up</div>
                            <div className="text-gray-400">Down</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Arrow Down</div>
                            <div className="text-gray-400">Left</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Arrow Left</div>
                            <div className="text-gray-400">Right</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Arrow Right</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold">Buttons</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-400">A Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">X</div>
                            <div className="text-gray-400">B Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Z</div>
                            <div className="text-gray-400">X Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">S</div>
                            <div className="text-gray-400">Y Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">A</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold">Shoulder Buttons</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-400">L Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Q</div>
                            <div className="text-gray-400">R Button</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">W</div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-semibold">Special</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-400">Start</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Enter</div>
                            <div className="text-gray-400">Select</div>
                            <div className="font-mono bg-gray-700 px-2 py-1 rounded text-center">Shift</div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Game Features */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4 text-white border border-gray-700">
          <h3 className="font-bold text-lg mb-2">Free Features</h3>
          <p className="text-gray-300">
            Enjoy unlimited access to save states, cheats, and all emulation features at no cost.
          </p>
        </div>

        {/* Game instructions */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold mb-4">How to Play</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Keyboard className="h-4 w-4 mr-2" /> Keyboard Controls
              </h3>
              <p className="text-gray-400 mb-4">Use your keyboard to control the game:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Movement</div>
                <div>Arrow Keys</div>
                <div className="text-gray-400">A/B Buttons</div>
                <div>X/Z Keys</div>
                <div className="text-gray-400">X/Y Buttons</div>
                <div>S/A Keys</div>
                <div className="text-gray-400">L/R Buttons</div>
                <div>Q/W Keys</div>
                <div className="text-gray-400">Start/Select</div>
                <div>Enter/Shift Keys</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2 flex items-center">
                <Save className="h-4 w-4 mr-2" /> Save States
              </h3>
              <p className="text-gray-400">
                EmulatorJS provides a built-in save state system. Click the menu button in the emulator to access save and load options.
              </p>
            </div>
          </div>
        </div>

        {/* More games */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">More Games You Might Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stableShuffleArray(
              Object.values(gamesData)
                .filter(g => g.slug !== slug)
                .map(game => ({
                  id: game.id,
                  title: game.title,
                  slug: game.slug,
                  year: game.year,
                  rating: game.rating,
                  image: game.coverImage
                }))
              , slug)
              .slice(0, 6)
              .map((game) => (
                <Link href={`/play/${game.slug}`} key={game.id}>
                  <div className="bg-gray-800 border border-gray-700 hover:border-orange-500 transition-all rounded-lg overflow-hidden">
                    <div className="relative" style={{ aspectRatio: '4/3' }}>
                      <Image
                        src={game.image}
                        alt={game.title}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      />
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium text-sm truncate">{game.title}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-400 text-xs">{game.year}</span>
                        <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {game.rating}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Add TypeScript declarations for EmulatorJS
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
    EJS_defaultOptions?: {
      shader?: string;
      'save-state-slot'?: number;
      'save-state-location'?: string;
      audio?: boolean;
      volume?: number;
    };
    EJS_onGameStart?: () => void;
    EJS_onLoadError?: (error: string) => void;
  }
}

