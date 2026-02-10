"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useProfile } from "./profileContext";

// Wallet addresses only (no private keys in memory by default)
export interface WalletAddresses {
  solana: string;
  ethereum: string;
  bitcoin: string;
}

// Full wallet data with encrypted keys (only loaded when needed)
export interface WalletWithKeys {
  address: string;
  encryptedPrivateKey: string;
}

export interface WalletsWithKeys {
  solana: WalletWithKeys;
  ethereum: WalletWithKeys;
  bitcoin: WalletWithKeys;
}

interface WalletContextType {
  // State
  addresses: WalletAddresses | null;
  walletsGenerated: boolean;
  isLoading: boolean;
  error: string | null;
  showPinSetupModal: boolean;
  showPinEntryModal: boolean;
  
  // Actions
  fetchWalletStatus: () => Promise<void>;
  openPinSetupModal: () => void;
  closePinSetupModal: () => void;
  openPinEntryModal: () => void;
  closePinEntryModal: () => void;
  
  // Called after wallet setup completes
  onWalletSetupComplete: (addresses: WalletAddresses) => void;
  
  // Get encrypted keys (requires PIN verification)
  getEncryptedKeys: (pinHash: string) => Promise<WalletsWithKeys | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { profile, profileLoading } = useProfile();
  
  const [addresses, setAddresses] = useState<WalletAddresses | null>(null);
  const [walletsGenerated, setWalletsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [showPinEntryModal, setShowPinEntryModal] = useState(false);

  // Fetch wallet status from the API
  const fetchWalletStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/wallet/setup", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, don't show error
          setAddresses(null);
          setWalletsGenerated(false);
          return;
        }
        throw new Error("Failed to fetch wallet status");
      }
      
      const data = await response.json();
      
      if (data.success) {
        setWalletsGenerated(data.walletsGenerated);
        if (data.wallets) {
          // API returns { solana: { address: "..." }, ... }
          // Extract the address strings
          setAddresses({
            solana: data.wallets.solana?.address || "",
            ethereum: data.wallets.ethereum?.address || "",
            bitcoin: data.wallets.bitcoin?.address || "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching wallet status:", err);
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch wallet status when profile is loaded
  useEffect(() => {
    if (!profileLoading && profile) {
      fetchWalletStatus();
    } else if (!profileLoading && !profile) {
      setIsLoading(false);
    }
  }, [profile, profileLoading, fetchWalletStatus]);
  
  // Auto-show PIN setup modal if wallets not generated
  useEffect(() => {
    if (!isLoading && !walletsGenerated && profile) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        setShowPinSetupModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, walletsGenerated, profile]);

  // Modal controls
  const openPinSetupModal = useCallback(() => {
    setShowPinSetupModal(true);
  }, []);
  
  const closePinSetupModal = useCallback(() => {
    setShowPinSetupModal(false);
  }, []);
  
  const openPinEntryModal = useCallback(() => {
    setShowPinEntryModal(true);
  }, []);
  
  const closePinEntryModal = useCallback(() => {
    setShowPinEntryModal(false);
  }, []);

  // Called after wallet setup completes successfully
  const onWalletSetupComplete = useCallback((newAddresses: WalletAddresses) => {
    setAddresses(newAddresses);
    setWalletsGenerated(true);
    setShowPinSetupModal(false);
  }, []);

  // Get encrypted keys for signing (requires PIN verification)
  const getEncryptedKeys = useCallback(async (pinHash: string): Promise<WalletsWithKeys | null> => {
    try {
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinHash }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to retrieve keys");
      }
      
      const data = await response.json();
      return data.wallets;
    } catch (err) {
      console.error("Error getting encrypted keys:", err);
      throw err;
    }
  }, []);

  const value: WalletContextType = {
    addresses,
    walletsGenerated,
    isLoading,
    error,
    showPinSetupModal,
    showPinEntryModal,
    fetchWalletStatus,
    openPinSetupModal,
    closePinSetupModal,
    openPinEntryModal,
    closePinEntryModal,
    onWalletSetupComplete,
    getEncryptedKeys,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
