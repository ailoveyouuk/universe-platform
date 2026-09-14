import type { Metadata } from 'next'
import AuthProvider from '@/lib/auth/AuthProvider'
import { LearnerProvider } from '@/lib/auth/LearnerContext'
import { ProgressProvider } from '@/lib/progress/ProgressContext'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title:       'Renewables Connect',
  description: 'A global online course for real skills in the clean energy transition.',
  // The real RC mark, cropped from the brand lockup (rc-logo-full.png) —
  // replaces the placeholder lightning-bolt SVG that was here before.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LearnerProvider>
            <ProgressProvider>
              {children}
            </ProgressProvider>
          </LearnerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
