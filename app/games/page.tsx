"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, SortAsc, SortDesc, Coins } from "lucide-react"
import Link from "next/link"
import gamesData from "@/data/games.json"

// Convert the games object to an array and extract basic info
const gameLibrary = Object.values(gamesData).map(game => ({
  id: game.id,
  title: game.title,
  slug: game.slug,
  year: game.year,
  hits: game.hits,
  rating: game.rating,
}))

export default function GamesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name-asc")
  const [currentPage, setCurrentPage] = useState(1)
  const gamesPerPage = 20

  // Filter games based on search term
  const filteredGames = useMemo(() => {
    return gameLibrary.filter((game) => game.title.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [searchTerm])

  // Sort games based on selected option
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.title.localeCompare(b.title)
        case "name-desc":
          return b.title.localeCompare(a.title)
        case "year-asc":
          return a.year - b.year
        case "year-desc":
          return b.year - a.year
        case "rating-desc":
          return b.rating - a.rating
        case "rating-asc":
          return a.rating - b.rating
        default:
          return 0
      }
    })
  }, [filteredGames, sortBy])

  // Pagination
  const indexOfLastGame = currentPage * gamesPerPage
  const indexOfFirstGame = indexOfLastGame - gamesPerPage
  const currentGames = sortedGames.slice(indexOfFirstGame, indexOfLastGame)
  const totalPages = Math.ceil(sortedGames.length / gamesPerPage)

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">OdinSNES Game Library</h1>

        {/* Token Promotion */}
        <div className="bg-orange-500 rounded-lg p-4 mb-8 text-white flex flex-col sm:flex-row justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">OdinSNES Token</h3>
            <p className="text-white/90">Join our community and support the OdinSNES platform</p>
          </div>
          <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
            <Button className="mt-3 sm:mt-0 bg-white text-orange-500 hover:bg-gray-100">
              <Coins className="mr-2 h-4 w-4" /> Buy Our Token
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search games..."
                className="pl-10 bg-gray-700 border-gray-600"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="year-asc">Year (Oldest)</SelectItem>
                <SelectItem value="year-desc">Year (Newest)</SelectItem>
                <SelectItem value="rating-desc">Rating (Highest)</SelectItem>
                <SelectItem value="rating-asc">Rating (Lowest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-400">
              Found {filteredGames.length} games matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Game Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-gray-800 border-gray-700">
                  <TableHead className="text-white">
                    <div className="flex items-center cursor-pointer">
                      Name <SortAsc className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-white">
                    <div className="flex items-center cursor-pointer">
                      Released <SortDesc className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-white">
                    <div className="flex items-center cursor-pointer">
                      Popularity <SortDesc className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-white">
                    <div className="flex items-center cursor-pointer">
                      Rating <SortDesc className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentGames.map((game) => (
                  <TableRow key={game.id} className="hover:bg-gray-700 border-gray-700">
                    <TableCell>
                      <Link href={`/games/${game.slug}`} className="hover:text-orange-500 font-medium">
                        {game.title}
                      </Link>
                    </TableCell>
                    <TableCell>{game.year}</TableCell>
                    <TableCell>{game.hits}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          game.rating >= 80 ? "bg-green-600" : game.rating >= 70 ? "bg-orange-500" : "bg-orange-600"
                        }`}
                      >
                        {game.rating}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-400">
            {sortedGames.length > 0
              ? `Showing ${indexOfFirstGame + 1}-${Math.min(indexOfLastGame, sortedGames.length)} of ${sortedGames.length} games`
              : "No games found"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Show pages around current page
              let pageNum = i + 1
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i
              }
              if (pageNum > totalPages) return null

              return (
                <Button
                  key={pageNum}
                  variant="outline"
                  size="sm"
                  className={currentPage === pageNum ? "bg-orange-500 hover:bg-orange-600 border-orange-500" : ""}
                  onClick={() => paginate(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
