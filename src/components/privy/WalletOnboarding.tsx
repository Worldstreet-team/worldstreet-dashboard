"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export function WalletOnboarding() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<{
    ethereum?: string;
    solana?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createWallets() {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      const response = await fetch("/api/privy/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create wallets");
      }

      setWallets(data.wallets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (wallets) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Your Wallets</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Ethereum Address
            </label>
            <p className="mt-1 text-sm text-gray-900 font-mono">
              {wallets.ethereum}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Solana Address
            </label>
            <p className="mt-1 text-sm text-gray-900 font-mono">
              {wallets.solana}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Create Your Wallets</h2>
      <p className="text-gray-600 mb-4">
        Create self-custodial Ethereum and Solana wallets secured by your
        account.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={createWallets}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Wallets"}
      </button>
    </div>
  );
}
