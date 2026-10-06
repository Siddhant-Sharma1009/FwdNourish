import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types/auth";
import { getMe, login as loginApi } from "../services/authApi";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = localStorage.getItem("foodwaste_access_token");
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const current = await getMe();
      setUser(current);
    } catch {
      localStorage.removeItem("foodwaste_access_token");
      setUser(null);
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await loginApi({ email, password });
    localStorage.setItem("foodwaste_access_token", result.access_token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem("foodwaste_access_token");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
