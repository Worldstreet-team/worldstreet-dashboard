"use client";

import React, { createContext, useContext, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
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
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { fetchProfile } = useProfile();

  // Map Clerk user to the AuthUser shape the rest of the app expects
  const user: AuthUser | null = useMemo(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return null;

    return {
      userId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      firstName: clerkUser.firstName || "",
      lastName: clerkUser.lastName || "",
      role: (clerkUser.publicMetadata?.role as string) || "user",
      isVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified",
      createdAt: clerkUser.createdAt?.toISOString() || "",
    };
  }, [isLoaded, isSignedIn, clerkUser]);

  // Auto-fetch profile when user signs in
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  const refreshUser = useCallback(async () => {
    if (clerkUser) {
      await clerkUser.reload();
      await fetchProfile();
    }
  }, [clerkUser, fetchProfile]);

  const logout = useCallback(async () => {
    await signOut({ redirectUrl: "https://www.worldstreetgold.com/login" });
  }, [signOut]);

  const loading = !isLoaded;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error: null,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
