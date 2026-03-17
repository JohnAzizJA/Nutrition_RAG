import React, { createContext, useContext, useState, useEffect } from 'react';
import { authStorage } from '@/src/utils/authStorage';
import { authService, UserResponse } from '@/src/services';
import { clearTokenCache } from '@/src/api/axios';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (userData: UserResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authStorage.getToken();
      setIsLoading(false); // Unblock app immediately after token check
      if (token) {
        authService.getProfile().then(setUser).catch(async (error: any) => {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            clearTokenCache();
            await authStorage.clearAll();
          }
        });
      }
    } catch {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    await authStorage.saveToken(response.access_token);
    await authStorage.saveRefreshToken(response.refresh_token);
    setUser(response.user);
  };

  const register = async (data: any) => {
    const response = await authService.register(data);
    await authStorage.saveToken(response.access_token);
    await authStorage.saveRefreshToken(response.refresh_token);
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    clearTokenCache();
    await authStorage.clearAll();
    setUser(null);
  };

  const refreshToken = async () => {
    const refresh = await authStorage.getRefreshToken();
    if (refresh) {
      const response = await authService.refresh(refresh);
      await authStorage.saveToken(response.access_token);
      await authStorage.saveRefreshToken(response.refresh_token);
      setUser(response.user);
    }
  };

  const updateUser = async (userData: UserResponse) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshToken,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
