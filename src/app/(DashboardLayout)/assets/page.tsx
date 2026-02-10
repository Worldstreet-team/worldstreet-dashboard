"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useBitcoin } from "@/app/context/bitcoinContext";
import { useWallet } from "@/app/context/walletContext";
import { formatAmount, formatUSD } from "@/lib/wallet/amounts";
import Footer from "@/components/dashboard/Footer";
import { ReceiveModal, SendModal } from "@/components/wallet";

// Asset type definition
interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  chain: "solana" | "ethereum" | "bitcoin";
  address?: string; // Token address for SPL/ERC20
  icon: string;
}

// Placeholder prices (in production, fetch from API)
const PRICES: Record<string, number> = {
  SOL: 150,
  ETH: 3500,
  BTC: 65000,
  USDT: 1,
  USDC: 1,
};

// Chain icons
const CHAIN_ICONS: Record<string, string> = {
  solana: "https://cryptologos.cc/logos/solana-sol-logo.png",
  ethereum: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  bitcoin: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
};

const AssetsPage = () => {
  const { addresses, walletsGenerated, getEncryptedKeys } = useWallet();
  const { balance: solBalance, tokenBalances: solTokens, loading: solLoading, fetchBalance: fetchSolBalance } = useSolana();
  const { balance: ethBalance, tokenBalances: ethTokens, loading: ethLoading, fetchBalance: fetchEthBalance } = useEvm();
  const { balance: btcBalance, loading: btcLoading, fetchBalance: fetchBtcBalance } = useBitcoin();

  const [receiveModal, setReceiveModal] = useState<{ open: boolean; chain?: string; address?: string }>({ open: false });
  const [sendModal, setSendModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });

  // Combine all assets into unified list
  const assets = useMemo<Asset[]>(() => {
    const list: Asset[] = [];

    // Solana native
    if (addresses?.solana) {
      list.push({
        id: "sol-native",
        symbol: "SOL",
        name: "Solana",
        balance: solBalance,
        balanceRaw: Math.floor(solBalance * 1e9).toString(),
        decimals: 9,
        usdValue: solBalance * (PRICES.SOL || 0),
        chain: "solana",
        icon: CHAIN_ICONS.solana,
      });
    }

    // Solana SPL tokens
    solTokens.forEach((token) => {
      list.push({
        id: `sol-${token.mint}`,
        symbol: token.symbol || "SPL",
        name: token.name || "SPL Token",
        balance: token.amount,
        balanceRaw: String(Math.floor(token.amount * Math.pow(10, token.decimals))),
        decimals: token.decimals,
        usdValue: token.amount * (PRICES[token.symbol] || 0),
        chain: "solana",
        address: token.mint,
        icon: CHAIN_ICONS[token.symbol] || CHAIN_ICONS.solana,
      });
    });

    // Ethereum native
    if (addresses?.ethereum) {
      list.push({
        id: "eth-native",
        symbol: "ETH",
        name: "Ethereum",
        balance: ethBalance,
        balanceRaw: Math.floor(ethBalance * 1e18).toString(),
        decimals: 18,
        usdValue: ethBalance * (PRICES.ETH || 0),
        chain: "ethereum",
        icon: CHAIN_ICONS.ethereum,
      });
    }

    // ERC20 tokens
    ethTokens.forEach((token) => {
      list.push({
        id: `eth-${token.address}`,
        symbol: token.symbol,
        name: token.name || token.symbol,
        balance: token.amount,
        balanceRaw: Math.floor(token.amount * Math.pow(10, token.decimals)).toString(),
        decimals: token.decimals,
        usdValue: token.amount * (PRICES[token.symbol] || 0),
        chain: "ethereum",
        address: token.address,
        icon: CHAIN_ICONS[token.symbol] || CHAIN_ICONS.ethereum,
      });
    });

    // Bitcoin native
    if (addresses?.bitcoin) {
      list.push({
        id: "btc-native",
        symbol: "BTC",
        name: "Bitcoin",
        balance: btcBalance,
        balanceRaw: Math.floor(btcBalance * 1e8).toString(),
        decimals: 8,
        usdValue: btcBalance * (PRICES.BTC || 0),
        chain: "bitcoin",
        icon: CHAIN_ICONS.bitcoin,
      });
    }

    return list;
  }, [addresses, solBalance, solTokens, ethBalance, ethTokens, btcBalance]);

  // Total portfolio value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.usdValue, 0);
  }, [assets]);

  const isLoading = solLoading || ethLoading || btcLoading;

  const handleRefresh = useCallback(() => {
    if (addresses?.solana) fetchSolBalance(addresses.solana);
    if (addresses?.ethereum) fetchEthBalance(addresses.ethereum);
    if (addresses?.bitcoin) fetchBtcBalance(addresses.bitcoin);
  }, [addresses, fetchSolBalance, fetchEthBalance, fetchBtcBalance]);

  const getChainAddress = (chain: string) => {
    switch (chain) {
      case "solana":
        return addresses?.solana || "";
      case "ethereum":
        return addresses?.ethereum || "";
      case "bitcoin":
        return addresses?.bitcoin || "";
      default:
        return "";
    }
  };

  if (!walletsGenerated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-dark-surface flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Wallet Setup</h2>
          <p className="text-gray-400 mb-4">Create a wallet to view your crypto assets</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-5 lg:gap-6">
        {/* Portfolio Header */}
        <div className="col-span-12">
          <div className="bg-dark-surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Balance</p>
                <h1 className="text-3xl font-bold text-white">{formatUSD(totalValue)}</h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-5 h-5 text-gray-400 ${isLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setReceiveModal({ open: true, chain: "ethereum", address: addresses?.ethereum })}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Receive
              </button>
              <button
                onClick={() => assets.length > 0 && setSendModal({ open: true, asset: assets[0] })}
                className="flex items-center gap-2 px-4 py-2 bg-dark-card text-white rounded-lg hover:bg-dark-border transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Chain Addresses */}
        <div className="col-span-12">
          <div className="bg-dark-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Wallet Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Solana Address */}
              {addresses?.solana && (
                <div
                  onClick={() => setReceiveModal({ open: true, chain: "solana", address: addresses.solana })}
                  className="flex items-center gap-3 p-3 bg-dark-card rounded-xl cursor-pointer hover:bg-dark-border transition-colors"
                >
                  <img src={CHAIN_ICONS.solana} alt="SOL" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Solana</p>
                    <p className="text-xs text-gray-400 truncate">{addresses.solana}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Ethereum Address */}
              {addresses?.ethereum && (
                <div
                  onClick={() => setReceiveModal({ open: true, chain: "ethereum", address: addresses.ethereum })}
                  className="flex items-center gap-3 p-3 bg-dark-card rounded-xl cursor-pointer hover:bg-dark-border transition-colors"
                >
                  <img src={CHAIN_ICONS.ethereum} alt="ETH" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Ethereum</p>
                    <p className="text-xs text-gray-400 truncate">{addresses.ethereum}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Bitcoin Address */}
              {addresses?.bitcoin && (
                <div
                  onClick={() => setReceiveModal({ open: true, chain: "bitcoin", address: addresses.bitcoin })}
                  className="flex items-center gap-3 p-3 bg-dark-card rounded-xl cursor-pointer hover:bg-dark-border transition-colors"
                >
                  <img src={CHAIN_ICONS.bitcoin} alt="BTC" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Bitcoin</p>
                    <p className="text-xs text-gray-400 truncate">{addresses.bitcoin}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assets List */}
        <div className="col-span-12">
          <div className="bg-dark-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Assets</h2>
            
            {isLoading && assets.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No assets found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 bg-dark-card rounded-xl hover:bg-dark-border transition-colors cursor-pointer"
                    onClick={() => setSendModal({ open: true, asset })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={asset.icon}
                          alt={asset.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = CHAIN_ICONS[asset.chain];
                          }}
                        />
                        {/* Chain badge */}
                        <img
                          src={CHAIN_ICONS[asset.chain]}
                          alt={asset.chain}
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-card"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white">{asset.symbol}</p>
                        <p className="text-sm text-gray-400">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{formatAmount(asset.balance)}</p>
                      <p className="text-sm text-gray-400">{formatUSD(asset.usdValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12">
          <Footer />
        </div>
      </div>

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={receiveModal.open}
        onClose={() => setReceiveModal({ open: false })}
        chain={receiveModal.chain || ""}
        address={receiveModal.address || ""}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={sendModal.open}
        onClose={() => setSendModal({ open: false })}
        asset={sendModal.asset}
      />
    </>
  );
};

export default AssetsPage;
