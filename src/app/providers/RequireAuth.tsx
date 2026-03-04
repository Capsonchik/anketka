'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { readAuthTokens } from '@/api-config/auth-tokens'

export function RequireAuth ({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const tokens = readAuthTokens()
  const hasTokens = Boolean(tokens?.accessToken && tokens?.refreshToken)

  useEffect(() => {
    if (!hasTokens) {
      router.replace('/login')
      router.refresh()
    }
  }, [hasTokens, router])

  if (!hasTokens) return null
  return children
}

