import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

import axiosAuditorRequest from './auditor-api-config'
import { apiRoutes } from './api-routes'
import { clearAuditorAuthTokens, readAuditorAuthTokens, writeAuditorAuthTokens } from './auditor-auth-tokens'

type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

type RequestConfigWithRetry = InternalAxiosRequestConfig & {
  _anketkaRetry?: boolean
}

let hasSetup = false
let refreshPromise: Promise<string | null> | null = null

function redirectToAuditorLogin () {
  clearAuditorAuthTokens()
  if (typeof window !== 'undefined') {
    window.location.replace('/auditor/login')
  }
}

function getRequestUrl (config: InternalAxiosRequestConfig | undefined) {
  return String(config?.url ?? '')
}

function isAuthEndpoint (config: InternalAxiosRequestConfig | undefined) {
  const url = getRequestUrl(config)
  return url.includes(apiRoutes.auditorAuth.login) || url.includes(apiRoutes.auditorAuth.refresh) || url.includes(apiRoutes.auditorAuth.logout)
}

async function refreshAccessToken (): Promise<string | null> {
  const tokens = readAuditorAuthTokens()
  if (!tokens?.refreshToken) return null

  try {
    const res = await axiosAuditorRequest.post<RefreshResponse>(apiRoutes.auditorAuth.refresh, {
      refreshToken: tokens.refreshToken,
    })

    const accessToken = res.data?.accessToken
    const refreshToken = res.data?.refreshToken
    if (!accessToken || !refreshToken) return null

    writeAuditorAuthTokens({ accessToken, refreshToken })
    return accessToken
  } catch {
    return null
  }
}

export function setupAuditorAuthInterceptors () {
  if (hasSetup) return
  hasSetup = true

  axiosAuditorRequest.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status
      const config = error.config as RequestConfigWithRetry | undefined

      if (!config || status !== 401) throw error
      if (config._anketkaRetry) throw error
      if (isAuthEndpoint(config)) throw error

      const hasRefresh = Boolean(readAuditorAuthTokens()?.refreshToken)
      if (!hasRefresh) {
        redirectToAuditorLogin()
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
        redirectToAuditorLogin()
        throw error
      }

      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${newAccessToken}`
      return axiosAuditorRequest(config)
    },
  )
}

