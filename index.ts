import type { AxiosRequestConfig, AxiosError } from 'axios'
import { get, post, put, config, axios, deleteRequest } from './networker'

export {
  checkOnlineConnection,
  setPingUrl,
} from './navigator'

export {
  onNetworkOnline,
  onNetworkOffline,
  onNetworkReconnected,
  onNetworkDisconnected,
  onNetworkSlowConnection,
} from './events'

export { handleAPIError } from './networker'

export interface NetworkerConfig {
  toast?: ToastSystem | undefined;
  handleErrors?: boolean;
  checkInternetConnection?: boolean;
  onHandledError?: (error: NetworkerHandledError) => void;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipNetworkTest?: boolean;
  skipErrorHandling?: boolean;
  onError?: <T = unknown>(error: AxiosError, body: T | undefined) => void;
}

export interface NetworkerHandledError {
  status: number;
  errorMessage: string;
  error: AxiosError;
  data?: any;
}

export interface ErrorHandlerConfig {
  showToast?: boolean;
}

export interface ToastSystem {
  success: (msg: string) => any;
  error: (msg: string) => any;
}

export const network = {
  axios,
  config,
  delete: deleteRequest,
  post,
  put,
  get,
}
