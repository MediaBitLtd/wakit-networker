import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { axios, config, handleAPIError, request, get, post, put, deleteRequest } from '../networker'
import { checkOnlineConnection } from '../navigator'

// Replace the navigator with mocks, so no real ping is made
vi.mock('../navigator')

const toast = { success: vi.fn(), error: vi.fn() }
const onHandledError = vi.fn()

// Builds a real AxiosError. Without a status, it behaves like a request that never got a response
const axiosError = (status?: number, data?: any) => {
  const response = status === undefined ? undefined : {
    status,
    data,
    statusText: '',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  } as AxiosResponse

  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

const mockRequest = () => vi.spyOn(axios, 'request')

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()

  // Networker settings are shared, so set every option before each test
  config({
    toast,
    onHandledError,
    handleErrors: true,
    checkInternetConnection: false,
  })
})

describe('requests', () => {
  it('get returns the response data', async () => {
    const spy = mockRequest().mockResolvedValue({ data: { id: 1 } })

    const data = await get('/users/1')

    expect(data).toEqual({ id: 1 })
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: 'get', url: '/users/1' }))
  })

  it.each([
    ['post', post],
    ['put', put],
  ] as const)('%s sends the body', async (method, send) => {
    const spy = mockRequest().mockResolvedValue({ data: 'ok' })

    await send('/users', { name: 'Joao' })

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method, url: '/users', data: { name: 'Joao' } }))
  })

  it('delete keeps the data from the config', async () => {
    const spy = mockRequest().mockResolvedValue({ data: undefined })

    await deleteRequest('/users', { data: { ids: [1, 2] } })

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: 'delete', data: { ids: [1, 2] } }))
  })

  it('passes the axios config through', async () => {
    const spy = mockRequest().mockResolvedValue({ data: 'ok' })

    await request('patch', '/users/1', { name: 'Joao' }, { headers: { 'X-Test': 'yes' } })

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ method: 'patch', headers: { 'X-Test': 'yes' } }))
  })
})

describe('error messages', () => {
  it.each([
    [400, { message: 'Bad input' }, 'Bad input'],
    [400, undefined, 'Something went wrong, please try again later'],
    [401, { message: 'Token expired' }, 'Token expired'],
    [401, undefined, 'Unauthenticated'],
    [403, { message: 'No access' }, 'No access'],
    [403, undefined, 'Unauthorised'],
    [404, { message: 'No query results for model [App\\Models\\User] 1' }, 'User not found'],
    [404, { message: 'Page missing' }, 'Page missing'],
    [404, undefined, 'Not found'],
    [422, { message: 'The email field is required.' }, 'The email field is required.'],
    [422, undefined, 'You have validation errors'],
    [429, { message: 'Slow down' }, 'Too many request attempts. Please try again later.'],
    [500, { message: 'Database down' }, 'Database down'],
    [500, undefined, 'Server error'],
    [502, undefined, 'Service not available'],
    [418, { message: 'Teapot' }, 'Something went wrong, please try again later'],
  ])('status %i with %o returns "%s"', (status, data, message) => {
    const result = handleAPIError(axiosError(status, data))

    expect(result.status).toBe(status)
    expect(result.errorMessage).toBe(message)
  })

  it('returns 502 when the server did not respond', () => {
    const result = handleAPIError(axiosError())

    expect(result.status).toBe(502)
    expect(result.errorMessage).toBe('Unable to connect to the server. Please try again later.')
  })

  it('rethrows errors that are not from axios', () => {
    expect(() => handleAPIError(new Error('boom'))).toThrow('boom')
  })
})

describe('error handling', () => {
  it('returns undefined, shows a toast and calls onHandledError', async () => {
    mockRequest().mockRejectedValue(axiosError(500))

    const data = await get('/users')

    expect(data).toBeUndefined()
    expect(toast.error).toHaveBeenCalledWith('Server error')
    expect(onHandledError).toHaveBeenCalledWith(expect.objectContaining({ status: 500, errorMessage: 'Server error' }))
  })

  it('does not show a toast when showToast is false', async () => {
    mockRequest().mockRejectedValue(axiosError(500))

    await get('/users', { showToast: false })

    expect(toast.error).not.toHaveBeenCalled()
    expect(onHandledError).toHaveBeenCalled()
  })

  it('skips error handling but still calls onError', async () => {
    const error = axiosError(500)
    const onError = vi.fn()
    mockRequest().mockRejectedValue(error)

    await post('/users', { name: 'Joao' }, { skipErrorHandling: true, onError })

    expect(toast.error).not.toHaveBeenCalled()
    expect(onHandledError).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(error, { name: 'Joao' })
  })

  it('does not handle errors when disabled globally', async () => {
    config({ handleErrors: false })
    mockRequest().mockRejectedValue(axiosError(500))

    await get('/users')

    expect(toast.error).not.toHaveBeenCalled()
    expect(onHandledError).not.toHaveBeenCalled()
  })

  it('rejects when the error is not from axios', async () => {
    mockRequest().mockRejectedValue(new Error('boom'))

    await expect(get('/users')).rejects.toThrow('boom')
  })
})

describe('offline', () => {
  beforeEach(() => {
    config({ checkInternetConnection: true })
    vi.mocked(checkOnlineConnection).mockResolvedValue(false)
  })

  it('does not send the request and shows a toast', async () => {
    const spy = mockRequest()

    const data = await get('/users')

    expect(data).toBeUndefined()
    expect(spy).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Your device is currently offline')
  })

  it('does not show a toast when showToast is false', async () => {
    mockRequest()

    await get('/users', { showToast: false })

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sends the request when skipNetworkTest is set', async () => {
    const spy = mockRequest().mockResolvedValue({ data: 'ok' })

    const data = await get('/users', { skipNetworkTest: true })

    expect(data).toBe('ok')
    expect(checkOnlineConnection).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })
})
