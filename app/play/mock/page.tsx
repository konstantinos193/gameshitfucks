"use client"

import { useState } from "react"
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

export default function MockPlayPage() {
  // UI state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [volume, setVolume] = useState(80)
  const [saveStates, setSaveStates] = useState<string[]>(["2023-04-08 14:32:45", "2023-04-08 15:10:22"])
  const [showControls, setShowControls] = useState(true)

  // Mock game data
  const game = {
    title: "Super Mario World",
    slug: "super-mario-world",
    year: 1990,
    genre: "Platformer",
    rating: 95,
    players: "1-2 players",
    description: [
      "Super Mario World is a 1990 platform game developed and published by Nintendo for the Super Nintendo Entertainment System (SNES). The story follows Mario's quest to save Princess Toadstool and Dinosaur Land from the series antagonist Bowser and his minions, the Koopalings.",
    ],
    coverImage: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ovr71lYlRogO7AJ5eaMo6Invxpyvdu.png",
  }

  // Toggle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Save state
  const saveState = () => {
    const timestamp = new Date().toLocaleString()
    setSaveStates([...saveStates, timestamp])
  }

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
                  <DialogTitle>{game.title}</DialogTitle>
                  <DialogDescription className="text-gray-400">Released in {game.year}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-[100px_1fr] gap-4">
                    <div className="rounded-md overflow-hidden">
                      <Image
                        src={game.coverImage || "/placeholder.svg"}
                        alt={game.title}
                        width={100}
                        height={140}
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <p>
                        <span className="font-semibold">Genre:</span> {game.genre}
                      </p>
                      <p>
                        <span className="font-semibold">Rating:</span> {game.rating}%
                      </p>
                      <p>
                        <span className="font-semibold">Players:</span> {game.players}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-gray-300">{game.description[0]}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Link href={`/games/super-mario-world`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </div>

        {/* Game container */}
        <div
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ aspectRatio: "4/3" }}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Placeholder game screen */}
          <div className="w-full h-full flex items-center justify-center">
            {isPlaying ? (
              <div className="relative w-full h-full">
                {/* Placeholder game content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/placeholder.svg?height=480&width=640"
                    alt="Game Screen"
                    width={640}
                    height={480}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-2xl font-bold bg-black/50 p-4 rounded">GAME SCREEN PLACEHOLDER</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                <div className="bg-gray-800 p-4 rounded-lg mb-6 relative" style={{ width: "200px", height: "200px" }}>
                  <Image
                    src={game.coverImage || "/placeholder.svg"}
                    alt={game.title}
                    fill
                    className="object-contain rounded"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">{game.title}</h2>
                <p className="text-gray-400 mb-6">
                  {game.year} • {game.genre}
                </p>
                <Button size="lg" onClick={togglePlay} className="bg-orange-500 hover:bg-orange-600">
                  <Play className="h-5 w-5 mr-2" /> Play Game
                </Button>
              </div>
            )}
          </div>

          {/* Game controls */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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
                        <Button variant="ghost" size="icon">
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
                        onValueChange={(value) => setVolume(value[0])}
                        disabled={isMuted}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Save className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="bg-gray-800 text-white">
                      <SheetHeader>
                        <SheetTitle>Save States</SheetTitle>
                        <SheetDescription className="text-gray-400">
                          Save your progress or load a previous save.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-4">
                        <Button onClick={saveState} className="w-full bg-orange-500 hover:bg-orange-600">
                          <Save className="h-4 w-4 mr-2" /> Create New Save
                        </Button>

                        {saveStates.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-400">Your Saves</h4>
                            {saveStates.map((state, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                                <div>
                                  <p className="font-medium">Save {index + 1}</p>
                                  <p className="text-xs text-gray-400">{state}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newSaveStates = [...saveStates]
                                      newSaveStates.splice(index, 1)
                                      setSaveStates(newSaveStates)
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <p>No save states yet</p>
                            <p className="text-sm">Create a save to continue your progress later</p>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>

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
                          Use these keyboard shortcuts to play the game.
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
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
                      <DialogHeader>
                        <DialogTitle>Emulator Settings</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Customize your gameplay experience.
                        </DialogDescription>
                      </DialogHeader>
                      <Tabs defaultValue="video" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-700">
                          <TabsTrigger value="video">Video</TabsTrigger>
                          <TabsTrigger value="audio">Audio</TabsTrigger>
                          <TabsTrigger value="input">Input</TabsTrigger>
                        </TabsList>
                        <TabsContent value="video" className="space-y-4 py-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pixel-perfect">Pixel Perfect Mode</Label>
                            <Switch id="pixel-perfect" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="crt-filter">CRT Filter</Label>
                            <Switch id="crt-filter" />
                          </div>
                        </TabsContent>
                        <TabsContent value="audio" className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="volume-slider">Volume</Label>
                            <Slider
                              id="volume-slider"
                              value={[volume]}
                              min={0}
                              max={100}
                              step={1}
                              onValueChange={(value) => setVolume(value[0])}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="mute-audio">Mute Audio</Label>
                            <Switch id="mute-audio" checked={isMuted} onCheckedChange={setIsMuted} />
                          </div>
                        </TabsContent>
                        <TabsContent value="input" className="space-y-4 py-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="gamepad-support">Gamepad Support</Label>
                            <Switch id="gamepad-support" defaultChecked />
                          </div>
                          <Button variant="outline" className="w-full">
                            <Gamepad className="h-4 w-4 mr-2" /> Configure Gamepad
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
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
                <Gamepad className="h-4 w-4 mr-2" /> Gamepad Support
              </h3>
              <p className="text-gray-400 mb-2">Connect a gamepad for the best experience.</p>
              <p className="text-gray-400 mb-2">Standard gamepads are automatically mapped to SNES controls.</p>
              <div className="mt-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Save className="h-4 w-4 mr-2" /> Save States
                </h3>
                <p className="text-gray-400">
                  Use the save state feature to save your progress at any point and continue later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Similar games */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">More Games You Might Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gray-800 border border-gray-700 hover:border-orange-500 transition-all rounded-lg overflow-hidden"
              >
                <div className="aspect-square relative">
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">Game {i}</span>
                  </div>
                </div>
                <div className="p-2">
                  <h3 className="font-medium text-sm truncate">Similar Game {i}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-400 text-xs">1992</span>
                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{80 + i}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
