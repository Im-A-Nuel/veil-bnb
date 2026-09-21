import type { Metadata } from 'next'
import { Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const serif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Inter({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Veil — Trustless Proof-of-Exploit',
  description: 'Prove the exploit. Reveal nothing. ZK bug bounty on Stellar with RISC Zero zero-knowledge proofs.',
  applicationName: 'Veil',
  keywords: ['zero-knowledge', 'bug bounty', 'Stellar', 'Soroban', 'RISC Zero', 'proof of exploit'],
  openGraph: {
    title: 'Veil — Trustless Proof-of-Exploit',
    description: 'Prove the exploit. Reveal nothing. ZK bug bounty on Stellar.',
    siteName: 'Veil',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veil — Trustless Proof-of-Exploit',
    description: 'Prove the exploit. Reveal nothing. ZK bug bounty on Stellar.',
  },
}

export const viewport = {
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
      style={{ background: '#0A0A0A' }}
    >
      <body style={{ margin: 0, fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
        {children}
      </body>
    </html>
  )
}
