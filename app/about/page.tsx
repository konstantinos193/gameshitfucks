import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">About the SNES</h1>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <Image
              src="/images/snes-console.jpg"
              alt="SNES Console"
              width={600}
              height={600}
              className="rounded-lg object-contain w-full h-full"
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Super Nintendo Entertainment System</h2>
            <p>
              The Super Nintendo Entertainment System (SNES), also known as the Super Famicom in Japan, was a 16-bit
              home video game console developed by Nintendo that was released in 1990 in Japan and South Korea, 1991 in
              North America, 1992 in Europe and Australasia, and 1993 in South America.
            </p>
            <p>
              The SNES was Nintendo's second home console, following the Nintendo Entertainment System (NES). The
              console introduced advanced graphics and sound capabilities compared with other consoles at the time. The
              development of a variety of enhancement chips integrated in game cartridges helped to keep it competitive
              in the marketplace.
            </p>
            <p>
              The SNES was a global success, becoming the best-selling console of the 16-bit era despite its relatively
              late start and the fierce competition it faced in North America and Europe from Sega's Genesis/Mega Drive
              console.
            </p>
            <Link
              href="https://en.wikipedia.org/wiki/Super_Nintendo_Entertainment_System"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="mt-4">Read Full History</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Technical Specifications</h3>
            <ul className="space-y-2">
              <li>
                <span className="font-bold">Processor:</span> Ricoh 5A22 @ 3.58 MHz
              </li>
              <li>
                <span className="font-bold">Resolution:</span> 256 x 224 or 256 x 240
              </li>
              <li>
                <span className="font-bold">Colors:</span> 32,768
              </li>
              <li>
                <span className="font-bold">Sound:</span> Sony SPC700, 8-channel ADPCM
              </li>
              <li>
                <span className="font-bold">Controller:</span> 8-way D-pad, 6 face buttons, 2 shoulder buttons
              </li>
              <li>
                <span className="font-bold">Media:</span> ROM cartridge
              </li>
            </ul>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Sales & Distribution</h3>
            <ul className="space-y-2">
              <li>
                <span className="font-bold">Units Sold:</span> 49.10 million worldwide
              </li>
              <li>
                <span className="font-bold">Americas:</span> 23.35 million
              </li>
              <li>
                <span className="font-bold">Japan:</span> 17.17 million
              </li>
              <li>
                <span className="font-bold">Other:</span> 8.58 million
              </li>
              <li>
                <span className="font-bold">Release:</span> 1990 (Japan), 1991 (North America), 1992 (Europe)
              </li>
              <li>
                <span className="font-bold">Discontinued:</span> 1999 (North America), 2003 (Japan)
              </li>
            </ul>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Legacy</h3>
            <ul className="space-y-2">
              <li>Best-selling console of the 16-bit era</li>
              <li>Introduced iconic franchises and sequels</li>
              <li>Pioneered advanced graphics capabilities</li>
              <li>Featured innovative controller design</li>
              <li>Home to many critically acclaimed games</li>
              <li>Continues to influence modern game design</li>
            </ul>
          </div>
        </div>

        <div
          className="mb-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700 shadow-lg"
          id="faq"
        >
          <div className="flex items-center mb-8">
            <div className="bg-orange-500 p-2 rounded-lg mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <path d="M12 17h.01"></path>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          </div>

          <p className="text-gray-300 mb-6">
            Discover more about the legendary Super Nintendo Entertainment System with these commonly asked questions.
          </p>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/50">
              <AccordionTrigger className="text-lg font-medium px-6 py-4 hover:bg-gray-700/50">
                What made the SNES different from the NES?
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 text-gray-300 bg-gray-800/30">
                The SNES featured significantly improved graphics and sound capabilities compared to the NES. It could
                display more colors (32,768 vs. 52 on NES), had higher resolution, better sound quality with 8 audio
                channels, and a more ergonomic controller with additional buttons. The SNES also introduced the Mode 7
                graphics mode, which allowed for pseudo-3D rotation and scaling effects.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/50">
              <AccordionTrigger className="text-lg font-medium px-6 py-4 hover:bg-gray-700/50">
                What was the "console war" between SNES and Genesis?
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 text-gray-300 bg-gray-800/30">
                The rivalry between Nintendo's SNES and Sega's Genesis (Mega Drive) is often described as one of the
                most notable console wars in video game history. Sega positioned the Genesis as the "cool" console with
                more mature titles aimed at older gamers and edgy advertisements that occasionally attacked the
                competition. Nintendo secured early advantages with exclusive titles like Street Fighter II. The
                competition between these consoles drove innovation and marketing strategies that still influence the
                industry today.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/50">
              <AccordionTrigger className="text-lg font-medium px-6 py-4 hover:bg-gray-700/50">
                What were some of the most popular SNES games?
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 text-gray-300 bg-gray-800/30">
                Some of the most popular and influential SNES games include Super Mario World, The Legend of Zelda: A
                Link to the Past, Super Metroid, Chrono Trigger, Final Fantasy VI, Donkey Kong Country, Street Fighter
                II, Super Mario Kart, EarthBound, and Star Fox. Many of these titles are considered among the greatest
                video games of all time and established franchises that continue today.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border border-gray-600 rounded-lg overflow-hidden bg-gray-800/50">
              <AccordionTrigger className="text-lg font-medium px-6 py-4 hover:bg-gray-700/50">
                Why is the SNES still popular today?
              </AccordionTrigger>
              <AccordionContent className="px-6 py-4 text-gray-300 bg-gray-800/30">
                The SNES remains popular due to its exceptional game library, many of which feature timeless gameplay
                and design that hold up well today. The console represents a golden age in gaming when 2D pixel art
                reached its peak before the industry shifted to 3D. There's strong nostalgia among those who grew up
                with the system, and many modern indie games draw inspiration from SNES titles. The console is also
                popular among collectors, retro gaming enthusiasts, and through official re-releases like the SNES
                Classic Edition.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">SNES Controller</h2>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-ovr71lYlRogO7AJ5eaMo6Invxpyvdu.png"
                alt="SNES Controller"
                width={500}
                height={300}
                className="rounded-lg object-contain w-full h-full"
              />
            </div>
            <div className="space-y-4">
              <p>
                The SNES controller introduced several innovations that have influenced controller design to this day.
                It featured a more ergonomic design compared to the rectangular NES controller and introduced the iconic
                four face button diamond layout (A, B, X, Y) that is still used in modern controllers.
              </p>
              <p>
                The controller also added two shoulder buttons (L and R), bringing the total to eight buttons including
                Start and Select. This expanded button layout allowed for more complex gameplay and control schemes,
                which developers took advantage of in creating more sophisticated games.
              </p>
              <p>
                The SNES controller's design was so successful that its basic layout—a directional pad on the left, face
                buttons on the right, and shoulder buttons on top—has remained the standard template for game
                controllers across multiple platforms and generations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
