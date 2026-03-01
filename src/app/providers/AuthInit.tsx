'use client'

import { useEffect } from 'react'

import { setupAuthInterceptors } from '@/api-config/auth-interceptors'
import { readAuthTokens } from '@/api-config/auth-tokens'

export function AuthInit () {
  useEffect(() => {
    setupAuthInterceptors()
    readAuthTokens()
  }, [])

  return null
}

