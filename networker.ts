import type { ErrorHandlerConfig, RequestConfig, ToastSystem, NetworkerConfig, NetworkerHandledError } from './index'
import type { AxiosError, AxiosResponse, Method } from 'axios'
import axios, { isAxiosError } from 'axios'
import { checkOnlineConnection } from './navigator'

let toast: ToastSystem|undefined = undefined
let checkInternetConnection: boolean = false
let handleErrors: boolean = true
let onHandledError: ((error: NetworkerHandledError) => any) | undefined = undefined

const config = (options: NetworkerConfig) => {
  toast = options.toast ?? toast
  checkInternetConnection = options.checkInternetConnection ?? checkInternetConnection
  handleErrors = options.handleErrors ?? handleErrors
  onHandledError = options.onHandledError ?? onHandledError
}

const getErrorMessage = (response: AxiosResponse<any>) => {
  switch (response.status) {
    case 400:
      return response.data?.message || 'Something went wrong, please try again later'
    case 401:
      return response.data?.message || 'Unauthenticated'
    case 403:
      return response.data?.message || 'Unauthorised'
    case 404:
      // Let's handle laravel for you
      const index = response.data?.message?.indexOf('App\\Models\\') ?? -1

      if (index !== -1) {
        return response.data.message.substring(
          index + 'App\\Models\\'.length,
          response.data.message.lastIndexOf(']')
        ) + ' not found'
      }

      return response.data?.message || 'Not found'
    case 422:
      return response.data?.message || 'You have validation errors'
    case 429:
      return 'Too many request attempts. Please try again later.'
    case 500:
      return response.data?.message || 'Server error'
    case 502:
      return response.data?.message || 'Service not available'

    default:
      return 'Something went wrong, please try again later'
  }
}

const handleAPIError = (error: AxiosError|Error, config: ErrorHandlerConfig = {}): NetworkerHandledError => {
  if (! isAxiosError(error)) {
    if (config.showToast && toast) {
      toast.error('Something went wrong')
    }

    throw error
  }

  const response = error.response

  if (! response) {
    // We didn't get any response from the server
    if (config.showToast && toast) {
      toast.error('Unable to connect to the server. Please try again later.')
    }

    if (onHandledError) {
      onHandledError({
        status: 502,
        errorMessage: 'Unable to connect to the server. Please try again later.',
        error,
      })
    }

    return {
      status: 502,
      errorMessage: 'Unable to connect to the server. Please try again later.',
      error,
    }
  }

  const message = getErrorMessage(response)

  if (config.showToast && toast) {
    toast.error(message)
  }

  if (onHandledError) {
    onHandledError({
      status: response.status,
      errorMessage: message,
      error,
    })
  }

  return {
    status: response.status,
    errorMessage: message,
    error,
  }
}

const request = async <T>(method: Method, url: string, body: any = undefined, config: RequestConfig = {}): Promise<T|undefined> => {
  if (! config.skipNetworkTest && checkInternetConnection && ! await checkOnlineConnection()) {
    if (handleErrors && ! config.skipErrorHandling && (config.showToast ?? true) && toast) {
      toast.error('Your device is currently offline')
    }
    return undefined
  }

  try {
    const { data } = await axios.request<T>({
      ...config,
      method,
      url,
      data: body ?? config.data,
    })

    return data
  } catch (err) {
    if (handleErrors && ! config.skipErrorHandling) {
      handleAPIError(err as Error, { showToast: config.showToast ?? true })
    }

    if (config.onError) {
      config.onError<T>(err as AxiosError, body)
    }
  }

  return undefined
}

const get = <T>(url: string, config: RequestConfig = {}) => request<T>('get', url, undefined, config)

const post = <T>(url: string, body: any = undefined, config: RequestConfig = {}) => request<T>('post', url, body, config)

const put = <T>(url: string, body: any = undefined, config: RequestConfig = {}) => request<T>('put', url, body, config)

const deleteRequest = <T>(url: string, config: RequestConfig = {}) => request<T>('delete', url, undefined, config)

export {
  axios,
  handleAPIError,
  deleteRequest,
  request,
  config,
  post,
  get,
  put,
}
