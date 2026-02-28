"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useBitcoin } from "@/app/context/bitcoinContext";
import { useTron } from "@/app/context/tronContext";
import { useWallet } from "@/app/context/walletContext";
import { formatAmount, formatUSD } from "@/lib/wallet/amounts";
import { usePrices, getPrice } from "@/lib/wallet/usePrices";
import Footer from "@/components/dashboard/Footer";
import { ReceiveModal, SendModal, AddTokenModal } from "@/components/wallet";

// Asset type definition
interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  chain: "solana" | "ethereum" | "bitcoin" | "tron";
  address?: string; // Token address for SPL/ERC20/TRC20
  icon: string;
  isCustom?: boolean;
  customTokenId?: string;
}

// Chain icons
const CHAIN_ICONS: Record<string, string> = {
  solana: "https://cryptologos.cc/logos/solana-sol-logo.png",
  ethereum: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  bitcoin: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  tron: "https://cryptologos.cc/logos/tron-trx-logo.png",
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
};

const AssetsPage = () => {
  const { addresses, walletsGenerated, getEncryptedKeys } = useWallet();
  const { balance: solBalance, tokenBalances: solTokens, loading: solLoading, fetchBalance: fetchSolBalance, refreshCustomTokens: refreshSolCustom } = useSolana();
  const { balance: ethBalance, tokenBalances: ethTokens, loading: ethLoading, fetchBalance: fetchEthBalance, refreshCustomTokens: refreshEthCustom } = useEvm();
  const { balance: btcBalance, loading: btcLoading, fetchBalance: fetchBtcBalance } = useBitcoin();
  const { balance: trxBalance, tokenBalances: trxTokens, loading: trxLoading, fetchBalance: fetchTrxBalance, refreshCustomTokens: refreshTrxCustom } = useTron();
  const { prices } = usePrices();

  const [receiveModal, setReceiveModal] = useState<{ open: boolean; chain?: string; address?: string }>({ open: false });
  const [sendModal, setSendModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
  const [addTokenModal, setAddTokenModal] = useState(false);
  const [removingTokenId, setRemovingTokenId] = useState<string | null>(null);

  // Handle token added - refresh custom tokens lists
  const handleTokenAdded = useCallback(async () => {
    await Promise.all([refreshSolCustom(), refreshEthCustom(), refreshTrxCustom()]);
    // Re-fetch balances
    if (addresses?.solana) fetchSolBalance(addresses.solana);
    if (addresses?.ethereum) fetchEthBalance(addresses.ethereum);
    if (addresses?.tron) fetchTrxBalance(addresses.tron);
  }, [refreshSolCustom, refreshEthCustom, refreshTrxCustom, addresses, fetchSolBalance, fetchEthBalance, fetchTrxBalance]);

  // Handle remove custom token
  const handleRemoveToken = useCallback(async (tokenId: string) => {
    setRemovingTokenId(tokenId);
    try {
      const response = await fetch(`/api/tokens/custom?tokenId=${tokenId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await handleTokenAdded();
      }
    } catch (error) {
      console.error("Error removing token:", error);
    } finally {
      setRemovingTokenId(null);
    }
  }, [handleTokenAdded]);

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
        usdValue: solBalance * getPrice(prices, "SOL"),
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
        usdValue: token.amount * getPrice(prices, token.symbol),
        chain: "solana",
        address: token.mint,
        icon: token.logoURI || CHAIN_ICONS[token.symbol] || CHAIN_ICONS.solana,
        isCustom: token.isCustom,
        customTokenId: token.customTokenId,
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
        usdValue: ethBalance * getPrice(prices, "ETH"),
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
        usdValue: token.amount * getPrice(prices, token.symbol),
        chain: "ethereum",
        address: token.address,
        icon: token.logoURI || CHAIN_ICONS[token.symbol] || CHAIN_ICONS.ethereum,
        isCustom: token.isCustom,
        customTokenId: token.customTokenId,
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
        usdValue: btcBalance * getPrice(prices, "BTC"),
        chain: "bitcoin",
        icon: CHAIN_ICONS.bitcoin,
      });
    }

    // Tron native
    if (addresses?.tron) {
      list.push({
        id: "trx-native",
        symbol: "TRX",
        name: "Tron",
        balance: trxBalance,
        balanceRaw: Math.floor(trxBalance * 1e6).toString(),
        decimals: 6,
        usdValue: trxBalance * getPrice(prices, "TRX"),
        chain: "tron",
        icon: CHAIN_ICONS.tron,
      });
    }

    // TRC20 tokens
    trxTokens.forEach((token) => {
      list.push({
        id: `trx-${token.address}`,
        symbol: token.symbol,
        name: token.name || token.symbol,
        balance: token.amount,
        balanceRaw: Math.floor(token.amount * Math.pow(10, token.decimals)).toString(),
        decimals: token.decimals,
        usdValue: token.amount * getPrice(prices, token.symbol),
        chain: "tron",
        address: token.address,
        icon: CHAIN_ICONS[token.symbol] || CHAIN_ICONS.tron,
        isCustom: token.isCustom,
        customTokenId: token.customTokenId,
      });
    });

    return list;
  }, [addresses, solBalance, solTokens, ethBalance, ethTokens, btcBalance, trxBalance, trxTokens, prices]);

  // Total portfolio value
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + asset.usdValue, 0);
  }, [assets]);

  const isLoading = solLoading || ethLoading || btcLoading || trxLoading;

  const handleRefresh = useCallback(() => {
    if (addresses?.solana) fetchSolBalance(addresses.solana);
    if (addresses?.ethereum) fetchEthBalance(addresses.ethereum);
    if (addresses?.bitcoin) fetchBtcBalance(addresses.bitcoin);
    if (addresses?.tron) fetchTrxBalance(addresses.tron);
  }, [addresses, fetchSolBalance, fetchEthBalance, fetchBtcBalance, fetchTrxBalance]);

  const getChainAddress = (chain: string) => {
    switch (chain) {
      case "solana":
        return addresses?.solana || "";
      case "ethereum":
        return addresses?.ethereum || "";
      case "bitcoin":
        return addresses?.bitcoin || "";
      case "tron":
        return addresses?.tron || "";
      default:
        return "";
    }
  };

  if (!walletsGenerated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">No Wallet Setup</h2>
          <p className="text-muted mb-4">Create a wallet to view your crypto assets</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-5 lg:gap-6">
        {/* Portfolio Header */}
        <div className="col-span-12">
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted text-sm mb-1">Total Balance</p>
                <h1 className="text-3xl font-bold text-dark dark:text-white">{formatUSD(totalValue)}</h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <svg
                  className={`w-5 h-5 text-muted ${isLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 flex-wrap">
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
                className="flex items-center gap-2 px-4 py-2 bg-muted/30 dark:bg-white/5 text-dark dark:text-white rounded-lg hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Send
              </button>
              <button
                onClick={() => setAddTokenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Token
              </button>
            </div>
          </div>
        </div>

        {/* Chain Addresses */}
        <div className="col-span-12">
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Wallet Addresses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Solana Address */}
              {addresses?.solana && (
                <div
                  onClick={() => setReceiveModal({ open: true, chain: "solana", address: addresses.solana })}
                  className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <img src={CHAIN_ICONS.solana} alt="SOL" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark dark:text-white">Solana</p>
                    <p className="text-xs text-muted truncate">{addresses.solana}</p>
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
                  className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <img src={CHAIN_ICONS.ethereum} alt="ETH" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark dark:text-white">Ethereum</p>
                    <p className="text-xs text-muted truncate">{addresses.ethereum}</p>
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
                  className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <img src={CHAIN_ICONS.bitcoin} alt="BTC" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark dark:text-white">Bitcoin</p>
                    <p className="text-xs text-muted truncate">{addresses.bitcoin}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Tron Address */}
              {addresses?.tron && (
                <div
                  onClick={() => setReceiveModal({ open: true, chain: "tron", address: addresses.tron })}
                  className="flex items-center gap-3 p-3 bg-muted/30 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <img src={CHAIN_ICONS.tron} alt="TRX" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark dark:text-white">Tron</p>
                    <p className="text-xs text-muted truncate">{addresses.tron}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assets List and Spot Trading */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Assets</h2>
              <button
                onClick={() => setAddTokenModal(true)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Token
              </button>
            </div>

            {isLoading && assets.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted">No assets found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 bg-muted/30 dark:bg-white/5 rounded-xl hover:bg-muted/40 dark:hover:bg-white/10 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => setSendModal({ open: true, asset })}
                    >
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
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-black"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-dark dark:text-white">{asset.symbol}</p>
                          {asset.isCustom && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">Custom</span>
                          )}
                        </div>
                        <p className="text-sm text-muted">{asset.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="text-right cursor-pointer"
                        onClick={() => setSendModal({ open: true, asset })}
                      >
                        <p className="font-medium text-dark dark:text-white">{formatAmount(asset.balance)}</p>
                        <p className="text-sm text-muted">{formatUSD(asset.usdValue)}</p>
                      </div>
                      {/* Remove button for custom tokens */}
                      {asset.isCustom && asset.customTokenId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveToken(asset.customTokenId!);
                          }}
                          disabled={removingTokenId === asset.customTokenId}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                          title="Remove token"
                        >
                          {removingTokenId === asset.customTokenId ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Spot Trading Interface
        <div className="col-span-12 lg:col-span-4">
          <SpotInterface />
        </div> */}

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

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={addTokenModal}
        onClose={() => setAddTokenModal(false)}
        onTokenAdded={handleTokenAdded}
      />
    </>
  );
};

export default AssetsPage;
