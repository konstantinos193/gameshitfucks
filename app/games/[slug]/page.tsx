"use client"

import { use } from 'react'
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Trophy, Star, Eye, Gamepad, Info, Clock, Users, Coins } from "lucide-react"
import gamesData from "@/data/games.json"
import { GameBanner, GameCover, GameScreenshots } from "@/components/GameImages"

export default function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const game = gamesData[resolvedParams.slug as keyof typeof gamesData]

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Banner */}
      <div className="relative h-[400px]">
        <GameBanner
          src={game.bannerImage}
          alt={game.title}
          fallback="/placeholder.svg?height=400&width=1200"
        />
        <div className="container mx-auto px-4 h-full flex items-end pb-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <GameCover
              src={game.coverImage}
              alt={game.title}
              fallback="/placeholder.svg?height=176&width=128"
            />
            <div>
              <h1 className="text-4xl font-bold mb-2">{game.title}</h1>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="bg-orange-500 px-3 py-1 rounded-full text-sm flex items-center">
                  <Star className="mr-1 h-4 w-4" /> {game.rating}%
                </span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                  <Calendar className="mr-1 h-4 w-4" /> {game.year}
                </span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                  <Eye className="mr-1 h-4 w-4" /> {game.hits} plays
                </span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                  <Gamepad className="mr-1 h-4 w-4" /> {game.genre}
                </span>
              </div>
              <div className="flex gap-3">
                <Link href={`/play/${resolvedParams.slug}`}>
                  <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
                    Play Now
                  </Button>
                </Link>
                <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  >
                    <Coins className="mr-2 h-4 w-4" /> Buy Token
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="about">
              <Info className="mr-2 h-4 w-4 hidden md:inline" /> About
            </TabsTrigger>
            <TabsTrigger value="screenshots">
              <Eye className="mr-2 h-4 w-4 hidden md:inline" /> Screenshots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-4">Game Description</h2>
                <div className="space-y-4 text-gray-300">
                  {game.description.map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4">Game Features</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {game.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                        <Trophy className="h-4 w-4" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">Game Details</h3>
                  <ul className="space-y-4">
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Calendar className="mr-2 h-4 w-4" /> Released
                      </span>
                      <span>{game.year}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Star className="mr-2 h-4 w-4" /> Rating
                      </span>
                      <span>{game.rating}%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Eye className="mr-2 h-4 w-4" /> Popularity
                      </span>
                      <span>{game.hits} plays</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Gamepad className="mr-2 h-4 w-4" /> Genre
                      </span>
                      <span>{game.genre}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Clock className="mr-2 h-4 w-4" /> Play Time
                      </span>
                      <span>{game.playTime}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400 flex items-center">
                        <Users className="mr-2 h-4 w-4" /> Players
                      </span>
                      <span>{game.players}</span>
                    </li>
                  </ul>
                </div>

                {/* Token promotion */}
                <div className="mt-6 bg-orange-500 rounded-lg p-4 text-white">
                  <h3 className="font-bold text-lg mb-2">Enhance Your Gaming Experience</h3>
                  <p className="text-white/90 mb-4">
                    Get exclusive access to cheats, save states, and more with OdinSNES Token
                  </p>
                  <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"} className="w-full">
                    <Button className="w-full bg-white text-orange-500 hover:bg-gray-100">
                      <Coins className="mr-2 h-4 w-4" /> Buy Our Token
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="screenshots" className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Game Screenshots</h2>
            <GameScreenshots
              screenshots={game.screenshots}
              title={game.title}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
