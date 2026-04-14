// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import type { User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser(true);
      setUser(currentUser);
      if (!currentUser) {
        // Попытка очистить возможные "битые" сессии
        try {
          await authService.ensureNoActiveSession();
        } catch {
          // игнорируем ошибки очистки
        }
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      setUser(null);
      try {
        await authService.ensureNoActiveSession();
      } catch {
        // игнорируем
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const logged = await authService.login(email, password);
    setUser(logged);
  };

  const register = async (email: string, password: string, name: string) => {
    const registered = await authService.register(email, password, name);
    setUser(registered);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
