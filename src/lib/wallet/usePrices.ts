"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  image: string;
}

export interface GlobalStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
}

interface PriceData {
  prices: Record<string, number>;
  coins: CoinData[];
  globalStats: GlobalStats;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CLIENT_REFRESH_INTERVAL = 60_000; // 60 seconds

const DEFAULT_GLOBAL_STATS: GlobalStats = {
  totalMarketCap: 0,
  totalVolume: 0,
  btcDominance: 0,
  marketCapChange24h: 0,
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function usePrices(): PriceData {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>(DEFAULT_GLOBAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      const data = await res.json();

      if (data.prices) {
        setPrices(data.prices);
        setLastUpdated(Date.now());
        setError(null);
      }

      if (data.coins) {
        setCoins(data.coins);
      }

      if (data.globalStats) {
        setGlobalStats(data.globalStats);
      }

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Failed to fetch prices:", err);
      setError("Failed to fetch prices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();

    intervalRef.current = setInterval(fetchPrices, CLIENT_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  return { prices, coins, globalStats, loading, error, lastUpdated, refresh: fetchPrices };
}

// ── Utility functions ──────────────────────────────────────────────────────

/**
 * Get the USD price for a given token symbol.
 * Returns 0 if the price is not available.
 */
export function getPrice(prices: Record<string, number>, symbol: string): number {
  return prices[symbol] ?? 0;
}

/**
 * Get the 24h change percentage for a given token symbol.
 */
export function getChange24h(coins: CoinData[], symbol: string): number {
  const coin = coins.find(c => c.symbol === symbol);
  return coin?.change24h ?? 0;
}

/**
 * Calculate P&L for a portfolio based on 24h price changes.
 * @param holdings - Map of symbol to amount held
 * @param prices - Current prices
 * @param coins - Coin data with 24h changes
 * @returns P&L in USD
 */
export function calculateDailyPnL(
  holdings: Record<string, number>,
  prices: Record<string, number>,
  coins: CoinData[]
): number {
  let pnl = 0;

  for (const [symbol, amount] of Object.entries(holdings)) {
    const price = prices[symbol] ?? 0;
    const change = getChange24h(coins, symbol);
    
    if (price && amount) {
      // Current value
      const currentValue = amount * price;
      // Value 24h ago = currentValue / (1 + change/100)
      const previousValue = currentValue / (1 + change / 100);
      // P&L = current - previous
      pnl += currentValue - previousValue;
    }
  }

  return pnl;
}

/**
 * Format large numbers for display (e.g., $2.1T, $150B, $50M)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
