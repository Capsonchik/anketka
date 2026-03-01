import axios from 'axios'

export const MAIN_API = 'http://localhost:8000/api/v1/'

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
