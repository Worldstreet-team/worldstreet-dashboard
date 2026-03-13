"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useWallet } from "./walletContext";

interface SuiContextType {
  address: string | null;
  balance: number;
  loading: boolean;
  fetchBalance: (address?: string) => Promise<void>;
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

const SuiContext = createContext<SuiContextType | undefined>(undefined);

export function SuiProvider({ children }: { children: ReactNode }) {
  const { addresses } = useWallet();
  const address = addresses?.sui || null;
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  console.log('[SuiContext] Address from walletContext:', address);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      setLoading(true);
      try {
        console.log('[SuiContext] Fetching balance for address:', targetAddr);
        
        const response = await fetch(`/api/sui/balance?address=${targetAddr}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch balance');
        }

        if (data.success) {
          setBalance(data.balance || 0);
          console.log('[SuiContext] Balance updated:', data.balance, 'SUI');
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (error) {
        console.error("Sui fetchBalance error:", error);
        setBalance(0); // Set to 0 on error
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const sendTransaction = useCallback(
    async (to: string, amount: number): Promise<string> => {
      try {
        console.log('[SuiContext] Sending transaction:', { to, amount });
        
        const response = await fetch('/api/privy/wallet/sui/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to,
            amount: amount.toString(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send transaction');
        }

        if (data.success && data.digest) {
          console.log('[SuiContext] Transaction successful:', data.digest);
          // Refresh balance after successful transaction
          setTimeout(() => fetchBalance(), 2000);
          return data.digest;
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (error: any) {
        console.error('[SuiContext] Send transaction error:', error);
        throw new Error(error.message || 'Failed to send SUI transaction');
      }
    },
    [fetchBalance]
  );

  useEffect(() => {
    if (address) {
      fetchBalance(address);
    }
  }, [address, fetchBalance]);

  return (
    <SuiContext.Provider
      value={{
        address,
        balance,
        loading,
        fetchBalance,
        sendTransaction,
      }}
    >
      {children}
    </SuiContext.Provider>
  );
}

export function useSui() {
  const context = useContext(SuiContext);
  if (context === undefined) {
    throw new Error("useSui must be used within a SuiProvider");
  }
  return context;
}
