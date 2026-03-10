"use client";

import React, { useState } from "react";
import { useTransferUsdt } from "@/hooks/useTransferUsdt";

interface TransferUsdtExampleProps {
  userId: string;
}

/**
 * Example component showing how to transfer USDT using the backend
 */
export function TransferUsdtExample({ userId }: TransferUsdtExampleProps) {
  const { transfer, loading, error, transactionHash, clearError } =
    useTransferUsdt();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [success, setSuccess] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccess(false);

    try {
      const txHash = await transfer(userId, recipient, parseFloat(amount), pin);
      setSuccess(true);
      setRecipient("");
      setAmount("");
      setPin("");
      console.log("Transfer successful:", txHash);
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Transfer USDT</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && transactionHash && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <p className="font-semibold">Transfer Successful!</p>
          <p className="text-sm break-all">Tx: {transactionHash}</p>
        </div>
      )}

      <form onSubmit={handleTransfer} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Amount (USDT)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your PIN"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !recipient || !amount || !pin}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Processing..." : "Transfer USDT"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Enter recipient Solana address</li>
          <li>Enter amount to transfer</li>
          <li>Enter your PIN for verification</li>
          <li>Backend decrypts your key and signs transaction</li>
          <li>Transaction is sent to Solana network</li>
        </ol>
      </div>
    </div>
  );
}
