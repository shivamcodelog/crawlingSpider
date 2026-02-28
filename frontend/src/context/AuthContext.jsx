import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("msp_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await client.get("/auth/me");
      if (data.success) {
        setUser(data.data);
      } else {
        setUser(null);
        localStorage.removeItem("msp_token");
      }
    } catch {
      setUser(null);
      localStorage.removeItem("msp_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = (token) => {
    localStorage.setItem("msp_token", token);
    fetchUser();
  };

  const logout = async () => {
    try {
      await client.post("/auth/logout");
    } catch {
      // ignore
    }
    localStorage.removeItem("msp_token");
    setUser(null);
  };

  const refreshUser = () => fetchUser();

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Hook to extract token from URL query params after OAuth redirect.
 */
export function useTokenFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      login(token);
      // Remove token from URL
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, login, setSearchParams]);
}
