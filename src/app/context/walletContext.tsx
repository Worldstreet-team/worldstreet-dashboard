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

// Trading wallet info
export interface TradingWallet {
  walletId: string;
  address: string;
  chainType: string;
}

// Hyperliquid setup status
export interface HyperliquidStatus {
  initialized: boolean;
  tradingWallet?: TradingWallet;
  testnet?: boolean;
  error?: string;
  timestamp?: string;
}

interface WalletContextType {
  // State
  wallets: PrivyWallets | null;
  addresses: PrivyWalletAddresses | null;
  privyUserId: string | null;
  walletsGenerated: boolean;
  isLoading: boolean;
  error: string | null;

  // Trading wallet state
  tradingWallet: TradingWallet | null;
  hyperliquidStatus: HyperliquidStatus | null;

  // Actions
  fetchWallets: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  setupTradingWallet: () => Promise<any>;
  getTradingWalletStatus: () => Promise<any>;
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

  // Trading wallet state
  const [tradingWallet, setTradingWallet] = useState<TradingWallet | null>(null);
  const [hyperliquidStatus, setHyperliquidStatus] = useState<HyperliquidStatus | null>(null);

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

      const response = await fetch("/api/privy/pregenerate-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }

      const data = await response.json();

      if (data.success && data.wallets) {
        setWallets(data.wallets);
        setPrivyUserId(data.privyUserId);

        // Extract addresses
        setAddresses({
          ethereum: data.tradingWallet?.address || data.wallets.ethereum?.address || "",
          solana: data.wallets.solana?.address || "",
          sui: data.wallets.sui?.address || "",
          ton: data.wallets.ton?.address || "",
          tron: data.wallets.tron?.address || "",
        });

        // Ensure we explicitly use the trading wallet for Ethereum if it exists
        if (data.tradingWallet) {
          setTradingWallet(data.tradingWallet);
        }

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
          ethereum: data.tradingWallet?.address || data.wallets.ethereum?.address || "",
          solana: data.wallets.solana?.address || "",
          sui: data.wallets.sui?.address || "",
          ton: data.wallets.ton?.address || "",
          tron: data.wallets.tron?.address || "",
        });

        // Ensure we explicitly use the trading wallet for Ethereum if it exists
        if (data.tradingWallet) {
          setTradingWallet(data.tradingWallet);
        }

        setWalletsGenerated(true);
      }
    } catch (err) {
      console.error("Error refreshing Privy wallets:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh wallets");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Setup trading wallet and Hyperliquid integration
  const setupTradingWallet = useCallback(async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      setIsLoading(true);
      setError(null);

      const email = user.primaryEmailAddress.emailAddress;
      const clerkUserId = user.id;

      const response = await fetch("/api/privy/setup-trading-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, clerkUserId }),
      });

      if (!response.ok) {
        throw new Error("Failed to setup trading wallet");
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Update trading wallet state
        setTradingWallet(data.data.tradingWallet);
        setHyperliquidStatus(data.data.hyperliquid);

        // Refresh main wallets to get updated state
        await fetchWallets();

        return data.data;
      } else {
        throw new Error(data.error || "Failed to setup trading wallet");
      }
    } catch (err) {
      console.error("Error setting up trading wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to setup trading wallet");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchWallets]);

  // Get trading wallet status
  const getTradingWalletStatus = useCallback(async () => {
    if (!user?.primaryEmailAddress?.emailAddress || !user?.id) {
      return null;
    }

    try {
      const email = user.primaryEmailAddress.emailAddress;
      const clerkUserId = user.id;

      const response = await fetch(
        `/api/privy/setup-trading-wallet?email=${encodeURIComponent(email)}&clerkUserId=${encodeURIComponent(clerkUserId)}`
      );

      if (response.status === 404) {
        return { success: false, error: "Not initialized" };
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Handle Unified Wallet Mode
        if (data.data.isUnified || data.data.totalEthereumWallets === 1) {
          const mainWallet = data.data.mainWallet;
          if (mainWallet) {
            const tw = {
              walletId: mainWallet.id,
              address: mainWallet.address,
              chainType: mainWallet.chainType || 'ethereum',
            };
            setTradingWallet(tw);
            setHyperliquidStatus({
              initialized: true,
              tradingWallet: tw,
              testnet: false,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (data.data.totalEthereumWallets > 1) {
          // Fallback legacy support for multiple wallets
          const mainWalletId = data.data.mainWallet?.id || data.data.mainWalletIdFromDB;
          const tradingWallets = data.data.ethereumWallets.filter(
            (w: any) => w.id !== mainWalletId
          );

          if (tradingWallets.length > 0) {
            const tw = {
              walletId: tradingWallets[0].id,
              address: tradingWallets[0].address,
              chainType: tradingWallets[0].chainType,
            };
            setTradingWallet(tw);

            setHyperliquidStatus({
              initialized: true,
              tradingWallet: tw,
              testnet: false,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (data.data.tradingWallet) {
          setTradingWallet(data.data.tradingWallet);
        }
        return data.data;
      }
      return data;
    } catch (err) {
      console.error("Error getting trading wallet status:", err);
      return null;
    }
  }, [user]);

  // Fetch wallets when user is loaded
  useEffect(() => {
    if (clerkLoaded && user) {
      fetchWallets();
      getTradingWalletStatus(); // Also check trading wallet status
    } else if (clerkLoaded && !user) {
      setIsLoading(false);
    }
  }, [user, clerkLoaded, fetchWallets, getTradingWalletStatus]);

  const value: WalletContextType = {
    wallets,
    addresses,
    privyUserId,
    walletsGenerated,
    isLoading,
    error,
    tradingWallet,
    hyperliquidStatus,
    fetchWallets,
    refreshWallets,
    setupTradingWallet,
    getTradingWalletStatus,
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
