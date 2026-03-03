'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { readAuthTokens } from '@/api-config/auth-tokens'

export function RequireAuth ({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [hasTokens, setHasTokens] = useState<boolean | null>(null)

  useEffect(() => {
    const tokens = readAuthTokens()
    const ok = Boolean(tokens?.accessToken && tokens?.refreshToken)
    setHasTokens(ok)

    if (!ok) {
      router.replace('/login')
      router.refresh()
    }
  }, [router])

  if (hasTokens !== true) return null
  return children
}

