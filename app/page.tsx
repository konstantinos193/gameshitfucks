import Link from "next/link"
import { ChevronRight, Gamepad2, ListOrdered, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import gamesData from "@/data/games.json"

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export default function Home() {
  // Convert games.json to array and shuffle
  const popularGames = shuffleArray(
    Object.values(gamesData).map(game => ({
      id: game.id,
      title: game.title,
      slug: game.slug,
      year: game.year,
      rating: game.rating,
      image: game.coverImage
    }))
  ).slice(0, 4) // Take first 4 games after shuffle

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/10 z-10"></div>
          <Image
            src="/images/snes-hero.jpg"
            alt="SNES Console with Controller on Orange Background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">OdinSNES</h1>
            <p className="text-xl mb-8">Explore the legendary 16-bit console that defined a generation of gaming</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/games">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
                  Play Games <Gamepad2 className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                >
                  <Coins className="mr-2 h-5 w-5" /> Buy Our Token
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Most Popular Games</h2>
          <Link href="/games" className="text-orange-500 hover:text-orange-400 flex items-center">
            View All Games <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {popularGames.map((game) => (
            <Link href={`/games/${game.slug}`} key={game.id}>
              <Card className="bg-gray-800 border-gray-700 hover:border-orange-500 transition-all overflow-hidden h-full">
                <div className="aspect-square relative overflow-hidden bg-gray-900">
                  <Image
                    src={game.image}
                    alt={game.title}
                    fill
                    className="object-contain transition-transform hover:scale-105"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-1">{game.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{game.year}</span>
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">{game.rating}%</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Console Info */}
      <section className="py-16 bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">About the Console</h2>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="aspect-square relative max-w-md mx-auto md:mx-0">
              <Image
                src="/images/snes-console.jpg"
                alt="SNES Console with Controller"
                fill
                className="object-contain rounded-lg"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-4">Technical Specifications</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold">Processor:</span> Ricoh 5A22 @ 3.58 MHz
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold">Resolution:</span> 256 x 224 or 256 x 240
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold">Colors:</span> 32,768
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold">Units Sold:</span> 49 million (As of 2010)
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-orange-500 p-1 rounded mr-3 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold">Best-selling Game:</span> Super Mario World (20 million)
                  </div>
                </li>
              </ul>

              <Link href="/about">
                <Button variant="outline" className="mt-6 border-orange-500 text-orange-500 hover:bg-orange-500/10">
                  Read Full History
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Game Library Preview */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Game Library</h2>
          <Link href="/games" className="text-orange-500 hover:text-orange-400 flex items-center">
            Browse All <ListOrdered className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Released</th>
                  <th className="text-left py-3 px-4">Popularity</th>
                  <th className="text-left py-3 px-4">Rating</th>
                </tr>
              </thead>
              <tbody>
                {shuffleArray(Object.values(gamesData)).slice(0, 5).map((game) => (
                  <tr key={game.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <Link href={`/games/${game.slug}`} className="hover:text-orange-500">
                        {game.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{game.year}</td>
                    <td className="py-3 px-4">{game.hits}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          game.rating >= 80 ? "bg-green-600" : game.rating >= 70 ? "bg-orange-500" : "bg-orange-600"
                        }`}
                      >
                        {game.rating}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-center">
            <Button className="bg-orange-500 hover:bg-orange-600">View Complete Game Library</Button>
          </div>
        </div>
      </section>

      {/* Token Section */}
      <section className="py-16 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">OdinSNES Token</h2>
            <p className="text-xl mb-8">
              Join our community and unlock exclusive benefits with the OdinSNES token. Get early access to new games,
              exclusive content, and more!
            </p>
            <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
              <Button size="lg" className="bg-gray-900 hover:bg-gray-800 text-white">
                <Coins className="mr-2 h-5 w-5" /> Buy Our Token
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
