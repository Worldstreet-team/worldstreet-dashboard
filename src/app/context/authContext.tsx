"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useProfile } from "@/app/context/profileContext";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

interface AuthContextState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextState>({
  user: null,
  loading: true,
  error: null,
  refreshUser: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchProfile } = useProfile();

  const verifyUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call our internal API route which reads cookies and talks to auth service
      const res = await fetch("/api/auth/verify", { credentials: "include" });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        // Auto-fetch (or auto-create) the dashboard profile
        await fetchProfile();
      } else if (data.refreshed && data.user) {
        // Token was refreshed successfully, user is still valid
        setUser(data.user);
        await fetchProfile();
      } else {
        // Verification failed, redirect to login
        setUser(null);
        window.location.href = "https://worldstreetgold.com/login";
      }
    } catch (err) {
      setUser(null);
      setError("Failed to verify identity");
      window.location.href = "https://worldstreetgold.com/login";
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser: verifyUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
