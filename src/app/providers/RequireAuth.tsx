'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { readAuthTokens } from '@/api-config/auth-tokens'

export function RequireAuth ({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const hasTokens = useMemo(() => {
    const tokens = readAuthTokens()
    return Boolean(tokens?.accessToken && tokens?.refreshToken)
  }, [])

  useEffect(() => {
    if (hasTokens) return
    router.replace('/login')
    router.refresh()
  }, [hasTokens, router])

  if (!hasTokens) return null
  return children
}

