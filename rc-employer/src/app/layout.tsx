import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import { MsalProvider } from '@/lib/auth/MsalProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Employer Dashboard — Renewables Connect',
  description: 'Talent discovery portal for renewable energy employers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-body bg-emp-bg text-emp-navy antialiased">
        <MsalProvider>
          {children}
        </MsalProvider>
      </body>
    </html>
  )
}
