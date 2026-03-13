import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface PregeneratedWallet {
  solanaAddress: string | null;
  privyUserId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch pregenerated Solana wallet from Privy server-side
 * This runs after Clerk authentication
 */
export function usePregeneratedWallet(): PregeneratedWallet {
  const { user, isLoaded } = useUser();
  const [wallet, setWallet] = useState<PregeneratedWallet>({
    solanaAddress: null,
    privyUserId: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const fetchWallet = async () => {
      if (!isLoaded || !user?.primaryEmailAddress?.emailAddress || !user?.id) {
        return;
      }

      setWallet(prev => ({ ...prev, loading: true, error: null }));

      try {
        const email = user.primaryEmailAddress.emailAddress;
        const clerkUserId = user.id;
        
        console.log('[usePregeneratedWallet] Fetching wallet for:', email, 'clerkUserId:', clerkUserId);

        const response = await fetch(
          `/api/privy/get-wallet?email=${encodeURIComponent(email)}&clerkUserId=${encodeURIComponent(clerkUserId)}`
        );
        
        const data = await response.json();

        if (response.ok && data.success) {
          console.log('[usePregeneratedWallet] Wallet found:', data.solanaAddress);
          setWallet({
            solanaAddress: data.solanaAddress,
            privyUserId: data.privyUserId,
            loading: false,
            error: null,
          });
        } else {
          // No wallet found - this is okay, it means wallet hasn't been pregenerated yet
          console.log('[usePregeneratedWallet] No pregenerated wallet found');
          setWallet({
            solanaAddress: null,
            privyUserId: null,
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        console.error('[usePregeneratedWallet] Error:', error);
        setWallet({
          solanaAddress: null,
          privyUserId: null,
          loading: false,
          error: error.message,
        });
      }
    };

    fetchWallet();
  }, [isLoaded, user]);

  return wallet;
}
