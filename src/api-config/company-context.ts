import axiosMainRequest from './api-config'

const activeCompanyKey = 'anketka_active_company_id'

function applyActiveCompanyIdToAxios (companyId: string | null) {
  if (companyId) {
    axiosMainRequest.defaults.headers.common['X-Company-Id'] = companyId
  } else {
    delete axiosMainRequest.defaults.headers.common['X-Company-Id']
  }
}

export function writeActiveCompanyId (companyId: string | null) {
  try {
    if (companyId) window.localStorage.setItem(activeCompanyKey, companyId)
    else window.localStorage.removeItem(activeCompanyKey)
  } catch {
    // ignore
  }

  applyActiveCompanyIdToAxios(companyId)
}

export function readActiveCompanyId (): string | null {
  try {
    const id = window.localStorage.getItem(activeCompanyKey)
    const value = id && id.trim() ? id.trim() : null
    applyActiveCompanyIdToAxios(value)
    return value
  } catch {
    applyActiveCompanyIdToAxios(null)
    return null
  }
}

