import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cinzel } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cinzel',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://invictusinvestments.live'),
  title: 'Invictus — Unconquered on Solana',
  description:
    'Invictus is a Solana-native network. Connect your Phantom wallet to join the unconquered.',
  generator: 'v0.app',
  openGraph: {
    title: 'Invictus — Unconquered on Solana',
    description:
      'Invictus is a Solana-native network. Connect your Phantom wallet to join the unconquered.',
    url: 'https://invictusinvestments.live',
    siteName: 'Invictus',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d0c0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
