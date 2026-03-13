"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

/**
 * Component that pregenerates Privy wallet on first Clerk login
 * Place this in your dashboard layout
 */
export function WalletPregenerator() {
  const { user, isLoaded } = useUser();
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const pregenerateWallet = async () => {
      if (!isLoaded || !user || attempted) return;

      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) return;

      setAttempted(true);

      try {
        console.log('[WalletPregenerator] Checking/creating wallet for:', email);

        // First check if wallet already exists
        const checkResponse = await fetch(
          `/api/privy/get-wallet?email=${encodeURIComponent(email)}`
        );
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.success) {
            console.log('[WalletPregenerator] Wallet already exists:', checkData.solanaAddress);
            return;
          }
        }

        // Wallet doesn't exist, create it
        console.log('[WalletPregenerator] Creating new wallet...');
        const createResponse = await fetch('/api/privy/pregenerate-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkUserId: user.id,
            email,
          }),
        });

        const createData = await createResponse.json();

        if (createResponse.ok && createData.success) {
          console.log('[WalletPregenerator] Wallet created:', createData.solanaAddress);
        } else {
          console.error('[WalletPregenerator] Failed to create wallet:', createData.error);
        }
      } catch (error) {
        console.error('[WalletPregenerator] Error:', error);
      }
    };

    pregenerateWallet();
  }, [isLoaded, user, attempted]);

  return null; // This component doesn't render anything
}
