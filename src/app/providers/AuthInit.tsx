'use client'

import { useEffect } from 'react'

import { setupAuthInterceptors } from '@/api-config/auth-interceptors'
import { readAuthTokens } from '@/api-config/auth-tokens'
import { readActiveCompanyId } from '@/api-config/company-context'

export function AuthInit () {
  useEffect(() => {
    setupAuthInterceptors()
    readAuthTokens()
    readActiveCompanyId()
  }, [])

  return null
}

