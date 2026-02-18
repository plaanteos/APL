import apiClient from './api';
import { isDemoMode } from './demoMode';
import { demoStore } from './demoStore';

export interface LoginCredentials {
  email: string;
  password: string;
  otp?: string;
  backupCode?: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  rol?: 'ADMIN' | 'USER';
}

export interface User {
  id: string;
  email: string;
  username: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  rol: string;
  activo: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export const authService = {
  // Login
  login: async (credentials: LoginCredentials, rememberMe: boolean = false): Promise<AuthResponse> => {
    // Modo demo: no depender del backend
    if (isDemoMode()) {
      const user = demoStore.getDemoUser();
      const token = 'demo-token';
      const refreshToken = 'demo-refresh-token';

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', token);
      storage.setItem('refreshToken', refreshToken);
      storage.setItem('user', JSON.stringify(user));
      return { token, refreshToken, user };
    }

    const response = await apiClient.post('/auth/login', credentials);
    const { token, refreshToken, user } = response.data.data; // Backend devuelve data.data

    // Choose storage based on rememberMe flag
    const storage = rememberMe ? localStorage : sessionStorage;

    // Save tokens to chosen storage
    storage.setItem('authToken', token);
    if (refreshToken) {
      storage.setItem('refreshToken', refreshToken);
    }
    storage.setItem('user', JSON.stringify(user));

    return { token, refreshToken, user };
  },

  // Register
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', userData);
    const { token, refreshToken, user } = response.data.data; // Backend devuelve data.data
    localStorage.setItem('authToken', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(user));
    return { token, refreshToken, user };
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    if (isDemoMode()) {
      const stored = authService.getStoredUser();
      return stored ?? demoStore.getDemoUser();
    }

    const response = await apiClient.get('/auth/me');
    const user = response.data.data; // Backend devuelve data.data

    // Save to the same storage where the token is
    const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(user));

    return user;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      if (!isDemoMode()) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Si no hay conexión o el backend no responde, igual se debe limpiar la sesión local.
    } finally {
      // Clear from both storages
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
    }
  },

  // Limpieza local (sin llamadas a red)
  clearLocalSession: (): void => {
    // Clear from both storages
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },

  // Forgot password (envía código al email si existe)
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    // Modo demo: simular OK
    if (isDemoMode()) {
      return {
        success: true,
        message: 'Modo demo: se simuló el envío del código (usá 123456).',
      };
    }

    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Verificar código OTP antes de permitir cambiar contraseña
  verifyResetCode: async (email: string, code: string): Promise<{ success: boolean; message: string }> => {
    if (isDemoMode()) {
      if (code !== '123456') {
        throw new Error('Código inválido (demo: usá 123456)');
      }
      return { success: true, message: 'Código verificado (demo)' };
    }

    const response = await apiClient.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  // Reset password por código OTP
  resetPasswordWithCode: async (email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (isDemoMode()) {
      if (code !== '123456') {
        throw new Error('Código inválido (demo: usá 123456)');
      }
      return { success: true, message: 'Contraseña actualizada (demo)' };
    }

    const response = await apiClient.post('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  // Get stored token (check both storages)
  getToken: (): string | null => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  },

  // Get stored user (check both storages)
  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if authenticated (check both storages)
  isAuthenticated: (): boolean => {
    if (isDemoMode()) return true;
    return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  },
};
