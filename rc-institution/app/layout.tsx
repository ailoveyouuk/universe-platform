import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import { MsalProvider } from '@/lib/auth/MsalProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Organisation Dashboard — Renewables Connect',
  description: 'Organisation portal for Renewables Connect',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-body bg-inst-bg text-inst-slate antialiased">
        <MsalProvider>
          {children}
        </MsalProvider>
      </body>
    </html>
  )
}
