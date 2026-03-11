import axios from 'axios'

function normalizeMainApi (value: string): string {
  const v = String(value ?? '').trim()
  if (!v) return '/api/v1/'

  if (/^https?:\/\//i.test(v)) {
    return v.endsWith('/') ? v : `${v}/`
  }

  const withSlash = v.startsWith('/') ? v : `/${v}`
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
}

export const MAIN_API = normalizeMainApi(process.env.NEXT_PUBLIC_MAIN_API ?? '/api/v1/')

const axiosMainRequest = axios.create({
  baseURL: MAIN_API,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'ru',
  },
  withCredentials: true,
})

export default axiosMainRequest
