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

interface TonContextType {
  address: string | null;
  balance: number;
  loading: boolean;
  fetchBalance: (address?: string) => Promise<void>;
  sendTransaction: (recipient: string, amount: number) => Promise<string>;
}

const TonContext = createContext<TonContextType | undefined>(undefined);

export function TonProvider({ children }: { children: ReactNode }) {
  const { addresses, wallets } = useWallet();
  const address = addresses?.ton || null;
  
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  console.log('[TonContext] Address from walletContext:', address);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      setLoading(true);
      try {
        console.log('[TonContext] Fetching balance for:', targetAddr);
        
        // Use the API endpoint instead of direct Privy client
        const response = await fetch(`/api/ton/balance?address=${encodeURIComponent(targetAddr)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch balance: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setBalance(data.balance);
          console.log('[TonContext] TON Balance:', data.balance);
        } else {
          throw new Error(data.error || 'Failed to fetch balance');
        }
      } catch (error) {
        console.error("TON fetchBalance error:", error);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const sendTransaction = useCallback(
    async (recipient: string, amount: number): Promise<string> => {
      setLoading(true);
      try {
        // Use Privy API to send TON
        const response = await fetch('/api/privy/wallet/ton/send', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipient,
            amount: amount.toString()
          })
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error('Server error - please check your authentication');
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Transaction failed');
        }

        const txHash = data.transactionHash;
        
        // Refresh balance after transaction
        if (address) {
          await fetchBalance(address);
        }
        
        return txHash;
      } catch (error) {
        console.error('TON send transaction error:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  useEffect(() => {
    if (address) {
      fetchBalance(address);
    }
  }, [address, fetchBalance]);

  return (
    <TonContext.Provider
      value={{
        address,
        balance,
        loading,
        fetchBalance,
        sendTransaction,
      }}
    >
      {children}
    </TonContext.Provider>
  );
}

export function useTon() {
  const context = useContext(TonContext);
  if (context === undefined) {
    throw new Error("useTon must be used within a TonProvider");
  }
  return context;
}
