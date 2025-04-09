"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Search, Menu, X, Coins } from "lucide-react"
import Image from "next/image"

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/images/snes-controller-logo.png" alt="OdinSNES Logo" width={40} height={40} />
            <span className="font-bold text-xl">OdinSNES</span>
          </Link>
        </div>

        <div className="flex md:hidden">
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
          <Link href="/" className="flex items-center space-x-2 ml-2">
            <Image src="/images/snes-controller-logo.png" alt="OdinSNES Logo" width={36} height={36} />
            <span className="font-bold text-xl">OdinSNES</span>
          </Link>
        </div>

        <div className="hidden md:flex md:flex-1">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/games" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>Games</NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/about" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>About SNES</NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
            <Button className="bg-orange-500 hover:bg-orange-600 hidden sm:inline-flex">
              <Coins className="mr-2 h-4 w-4" /> Buy Our Token
            </Button>
          </Link>

          {isSearchOpen ? (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search games..."
                className="w-full bg-gray-800 pl-10 focus-visible:ring-orange-500"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            <Link
              href="/games"
              className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-gray-800"
              onClick={() => setIsMenuOpen(false)}
            >
              Games
            </Link>
            <Link
              href="/about"
              className="block rounded-md px-3 py-2 text-base font-medium text-white hover:bg-gray-800"
              onClick={() => setIsMenuOpen(false)}
            >
              About SNES
            </Link>
            <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"} className="w-full">
              <Button className="w-full mt-2 bg-orange-500 hover:bg-orange-600">
                <Coins className="mr-2 h-4 w-4" /> Buy Our Token
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
