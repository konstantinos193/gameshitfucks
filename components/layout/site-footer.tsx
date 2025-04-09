import { Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Image src="/images/snes-controller-logo.png" alt="OdinSNES Logo" width={40} height={40} />
            <span className="font-bold text-xl">OdinSNES</span>
          </div>

          <Link href={process.env.NEXT_PUBLIC_TOKEN_URL || "#"}>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Coins className="mr-2 h-4 w-4" /> Buy Our Token
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} OdinSNES. All rights reserved.</p>
          <p className="mt-2 text-sm">This is a fan site and is not affiliated with Nintendo.</p>
        </div>
      </div>
    </footer>
  )
}
