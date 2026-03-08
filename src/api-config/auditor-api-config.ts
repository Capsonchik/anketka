import axios from 'axios'

import { MAIN_API } from './api-config'

const axiosAuditorRequest = axios.create({
  baseURL: MAIN_API,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'ru',
  },
  withCredentials: true,
})

export default axiosAuditorRequest

