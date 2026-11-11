import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  authApi,
  clearAuthStorage,
  getCachedUser,
  getStoredToken,
  setCachedUser,
  setStoredToken,
  userApi,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getCachedUser());
  const [isLoadingAuth, setIsLoadingAuth] = useState(Boolean(getStoredToken()));
  const [refreshTick, setRefreshTick] = useState(0);

  const triggerDataRefresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoadingAuth(false);
      return null;
    }
    try {
      const profile = await userApi.getMe();
      setUser(profile);
      setCachedUser(profile);
      return profile;
    } catch (err) {
      if (err?.response?.status === 401) {
        clearAuthStorage();
        setToken(null);
        setUser(null);
      }
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setIsLoadingAuth(false);
    }
  }, [token, refreshProfile]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthStorage();
      setToken(null);
      setUser(null);
    };
    window.addEventListener('welltrack:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('welltrack:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    setStoredToken(res.access_token);
    setToken(res.access_token);
    const profile = await userApi.getMe();
    setUser(profile);
    setCachedUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (payload) => {
    const createdUser = await authApi.register(payload);
    return createdUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await authApi.logout();
      }
    } catch {
      // Tetap hapus token meskipun server gagal dihubungi (NFR-07)
    } finally {
      clearAuthStorage();
      setToken(null);
      setUser(null);
    }
  }, []);

  const syncUserStats = useCallback((gamification) => {
    if (!gamification) return;
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        total_points: gamification.total_points ?? prev.total_points,
        current_streak: gamification.current_streak ?? prev.current_streak,
        longest_streak: gamification.longest_streak ?? prev.longest_streak,
      };
      setCachedUser(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: Boolean(token),
        isLoadingAuth,
        login,
        register,
        logout,
        refreshProfile,
        syncUserStats,
        refreshTick,
        triggerDataRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}

