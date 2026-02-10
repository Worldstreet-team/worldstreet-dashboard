"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PriceData {
  prices: Record<string, number>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => void;
}

const CLIENT_REFRESH_INTERVAL = 60_000; // 60 seconds

export function usePrices(): PriceData {
  const [prices, setPrices] = useState<Record<string, number>>({});
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

  return { prices, loading, error, lastUpdated, refresh: fetchPrices };
}

/**
 * Get the USD price for a given token symbol.
 * Returns 0 if the price is not available.
 */
export function getPrice(prices: Record<string, number>, symbol: string): number {
  return prices[symbol] ?? 0;
}
