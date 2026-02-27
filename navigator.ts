import axios from 'axios'
import {
  NETWORK_OFFLINE,
  NETWORK_ONLINE,
  NETWORK_DISCONNECTED,
  NETWORK_RECONNECTED,
  NETWORK_SLOW_CONNECTION,
  dispatch
} from './events'

const RECHECK = 25_000 // check only after x milliseconds
const RECHECK_INTERVAL = 120_000 // automatically recheck every x milliseconds

let lastChecked: number|undefined = undefined
let lastOnline: boolean|undefined = undefined
let online: boolean = false
let lastSlow: boolean = false

let getServerUrl = () => '/'

export const setPingUrl = (url: string) => {
  getServerUrl = () => url
}

const connected = () => {
  online = true

  if (lastOnline === false) {
    dispatch(NETWORK_RECONNECTED)
  }
  dispatch(NETWORK_ONLINE)

  lastOnline = true
}

const disconnected = () => {
  online = false

  dispatch(NETWORK_OFFLINE)
  if (lastOnline === true) {
    dispatch(NETWORK_DISCONNECTED)
  }

  lastOnline = false
}

export const checkOnlineConnection = async (forced = false): Promise<boolean> => {
  if (! navigator.onLine) {
    disconnected()
    return false
  }

  if (! forced && lastChecked && lastChecked + RECHECK > Date.now()) {
    return online
  }

  const instance = axios.create()

  instance.interceptors.request.use((config) => {
    config.headers['request-startTime'] = (new Date).getTime()

    return config
  })

  instance.interceptors.response.use((response) => {
    const start = response.config.headers['request-startTime']
    const end = (new Date).getTime()

    response.config.headers['request-duration'] = end - start

    return response
  })

  try {
    const { config } = await instance.get(getServerUrl(), {
      timeout: 2400,
    })

    const duration = config.headers['request-duration']

    connected()

    if (duration > 350) {
      if (! lastSlow) {
        lastSlow = true
        dispatch(NETWORK_SLOW_CONNECTION)
      }
    } else {
      lastSlow = false
    }

    return true
  } catch (err) {
    disconnected()
    return false
  } finally {
    lastChecked = Date.now()
  }
}

if (window) {
  window.addEventListener('online', () => checkOnlineConnection(true))
  window.addEventListener('offline', () => checkOnlineConnection(true))
  setInterval(() => checkOnlineConnection(), RECHECK_INTERVAL)
}
