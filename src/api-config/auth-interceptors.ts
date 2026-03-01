import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import axiosMainRequest from './api-config'
import { apiRoutes } from './api-routes'
import { clearAuthTokens, readAuthTokens, writeAuthTokens } from './auth-tokens'

type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

type RequestConfigWithRetry = InternalAxiosRequestConfig & {
  _anketkaRetry?: boolean
}

let hasSetup = false
let refreshPromise: Promise<string | null> | null = null

function redirectToLogin () {
  clearAuthTokens()
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
  }
}

function getRequestUrl (config: InternalAxiosRequestConfig | undefined) {
  return String(config?.url ?? '')
}

function isAuthEndpoint (config: InternalAxiosRequestConfig | undefined) {
  const url = getRequestUrl(config)
  return (
    url.includes(apiRoutes.auth.login) ||
    url.includes(apiRoutes.auth.register) ||
    url.includes(apiRoutes.auth.refresh) ||
    url.includes(apiRoutes.auth.logout)
  )
}

async function refreshAccessToken (): Promise<string | null> {
  const tokens = readAuthTokens()
  if (!tokens?.refreshToken) return null

  try {
    const res = await axiosMainRequest.post<RefreshResponse>(apiRoutes.auth.refresh, {
      refreshToken: tokens.refreshToken,
    })

    const accessToken = res.data?.accessToken
    const refreshToken = res.data?.refreshToken
    if (!accessToken || !refreshToken) return null

    writeAuthTokens({ accessToken, refreshToken })
    return accessToken
  } catch {
    return null
  }
}

export function setupAuthInterceptors () {
  if (hasSetup) return
  hasSetup = true

  axiosMainRequest.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status
      const config = error.config as RequestConfigWithRetry | undefined

      if (!config || status !== 401) throw error
      if (config._anketkaRetry) throw error
      if (isAuthEndpoint(config)) throw error

      const hasRefresh = Boolean(readAuthTokens()?.refreshToken)
      if (!hasRefresh) {
        redirectToLogin()
        throw error
      }

      config._anketkaRetry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const newAccessToken = await refreshPromise
      if (!newAccessToken) {
        redirectToLogin()
        throw error
      }

      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${newAccessToken}`
      return axiosMainRequest(config)
    },
  )
}

