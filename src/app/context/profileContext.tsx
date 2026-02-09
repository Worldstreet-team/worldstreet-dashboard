"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ── Profile type (mirrors the Mongoose schema, plain object) ───────────────

export interface WalletData {
  address: string;
  encryptedPrivateKey: string;
}

export interface Wallets {
  solana?: WalletData;
  ethereum?: WalletData;
  bitcoin?: WalletData;
}

export interface DashboardProfile {
  _id: string;
  authUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;

  // Wallet system (self-custodial)
  wallets: Wallets;
  walletPinHash: string;
  walletsGenerated: boolean;

  preferredCurrency: string;
  watchlist: string[];
  defaultChartInterval: string;
  notifications: {
    priceAlerts: boolean;
    tradeConfirmations: boolean;
    marketNews: boolean;
    email: boolean;
    push: boolean;
  };
  theme: "light" | "dark" | "system";
  dashboardLayout: "vertical" | "horizontal";
  createdAt: string;
  updatedAt: string;
}

// ── Context shape ──────────────────────────────────────────────────────────

interface ProfileContextState {
  profile: DashboardProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<DashboardProfile>) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextState>({
  profile: null,
  profileLoading: false,
  profileError: null,
  fetchProfile: async () => {},
  updateProfile: async () => false,
});

export const useProfile = () => useContext(ProfileContext);

// ── Provider ───────────────────────────────────────────────────────────────

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  /**
   * Fetch (or auto-create) the dashboard profile for the current auth user.
   * Called once after auth verification succeeds.
   */
  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfileError(null);

      const res = await fetch("/api/profile", { credentials: "include" });
      const data = await res.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
      } else {
        setProfileError(data.message || "Failed to load profile");
      }
    } catch {
      setProfileError("Network error loading profile");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  /**
   * Update specific profile fields. Returns true on success.
   */
  const updateProfile = useCallback(
    async (updates: Partial<DashboardProfile>): Promise<boolean> => {
      try {
        setProfileError(null);

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updates),
        });

        const data = await res.json();

        if (data.success && data.profile) {
          setProfile(data.profile);
          return true;
        } else {
          setProfileError(data.message || "Failed to update profile");
          return false;
        }
      } catch {
        setProfileError("Network error updating profile");
        return false;
      }
    },
    []
  );

  return (
    <ProfileContext.Provider
      value={{
        profile,
        profileLoading,
        profileError,
        fetchProfile,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
