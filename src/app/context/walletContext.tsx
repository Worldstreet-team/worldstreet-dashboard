"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";

// Privy wallet addresses (5 chains)
export interface PrivyWalletAddresses {
  ethereum: string;
  solana: string;
  sui: string;
  ton: string;
  tron: string;
}

// Full Privy wallet data with IDs
export interface PrivyWallet {
  walletId: string;
  address: string;
  publicKey: string | null;
}

export interface PrivyWallets {
  ethereum: PrivyWallet;
  solana: PrivyWallet;
  sui: PrivyWallet;
  ton: PrivyWallet;
  tron: PrivyWallet;
}

interface WalletContextType {
  // State
  wallets: PrivyWallets | null;
  addresses: PrivyWalletAddresses | null;
  privyUserId: string | null;
  walletsGenerated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchWallets: () => Promise<void>;
  refreshWallets: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { user, isLoaded: clerkLoaded } = useUser();
  
  const [wallets, setWallets] = useState<PrivyWallets | null>(null);
  const [addresses, setAddresses] = useState<PrivyWalletAddresses | null>(null);
  const [privyUserId, setPrivyUserId] = useState<string | null>(null);
  const [walletsGenerated, setWalletsGenerated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Privy wallets from the API
  const fetchWallets = useCallback(async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const email = user.primaryEmailAddress.emailAddress;
      const clerkUserId = user.id;
      
      const response = await fetch(
        `/api/privy/get-wallet?email=${encodeURIComponent(email)}&clerkUserId=${encodeURIComponent(clerkUserId)}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }
      
      const data = await response.json();
      
      if (data.success && data.wallets) {
        setWallets(data.wallets);
        setPrivyUserId(data.privyUserId);
        
        // Extract addresses
        setAddresses({
          ethereum: data.wallets.ethereum?.address || "",
          solana: data.wallets.solana?.address || "",
          sui: data.wallets.sui?.address || "",
          ton: data.wallets.ton?.address || "",
          tron: data.wallets.tron?.address || "",
        });
        
        setWalletsGenerated(true);
      }
    } catch (err) {
      console.error("Error fetching Privy wallets:", err);
      setError(err instanceof Error ? err.message : "Failed to load wallets");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Force refresh wallets from Privy
  const refreshWallets = useCallback(async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const email = user.primaryEmailAddress.emailAddress;
      const clerkUserId = user.id;
      
      const response = await fetch("/api/privy/refresh-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, clerkUserId }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to refresh wallets");
      }
      
      const data = await response.json();
      
      if (data.success && data.wallets) {
        setWallets(data.wallets);
        setPrivyUserId(data.privyUserId);
        
        // Extract addresses
        setAddresses({
          ethereum: data.wallets.ethereum?.address || "",
          solana: data.wallets.solana?.address || "",
          sui: data.wallets.sui?.address || "",
          ton: data.wallets.ton?.address || "",
          tron: data.wallets.tron?.address || "",
        });
        
        setWalletsGenerated(true);
      }
    } catch (err) {
      console.error("Error refreshing Privy wallets:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh wallets");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch wallets when user is loaded
  useEffect(() => {
    if (clerkLoaded && user) {
      fetchWallets();
    } else if (clerkLoaded && !user) {
      setIsLoading(false);
    }
  }, [user, clerkLoaded, fetchWallets]);

  const value: WalletContextType = {
    wallets,
    addresses,
    privyUserId,
    walletsGenerated,
    isLoading,
    error,
    fetchWallets,
    refreshWallets,
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
