'use client'

import Image from "next/image"

interface GameImageProps {
  src: string
  alt: string
  fallback: string
}

// Banner image component
export function GameBanner({ src, alt, fallback }: GameImageProps) {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
      <div className="w-full h-full bg-gray-800">
        <Image
          src={src || fallback}
          alt={alt}
          fill
          className="object-cover"
          onError={(e) => {
            e.currentTarget.src = fallback
          }}
        />
      </div>
    </div>
  )
}

// Cover image component
export function GameCover({ src, alt, fallback }: GameImageProps) {
  return (
    <div className="relative w-[280px] h-[200px] rounded-lg overflow-hidden bg-gray-800">
      <Image
        src={src || fallback}
        alt={alt}
        fill
        sizes="280px"
        className="object-contain"
        priority
        onError={(e) => {
          e.currentTarget.src = fallback
        }}
      />
    </div>
  )
}

// Screenshots component
interface GameScreenshotsProps {
  screenshots: string[]
  title: string
}

export function GameScreenshots({ screenshots, title }: GameScreenshotsProps) {
  const fallback = "/placeholder.svg?height=300&width=400"
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {screenshots.map((screenshot, index) => (
        <div key={index} className="rounded-lg overflow-hidden border border-gray-700 bg-gray-700">
          <Image
            src={screenshot || fallback}
            alt={`${title} screenshot ${index + 1}`}
            width={400}
            height={300}
            className="w-full h-auto"
            onError={(e) => {
              e.currentTarget.src = fallback
            }}
          />
        </div>
      ))}
    </div>
  )
} 