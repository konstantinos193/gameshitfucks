import type { Metadata } from "next"
import gamesData from "@/data/games.json"

// Generate metadata for each game page
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const game = gamesData[params.slug as keyof typeof gamesData]

  if (!game) {
    return {
      title: "Game Not Found - OdinSNES",
      description: "The requested game could not be found.",
    }
  }

  return {
    title: `${game.title} - Play on OdinSNES`,
    description: `Play ${game.title} (${game.year}) online for free. ${game.description[0]}`,
    openGraph: {
      title: `Play ${game.title} on OdinSNES`,
      description: `Experience ${game.title} from ${game.year}. ${game.description[0]}`,
      type: 'website',
      url: `https://odinsnes.fun/play/${params.slug}`,
      siteName: 'OdinSNES',
      images: [
        {
          url: game.coverImage,
          width: 1200,
          height: 630,
          alt: `${game.title} - SNES Game`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Play ${game.title} on OdinSNES`,
      description: `Experience ${game.title} from ${game.year}. ${game.description[0]}`,
      images: [game.coverImage],
    },
  }
}

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 