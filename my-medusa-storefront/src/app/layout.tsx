import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Bungee, Space_Grotesk } from "next/font/google"
import "styles/globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
})

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    images: ["/opengraph-image"],
  },
  twitter: {
    images: ["/twitter-image"],
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body className={`${spaceGrotesk.variable} ${bungee.variable} antialiased`}>
        <main className="relative overflow-x-hidden">{props.children}</main>
      </body>
    </html>
  )
}
