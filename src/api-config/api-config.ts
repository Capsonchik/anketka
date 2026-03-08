import axios from 'axios'

export const MAIN_API = process.env.NEXT_PUBLIC_MAIN_API ?? '/api/v1/'

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
