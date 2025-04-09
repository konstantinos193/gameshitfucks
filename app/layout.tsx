import "./globals.css"
import { Inter } from "next/font/google"
import type React from "react"
import type { Metadata } from "next"
import { Providers } from "./providers"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OdinSNES - Play Classic SNES Games Online",
  description: "Play your favorite Super Nintendo games directly in your browser. Free SNES emulator with save states, gamepad support, and more.",
  icons: {
    icon: 'https://odinsnes.fun/images/snes-controller-logo.png',
    shortcut: 'https://odinsnes.fun/images/snes-controller-logo.png',
    apple: 'https://odinsnes.fun/images/snes-controller-logo.png',
  },
  metadataBase: new URL('https://odinsnes.fun'),
  openGraph: {
    type: 'website',
    url: 'https://odinsnes.fun',
    title: 'OdinSNES - Classic SNES Games',
    description: 'Play classic Super Nintendo games online with our free emulator. Features save states, gamepad support, and a growing game library.',
    siteName: 'OdinSNES',
    images: [{
      url: '/images/snes-controller-logo.png',
      width: 1200,
      height: 630,
      alt: 'OdinSNES - SNES Emulator',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OdinSNES - Play SNES Games Online',
    description: 'Play classic Super Nintendo games in your browser',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://odinsnes.fun" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://odinsnes.fun" />
        <meta property="og:title" content="OdinSNES - Classic SNES Games" />
        <meta property="og:description" content="Play classic Super Nintendo games online with our free emulator" />
        <meta property="og:image" content="/images/snes-controller-logo.png" />
        <meta property="og:site_name" content="OdinSNES" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OdinSNES - Play SNES Games Online" />
        <meta name="twitter:description" content="Play classic Super Nintendo games in your browser" />
        <meta name="twitter:image" content="/images/snes-controller-logo.png" />
      </head>
      <body className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="dark"
        >
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </Providers>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
