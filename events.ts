export const NETWORK_OFFLINE = 'network_offline'
export const NETWORK_ONLINE = 'network_online'
export const NETWORK_DISCONNECTED = 'network_disconnected'
export const NETWORK_RECONNECTED = 'network_reconnected'
export const NETWORK_SLOW_CONNECTION = 'network_slow_connection'

const eventListeners: { [k: string]: (() => void) [] } = {}

const setupEventListener = (event: string, callback: () => void) => {
  if (! eventListeners[event]) {
    eventListeners[event] = []
  }

  eventListeners[event].push(callback)
}

export const dispatch = (event: string) => {
  const listeners = eventListeners[event]
  if (listeners) {
    listeners.forEach(handler => handler())
  }
}

export const onNetworkOnline = (callback: () => void) => setupEventListener(NETWORK_ONLINE, callback)
export const onNetworkOffline = (callback: () => void) => setupEventListener(NETWORK_OFFLINE, callback)
export const onNetworkReconnected = (callback: () => void) => setupEventListener(NETWORK_RECONNECTED, callback)
export const onNetworkDisconnected = (callback: () => void) => setupEventListener(NETWORK_DISCONNECTED, callback)
export const onNetworkSlowConnection = (callback: () => void) => setupEventListener(NETWORK_SLOW_CONNECTION, callback)
