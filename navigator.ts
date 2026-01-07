import axios from 'axios'
import { NETWORK_OFFLINE, NETWORK_ONLINE, NETWORK_DISCONNECTED, NETWORK_RECONNECTED, NETWORK_SLOW_CONNECTION } from './events.js'

const RECHECK = 25_000 // check only after x milliseconds
const RECHECK_INTERVAL = 120_000 // automatically recheck every x milliseconds

const eventListeners: { [k: string]: (() => void) [] } = {}

let lastChecked: number|undefined = undefined
let lastOnline: boolean|undefined = undefined
let online: boolean = false
let lastSlow: boolean = false

let getServerUrl = () => '/'

const setupEventListener = (event: string, callback: () => void) => {
  if (! eventListeners[event]) {
    eventListeners[event] = []
  }

  // @ts-ignore
  eventListeners[event].push(callback)
}

export const onNetworkOnline = (callback: () => void) => setupEventListener(NETWORK_ONLINE, callback)
export const onNetworkOffline = (callback: () => void) => setupEventListener(NETWORK_OFFLINE, callback)
export const onNetworkReconnected = (callback: () => void) => setupEventListener(NETWORK_RECONNECTED, callback)
export const onNetworkDisconnected = (callback: () => void) => setupEventListener(NETWORK_DISCONNECTED, callback)
export const onNetworkSlowConnection = (callback: () => void) => setupEventListener(NETWORK_SLOW_CONNECTION, callback)

export const setPingUrl = (url: string) => {
  getServerUrl = () => url
}

const dispatch = (event: string) => {
  const listeners = eventListeners[event]
  if (listeners) {
    listeners.forEach(handler => handler())
  }
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
