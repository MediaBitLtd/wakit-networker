import { describe, it, expect, vi, beforeEach } from 'vitest'

type Events = typeof import('../events')

let events: Events

beforeEach(async () => {
  // Listeners live in module state, so load a fresh copy for every test
  vi.resetModules()
  events = await import('../events')
})

describe('events', () => {
  it.each([
    ['onNetworkOnline', 'NETWORK_ONLINE'],
    ['onNetworkOffline', 'NETWORK_OFFLINE'],
    ['onNetworkReconnected', 'NETWORK_RECONNECTED'],
    ['onNetworkDisconnected', 'NETWORK_DISCONNECTED'],
    ['onNetworkSlowConnection', 'NETWORK_SLOW_CONNECTION'],
  ] as const)('%s listens to %s', (listener, event) => {
    const callback = vi.fn()

    events[listener](callback)
    events.dispatch(events[event])

    expect(callback).toHaveBeenCalledOnce()
  })

  it('calls every listener of an event in order', () => {
    const calls: number[] = []

    events.onNetworkOnline(() => calls.push(1))
    events.onNetworkOnline(() => calls.push(2))
    events.dispatch(events.NETWORK_ONLINE)

    expect(calls).toEqual([1, 2])
  })

  it('does not call listeners of other events', () => {
    const callback = vi.fn()

    events.onNetworkOnline(callback)
    events.dispatch(events.NETWORK_OFFLINE)

    expect(callback).not.toHaveBeenCalled()
  })

  it('does nothing when an event has no listeners', () => {
    expect(() => events.dispatch(events.NETWORK_ONLINE)).not.toThrow()
  })
})
