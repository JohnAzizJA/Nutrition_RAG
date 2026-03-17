import axios from 'axios';
import { authStorage } from '@/src/utils/authStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_BASE_URL) throw new Error('EXPO_PUBLIC_API_URL is not set');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token cache — avoids SecureStore disk I/O on every request
let _cachedToken: string | null = null;

export function clearTokenCache() {
  _cachedToken = null;
}

// Request interceptor - Add token to requests
axiosInstance.interceptors.request.use(
  async (config) => {
    if (!_cachedToken) {
      _cachedToken = await authStorage.getToken();
    }
    if (_cachedToken) {
      config.headers.Authorization = `Bearer ${_cachedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await authStorage.getRefreshToken();
        if (refreshToken) {
          const { data } = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          await authStorage.saveToken(data.access_token);
          await authStorage.saveRefreshToken(data.refresh_token);
          _cachedToken = data.access_token;

          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        _cachedToken = null;
        await authStorage.clearAll();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
