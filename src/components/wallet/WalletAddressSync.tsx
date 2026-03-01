"use client";

import { useEffect } from "react";
import { useWallet } from "@/app/context/walletContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useBitcoin } from "@/app/context/bitcoinContext";
import { useTron } from "@/app/context/tronContext";

/**
 * Synchronizes wallet addresses from WalletContext to individual chain contexts.
 * This component should be rendered inside all wallet providers.
 */
export function WalletAddressSync() {
  const { addresses, walletsGenerated } = useWallet();
  const { setAddress: setSolanaAddress } = useSolana();
  const { setAddress: setEvmAddress } = useEvm();
  const { setAddress: setBitcoinAddress } = useBitcoin();
  const { setAddress: setTronAddress } = useTron();

  useEffect(() => {
    if (walletsGenerated && addresses) {
      if (addresses.solana) {
        setSolanaAddress(addresses.solana);
      }
      if (addresses.ethereum) {
        setEvmAddress(addresses.ethereum);
      }
      if (addresses.bitcoin) {
        setBitcoinAddress(addresses.bitcoin);
      }
      if (addresses.tron) {
        setTronAddress(addresses.tron);
      }
    } else {
      // Clear addresses if wallets not generated
      setSolanaAddress(null);
      setEvmAddress(null);
      setBitcoinAddress(null);
      setTronAddress(null);
    }
  }, [addresses, walletsGenerated, setSolanaAddress, setEvmAddress, setBitcoinAddress, setTronAddress]);

  // This component only syncs state, renders nothing
  return null;
}

export default WalletAddressSync;
