import axios, { AxiosInstance } from 'axios';
import { getApiBaseURL } from '@/shared/utils/envConfig';
import { API_TIMEOUT, REFRESH_TIMEOUT } from './settings';

/**
 * Instancias axios del cliente principal. Viven en su propio módulo para que
 * los interceptores puedan importarlas sin depender del punto de composición.
 */

// Bases de URL: usar helper que decide según entorno y variables
export const baseURL = getApiBaseURL();

// Asegurar credenciales en todas las llamadas axios (cookies/CSRF)
axios.defaults.withCredentials = true;

// Cliente principal con credenciales habilitadas (cookies)
export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

// Cliente para refresh (sin Authorization explícito)
export const refreshClient: AxiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  timeout: REFRESH_TIMEOUT,
  withCredentials: true,
});
