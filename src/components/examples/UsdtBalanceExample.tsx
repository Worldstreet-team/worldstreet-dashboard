"use client";

import React from "react";
import { useUsdtBalance } from "@/hooks/useUsdtBalance";
import { useSolana } from "@/app/context/solanaContext";

/**
 * Example component showing two ways to get USDT balance:
 * 1. Using the useUsdtBalance hook (API route)
 * 2. Using the Solana context helper method (from existing token balances)
 */
export function UsdtBalanceExample() {
  // Method 1: Using the dedicated hook (fetches from API)
  const { balance: apiBalance, loading: apiLoading, error, refetch } = useUsdtBalance();

  // Method 2: Using the Solana context (from already loaded token balances)
  const { getUsdtBalance, loading: contextLoading } = useSolana();
  const contextBalance = getUsdtBalance();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">USDT Balance Examples</h2>

      {/* Method 1: API Hook */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Method 1: useUsdtBalance Hook (API)</h3>
        {apiLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : (
          <div>
            <p className="text-2xl font-bold">{apiBalance.toFixed(2)} USDT</p>
            <button
              onClick={refetch}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        )}
        <p className="text-sm text-gray-600 mt-2">
          Use this when you need USDT balance independently from other token data
        </p>
      </div>

      {/* Method 2: Context Helper */}
      <div className="border rounded p-4">
        <h3 className="font-semibold mb-2">Method 2: Solana Context Helper</h3>
        {contextLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div>
            <p className="text-2xl font-bold">{contextBalance.toFixed(2)} USDT</p>
          </div>
        )}
        <p className="text-sm text-gray-600 mt-2">
          Use this when you already have token balances loaded in Solana context
        </p>
      </div>

      {/* Usage Examples */}
      <div className="border rounded p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">Usage Examples</h3>
        <div className="space-y-2 text-sm">
          <div>
            <p className="font-mono bg-white p-2 rounded">
              {`// Method 1: Standalone hook`}
            </p>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`const { balance, loading, error, refetch } = useUsdtBalance();
// Auto-fetches on mount, refreshes every 30s
// Can manually refetch with refetch()`}
            </pre>
          </div>
          <div>
            <p className="font-mono bg-white p-2 rounded">
              {`// Method 2: From context`}
            </p>
            <pre className="bg-white p-2 rounded mt-1 overflow-x-auto">
{`const { getUsdtBalance } = useSolana();
const balance = getUsdtBalance();
// Returns balance from already loaded token data`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
