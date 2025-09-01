import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin } from '../utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user && parsed?.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  function saveSession(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(
      'admin_auth',
      JSON.stringify({ user: nextUser, token: nextToken })
    );
  }

  async function loginWithCredentials(email, password) {
    const { user: u, session } = await apiLogin(email, password);
    const access = session?.access_token;
    if (!access) throw new Error('Missing access token');
    saveSession(u, access);
    return { user: u, token: access };
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('admin_auth');
  }

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated: !!token, loginWithCredentials, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
