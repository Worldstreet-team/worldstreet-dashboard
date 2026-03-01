"use client";
import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

interface TreasuryWallet {
  _id: string;
  network: "solana" | "ethereum";
  publicKey: string;
  balance: number;
  usdtBalance: number;
  isActive: boolean;
  createdAt: string;
}

interface BalanceInfo {
  network: string;
  balance: number;
  usdtBalance: number;
  isActive: boolean;
}

export default function AdminTreasuryPage() {
  const [treasuries, setTreasuries] = useState<TreasuryWallet[]>([]);
  const [balances, setBalances] = useState<BalanceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchTreasuries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/treasury");
      if (res.ok) {
        const data = await res.json();
        setTreasuries(data.treasuries || []);
        setBalances(data.balances || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuries();
    const interval = setInterval(fetchTreasuries, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleGenerateTreasury = async (network: "solana" | "ethereum") => {
    setGenerating(network);
    try {
      const res = await fetch("/api/admin/treasury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchTreasuries();
        alert(`${network.toUpperCase()} treasury wallet generated successfully!`);
      } else {
        alert(data.error || "Failed to generate treasury");
      }
    } catch (err) {
      alert("Failed to generate treasury");
      console.error(err);
    } finally {
      setGenerating(null);
    }
  };

  const getNetworkColor = (network: string) => {
    if (network === "solana") return "text-[#9945FF] bg-[#9945FF]/10";
    if (network === "ethereum") return "text-[#627EEA] bg-[#627EEA]/10";
    return "text-muted bg-muted/10";
  };

  const activeTreasuryByNetwork = treasuries.reduce(
    (acc, t) => {
      acc[t.network] = t;
      return acc;
    },
    {} as Record<string, TreasuryWallet>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Treasury Wallets
        </h1>
        <p className="text-muted text-sm mt-1">
          Manage blockchain treasury wallets for deposits and withdrawals
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Solana Balance Card */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Solana Balance</p>
              <h3 className="text-2xl font-bold text-dark dark:text-white">
                {(activeTreasuryByNetwork.solana?.balance ?? 0).toFixed(4)} SOL
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#9945FF]/10 flex items-center justify-center">
              <Icon icon="mdi:ethereum" height={20} className="text-[#9945FF]" />
            </div>
          </div>
          <p className="text-sm text-muted">
            USDT: {(activeTreasuryByNetwork.solana?.usdtBalance ?? 0).toFixed(2)}
          </p>
        </div>

        {/* Ethereum Balance Card */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Ethereum Balance</p>
              <h3 className="text-2xl font-bold text-dark dark:text-white">
                {(activeTreasuryByNetwork.ethereum?.balance ?? 0).toFixed(6)} ETH
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#627EEA]/10 flex items-center justify-center">
              <Icon icon="mdi:ethereum" height={20} className="text-[#627EEA]" />
            </div>
          </div>
          <p className="text-sm text-muted">
            USDT: {(activeTreasuryByNetwork.ethereum?.usdtBalance ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder overflow-hidden">
        <div className="p-4 border-b border-border dark:border-darkborder flex items-center justify-between">
          <h2 className="font-semibold text-dark dark:text-white">All Wallets</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateTreasury("solana")}
              disabled={generating === "solana" || !!activeTreasuryByNetwork.solana}
              className="px-4 py-2 rounded-lg bg-[#9945FF] text-white text-xs font-medium hover:bg-[#9945FF]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {generating === "solana" && (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white" />
              )}
              Generate Solana Wallet
            </button>
            <button
              onClick={() => handleGenerateTreasury("ethereum")}
              disabled={generating === "ethereum" || !!activeTreasuryByNetwork.ethereum}
              className="px-4 py-2 rounded-lg bg-[#627EEA] text-white text-xs font-medium hover:bg-[#627EEA]/90 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {generating === "ethereum" && (
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white" />
              )}
              Generate Ethereum Wallet
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : treasuries.length === 0 ? (
          <div className="text-center py-16">
            <Icon icon="ph:empty-duotone" height={40} className="text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No wallets generated yet</p>
            <p className="text-muted text-xs mt-2">Click the buttons above to generate treasury wallets</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-darkborder bg-herobg/50 dark:bg-darkgray/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Network
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    USDT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {treasuries.map((wallet) => (
                  <tr
                    key={wallet._id}
                    className="border-b border-border dark:border-darkborder hover:bg-herobg/30 dark:hover:bg-darkgray/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium uppercase ${getNetworkColor(wallet.network)}`}>
                        {wallet.network}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-muted font-mono break-all max-w-xs block">
                        {wallet.publicKey}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      {wallet.network === "solana"
                        ? `${(wallet.balance ?? 0).toFixed(4)} SOL`
                        : `${(wallet.balance ?? 0).toFixed(6)} ETH`}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      ${(wallet.usdtBalance ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {wallet.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <div className="w-2 h-2 rounded-full bg-success" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-warning">
                          <div className="w-2 h-2 rounded-full bg-warning" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(wallet.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-info/10 border border-info rounded-xl p-4">
        <div className="flex gap-3">
          <Icon icon="tabler:exclamation-circle" height={20} className="text-info flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-info mb-1">Treasury Wallet Security</h3>
            <p className="text-xs text-info/80">
              Private keys are encrypted on the server. Withdrawals are automatically sent to active treasury wallets. Always verify transaction hashes on the blockchain explorer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
