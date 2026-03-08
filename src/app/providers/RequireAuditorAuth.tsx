'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { readAuditorAuthTokens } from '@/api-config/auditor-auth-tokens'

export function RequireAuditorAuth ({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const tokens = readAuditorAuthTokens()
  const hasTokens = Boolean(tokens?.accessToken && tokens?.refreshToken)

  useEffect(() => {
    if (!hasTokens) {
      router.replace('/auditor/login')
      router.refresh()
    }
  }, [hasTokens, router])

  if (!hasTokens) return null
  return children
}

