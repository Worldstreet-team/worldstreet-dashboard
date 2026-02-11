"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { SWAP_CHAINS, ChainKey, useSwap } from "@/app/context/swapContext";
import SwapStatusTracker from "./SwapStatusTracker";

interface SwapRecord {
  _id: string;
  txHash: string;
  fromChain: ChainKey;
  toChain: ChainKey;
  fromToken: {
    symbol: string;
    logoURI?: string;
    decimals: number;
  };
  toToken: {
    symbol: string;
    logoURI?: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  status: "PENDING" | "DONE" | "FAILED";
  createdAt: string;
  completedAt?: string;
}

function formatAmount(amount: string, decimals: number): string {
  const value = parseFloat(amount) / Math.pow(10, decimals);
  if (value < 0.001) return "<0.001";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute
  if (diff < 60000) return "Just now";
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  // Less than 24 hours
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

function getExplorerUrl(txHash: string, chain: ChainKey): string {
  if (chain === "ethereum") {
    return `https://etherscan.io/tx/${txHash}`;
  }
  return `https://solscan.io/tx/${txHash}`;
}

export function SwapHistory() {
  const { pollSwapStatus } = useSwap();
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // For tracking modal
  const [selectedSwap, setSelectedSwap] = useState<SwapRecord | null>(null);
  const [showTracker, setShowTracker] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/swap/history?limit=10", {
        credentials: "include",
      });
      const data = await res.json();
      
      if (data.success) {
        setSwaps(data.swaps);
      } else {
        setError(data.message || "Failed to load history");
      }
    } catch (err) {
      console.error("Failed to fetch swap history:", err);
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    
    // Refresh every 30s for pending swaps
    const interval = setInterval(() => {
      const hasPending = swaps.some(s => s.status === "PENDING");
      if (hasPending) {
        fetchHistory();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchHistory, swaps]);

  const handleViewDetails = (swap: SwapRecord) => {
    setSelectedSwap(swap);
    setShowTracker(true);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon icon="ph:clock-counter-clockwise" className="text-muted" width={20} />
          <h3 className="font-semibold text-dark dark:text-white">Recent Swaps</h3>
        </div>
        <div className="flex justify-center py-8">
          <Icon icon="ph:spinner" className="animate-spin text-primary" width={24} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon icon="ph:clock-counter-clockwise" className="text-muted" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Recent Swaps</h3>
          </div>
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-lg hover:bg-lightgray dark:hover:bg-darkborder transition-colors"
          >
            <Icon icon="ph:arrow-clockwise" className="text-muted" width={16} />
          </button>
        </div>

        {error ? (
          <div className="text-center py-6 text-error text-sm">{error}</div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="ph:swap" className="mx-auto text-muted mb-2" width={40} />
            <p className="text-muted">No swaps yet</p>
            <p className="text-xs text-muted mt-1">Your swap history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {swaps.map((swap) => (
              <div
                key={swap._id}
                className="flex items-center justify-between p-3 bg-lightgray dark:bg-darkborder rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {/* Token icons */}
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-black flex items-center justify-center overflow-hidden">
                      {swap.fromToken.logoURI ? (
                        <img src={swap.fromToken.logoURI} alt="" className="w-8 h-8" />
                      ) : (
                        <span className="text-xs font-bold text-muted">{swap.fromToken.symbol[0]}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-black border border-lightgray dark:border-darkborder flex items-center justify-center overflow-hidden">
                      {swap.toToken.logoURI ? (
                        <img src={swap.toToken.logoURI} alt="" className="w-5 h-5" />
                      ) : (
                        <span className="text-[8px] font-bold text-muted">{swap.toToken.symbol[0]}</span>
                      )}
                    </div>
                  </div>

                  {/* Swap details */}
                  <div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium text-dark dark:text-white">
                        {formatAmount(swap.fromAmount, swap.fromToken.decimals)} {swap.fromToken.symbol}
                      </span>
                      <Icon icon="ph:arrow-right" className="text-muted" width={12} />
                      <span className="font-medium text-dark dark:text-white">
                        {formatAmount(swap.toAmount, swap.toToken.decimals)} {swap.toToken.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>
                        {SWAP_CHAINS[swap.fromChain].name} → {SWAP_CHAINS[swap.toChain].name}
                      </span>
                      <span>•</span>
                      <span>{formatDate(swap.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Status & actions */}
                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    swap.status === "DONE"
                      ? "bg-success/10 text-success"
                      : swap.status === "FAILED"
                      ? "bg-error/10 text-error"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {swap.status === "PENDING" && (
                      <Icon icon="ph:spinner" className="inline animate-spin mr-1" width={10} />
                    )}
                    {swap.status}
                  </span>

                  {/* View details / Explorer link */}
                  {swap.status === "PENDING" ? (
                    <button
                      onClick={() => handleViewDetails(swap)}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-black transition-colors"
                      title="Track progress"
                    >
                      <Icon icon="ph:eye" className="text-muted" width={16} />
                    </button>
                  ) : (
                    <a
                      href={getExplorerUrl(swap.txHash, swap.fromChain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-black transition-colors"
                      title="View on explorer"
                    >
                      <Icon icon="ph:arrow-square-out" className="text-muted" width={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status tracker for pending swaps */}
      {selectedSwap && (
        <SwapStatusTracker
          isOpen={showTracker}
          onClose={() => {
            setShowTracker(false);
            setSelectedSwap(null);
          }}
          txHash={selectedSwap.txHash}
          quote={{
            id: selectedSwap._id,
            fromChain: selectedSwap.fromChain,
            toChain: selectedSwap.toChain,
            fromToken: selectedSwap.fromToken as any,
            toToken: selectedSwap.toToken as any,
            fromAmount: selectedSwap.fromAmount,
            toAmount: selectedSwap.toAmount,
            toAmountMin: selectedSwap.toAmount,
            estimatedDuration: 0,
            gasCosts: [],
            feeCosts: [],
          }}
          onSwapComplete={fetchHistory}
        />
      )}
    </>
  );
}

export default SwapHistory;
