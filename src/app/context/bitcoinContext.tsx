"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as tinysecp from "tiny-secp256k1";
import { convertRawToDisplay, convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";

const ECPair = ECPairFactory(tinysecp);

interface BitcoinContextType {
  address: string | null;
  balance: number;
  loading: boolean;
  lastTx: string | null;
  setAddress: (address: string | null) => void;
  fetchBalance: (address?: string) => Promise<void>;
  sendTransaction: (
    encryptedKey: string,
    pin: string,
    recipient: string,
    amount: number
  ) => Promise<string>;
}

const BitcoinContext = createContext<BitcoinContextType | undefined>(undefined);

// Bitcoin API endpoints (mainnet)
const BTC_APIS = [
  "https://blockstream.info/api",
  "https://mempool.space/api",
];

export function BitcoinProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const fetchBalance = useCallback(
    async (addr?: string) => {
      const targetAddr = addr || address;
      if (!targetAddr) return;

      // Try multiple APIs for reliability
      for (const baseUrl of BTC_APIS) {
        try {
          const response = await fetch(`${baseUrl}/address/${targetAddr}`);
          if (response.ok) {
            const data = await response.json();
            // Balance in satoshis: (funded_txo_sum - spent_txo_sum)
            const satoshis =
              data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
            setBalance(parseFloat(convertRawToDisplay(satoshis, 8)));
            return;
          }
        } catch (e) {
          console.error(`BTC API ${baseUrl} failed:`, e);
          continue;
        }
      }

      console.error("Failed to fetch BTC balance from all providers");
    },
    [address]
  );

  useEffect(() => {
    if (address) {
      fetchBalance(address);
      const interval = setInterval(() => fetchBalance(address), 30000);
      return () => clearInterval(interval);
    }
  }, [address, fetchBalance]);

  const sendTransaction = useCallback(
    async (
      encryptedKey: string,
      pin: string,
      recipient: string,
      amount: number
    ): Promise<string> => {
      if (!address) throw new Error("No wallet address");

      setLoading(true);
      try {
        // Decrypt the private key with PIN
        const privateKeyWIF = decryptWithPIN(encryptedKey, pin);
        const keyPair = ECPair.fromWIF(privateKeyWIF, bitcoin.networks.bitcoin);

        // Fetch UTXOs
        let utxos: Array<{
          txid: string;
          vout: number;
          value: number;
        }> = [];

        for (const baseUrl of BTC_APIS) {
          try {
            const response = await fetch(`${baseUrl}/address/${address}/utxo`);
            if (response.ok) {
              utxos = await response.json();
              break;
            }
          } catch {
            continue;
          }
        }

        if (utxos.length === 0) {
          throw new Error("No UTXOs available");
        }

        // Build transaction
        const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
        const satoshisToSend = Number(convertDisplayToRaw(amount, 8));
        const feeRate = 10; // sats/vbyte (adjust as needed)
        const estimatedFee = 250 * feeRate; // Rough estimate

        let inputSum = 0;
        for (const utxo of utxos) {
          // Fetch raw tx for non-witness UTXO
          let rawTx: string | null = null;
          for (const baseUrl of BTC_APIS) {
            try {
              const txResponse = await fetch(
                `${baseUrl}/tx/${utxo.txid}/hex`
              );
              if (txResponse.ok) {
                rawTx = await txResponse.text();
                break;
              }
            } catch {
              continue;
            }
          }

          if (!rawTx) throw new Error("Could not fetch raw transaction");

          psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            nonWitnessUtxo: Buffer.from(rawTx, "hex"),
          });

          inputSum += utxo.value;
          if (inputSum >= satoshisToSend + estimatedFee) break;
        }

        if (inputSum < satoshisToSend + estimatedFee) {
          throw new Error("Insufficient funds");
        }

        // Output to recipient
        psbt.addOutput({
          address: recipient,
          value: BigInt(satoshisToSend),
        });

        // Change output
        const change = inputSum - satoshisToSend - estimatedFee;
        if (change > 546) {
          // Dust threshold
          psbt.addOutput({
            address: address,
            value: BigInt(change),
          });
        }

        // Sign all inputs
        psbt.signAllInputs(keyPair);
        psbt.finalizeAllInputs();

        const txHex = psbt.extractTransaction().toHex();

        // Broadcast transaction
        let txid: string | null = null;
        for (const baseUrl of BTC_APIS) {
          try {
            const broadcastResponse = await fetch(`${baseUrl}/tx`, {
              method: "POST",
              body: txHex,
            });
            if (broadcastResponse.ok) {
              txid = await broadcastResponse.text();
              break;
            }
          } catch {
            continue;
          }
        }

        if (!txid) {
          throw new Error("Failed to broadcast transaction");
        }

        setLastTx(txid);
        await fetchBalance(address);
        return txid;
      } finally {
        setLoading(false);
      }
    },
    [address, fetchBalance]
  );

  return (
    <BitcoinContext.Provider
      value={{
        address,
        balance,
        loading,
        lastTx,
        setAddress,
        fetchBalance,
        sendTransaction,
      }}
    >
      {children}
    </BitcoinContext.Provider>
  );
}

export function useBitcoin() {
  const context = useContext(BitcoinContext);
  if (context === undefined) {
    throw new Error("useBitcoin must be used within a BitcoinProvider");
  }
  return context;
}
