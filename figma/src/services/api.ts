import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base API configuration
const RAW_API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') as string;

// Normalizar para que siempre apunte a ".../api" independientemente de si el env ya lo incluye.
const trimmed = RAW_API_URL.replace(/\/+$/, '');
const API_BASE_URL = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para CORS con credenciales
  timeout: 90000, // 90 segundos - Render free tier puede tardar en despertar
});

// Flag para prevenir múltiples refreshes simultáneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Procesar cola de requests fallidos después de refresh exitoso
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling with refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si es 401 y no es el endpoint de login/refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      // Si ya hay un refresh en progreso, agregar a cola
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No hay refresh token, redirigir a login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        return Promise.reject(error);
      }

      try {
        // Intentar renovar el token
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        const { token: newAccessToken } = response.data.data;
        
        // Guardar nuevo access token
        localStorage.setItem('authToken', newAccessToken);

        // Actualizar header del request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Procesar cola de requests pendientes
        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Reintentar request original
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh falló, limpiar tokens y redirigir
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
