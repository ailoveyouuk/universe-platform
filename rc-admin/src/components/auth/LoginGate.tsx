'use client'

import { useAuth } from '@/lib/auth/useAuth'
import { useEffect } from 'react'

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, signIn } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) signIn()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ color: '#82BC00', fontSize: '14px', fontFamily: 'sans-serif' }}>
          Redirecting to sign in...
        </div>
        <button
          onClick={signIn}
          style={{
            background: '#82BC00',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          Sign in with Microsoft
        </button>
      </div>
    )
  }

  return <>{children}</>
}
