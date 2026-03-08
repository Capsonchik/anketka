import axiosAuditorRequest from './auditor-api-config'

export type AuditorAuthTokens = {
  accessToken: string
  refreshToken: string
}

const accessTokenKey = 'anketka_auditor_access_token'
const refreshTokenKey = 'anketka_auditor_refresh_token'

function applyAccessTokenToAxios (accessToken: string | null) {
  if (accessToken) {
    axiosAuditorRequest.defaults.headers.common.Authorization = `Bearer ${accessToken}`
  } else {
    delete axiosAuditorRequest.defaults.headers.common.Authorization
  }
}

export function writeAuditorAuthTokens (tokens: AuditorAuthTokens) {
  try {
    window.localStorage.setItem(accessTokenKey, tokens.accessToken)
    window.localStorage.setItem(refreshTokenKey, tokens.refreshToken)
  } catch {
    // ignore
  }

  applyAccessTokenToAxios(tokens.accessToken)
}

export function readAuditorAuthTokens (): AuditorAuthTokens | null {
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

export function clearAuditorAuthTokens () {
  try {
    window.localStorage.removeItem(accessTokenKey)
    window.localStorage.removeItem(refreshTokenKey)
  } catch {
    // ignore
  }

  applyAccessTokenToAxios(null)
}

