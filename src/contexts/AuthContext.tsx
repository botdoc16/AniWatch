import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { login as apiLogin, register as apiRegister, logout as apiLogout } from '@/services/backendApi';
import { Achievement } from '@/services/achievementsService';
import { favoritesService } from '@/services/favoritesService';
import { userLevelService } from '@/services/userLevelService';
import { achievementsService } from '@/services/achievementsService';
import { networkService } from '@/services/networkService';

export interface User {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  level?: number;
  exp?: number;
  next_level_exp?: number;
  achievements?: Achievement[];
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        if (token && savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          await updateUserData();
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const updateUserData = async () => {
    try {
      // Проверяем базовые данные пользователя
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        throw new Error("Нет сохраненных данных пользователя");
      }

      const userData = JSON.parse(savedUser);
      if (!userData.user_id) {
        throw new Error("Некорректные данные пользователя");
      }

      // Устанавливаем userId для сервиса избранного
      favoritesService.setUserId(userData.user_id);

      // Проверяем доступность сервера
      const isAvailable = await networkService.checkServerAvailability(import.meta.env.VITE_API_URL || 'https://api.aniwatch.lol');
      if (!isAvailable) {
        // Проверяем, не показывали ли мы уже уведомление недавно
        const lastNotificationTime = parseInt(localStorage.getItem('lastOfflineNotification') || '0');
        const now = Date.now();
        
        if (now - lastNotificationTime > 60000) { // Показываем не чаще раза в минуту
          toast({
            title: "Сервер недоступен",
            description: "Приложение работает в офлайн режиме. Некоторые функции могут быть недоступны.",
            variant: "destructive",
          });
          localStorage.setItem('lastOfflineNotification', now.toString());
        }
        return;
      }

      // Получаем все данные параллельно и обрабатываем их безопасно
      const results = await Promise.allSettled([
        userLevelService.getUserLevel(),
        achievementsService.getUserAchievements(),
      ]);

      if (user) {
        const updatedUser = { ...user };
        
        // Проверяем результат получения уровня пользователя
        const levelResult = results[0];
        if (levelResult.status === 'fulfilled') {
          const levelData = levelResult.value;
          updatedUser.level = levelData.level;
          updatedUser.exp = levelData.exp;
          updatedUser.next_level_exp = levelData.next_level_exp;
        }
        
        // Проверяем результат получения достижений
        const achievementsResult = results[1];
        if (achievementsResult.status === 'fulfilled') {
          updatedUser.achievements = achievementsResult.value;
        }

        setUser(updatedUser);
      }
    } catch (error: any) {
      if (error?.message?.includes("User not found")) {
        // Если пользователь не найден, очищаем данные и выходим
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsAuthenticated(false);
      }
      
      console.error('Ошибка обновления данных пользователя:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось обновить данные пользователя",
        variant: "destructive",
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password);
      console.log('Login response:', response);
      if (response.token) {
        const userData: User = {
          id: response.user_id,
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          role: response.role || 'user',
          level: response.level || 1,
          exp: response.exp || 0,
          next_level_exp: 1000,
          achievements: [],
        };
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(userData));
        favoritesService.setUserId(userData.user_id);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error?.message || "Неверный email или пароль",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await apiRegister(username, email, password);
      console.log('Register response:', response);
      if (response.token) {
        const userData: User = {
          id: response.user_id,
          user_id: response.user_id,
          username: response.username,
          email: response.email,
          role: response.role || 'user',
          level: response.level || 1,
          exp: response.exp || 0,
          next_level_exp: 1000,
          achievements: [],
        };
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(userData));
        favoritesService.setUserId(userData.user_id);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error?.message || "Не удалось зарегистрироваться",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      favoritesService.setUserId(''); // Сбрасываем userId
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Ошибка выхода:', error);
      // Даже если запрос выхода не удался, очищаем локальные данные
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      // Этот эффект может срабатывать при изменении isAuthenticated из других мест.
      // Мы не хотим снова блокировать UI, поэтому оставляем реализацию пустой.
      return;
    };
    void checkAuth();
  }, [isAuthenticated, updateUserData]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
  isLoading,
    login,
    logout,
    register,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
