import axiosMainRequest from './api-config'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

const accessTokenKey = 'anketka_access_token'
const refreshTokenKey = 'anketka_refresh_token'

function applyAccessTokenToAxios (accessToken: string | null) {
  if (accessToken) {
    axiosMainRequest.defaults.headers.common.Authorization = `Bearer ${accessToken}`
  } else {
    delete axiosMainRequest.defaults.headers.common.Authorization
  }
}

export function writeAuthTokens (tokens: AuthTokens) {
  try {
    window.localStorage.setItem(accessTokenKey, tokens.accessToken)
    window.localStorage.setItem(refreshTokenKey, tokens.refreshToken)
  } catch {
    // ignore
  }

  applyAccessTokenToAxios(tokens.accessToken)
}

export function readAuthTokens (): AuthTokens | null {
  try {
    const accessToken = window.localStorage.getItem(accessTokenKey)
    const refreshToken = window.localStorage.getItem(refreshTokenKey)

    if (!accessToken || !refreshToken) {
      applyAccessTokenToAxios(null)
      return null
    }

    applyAccessTokenToAxios(accessToken)
    return { accessToken, refreshToken }
  } catch {
    applyAccessTokenToAxios(null)
    return null
  }
}

export function clearAuthTokens () {
  try {
    window.localStorage.removeItem(accessTokenKey)
    window.localStorage.removeItem(refreshTokenKey)
  } catch {
    // ignore
  }

  applyAccessTokenToAxios(null)
}

