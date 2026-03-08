'use client'

import { useEffect } from 'react'

import { setupAuditorAuthInterceptors } from '@/api-config/auditor-auth-interceptors'
import { readAuditorAuthTokens } from '@/api-config/auditor-auth-tokens'

export function AuditorAuthInit () {
  useEffect(() => {
    setupAuditorAuthInterceptors()
    readAuditorAuthTokens()
  }, [])

  return null
}

