"use client";

import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { useSpotWithdraw } from "@/hooks/useSpotWithdraw";
import { useSpotBalances } from "@/hooks/useSpotBalances";

interface SpotWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawComplete?: () => void;
}

export default function SpotWithdrawModal({
  isOpen,
  onClose,
  onWithdrawComplete,
}: SpotWithdrawModalProps) {
  const { withdraw, loading, error, result, reset } = useSpotWithdraw();
  const { quoteBalance, loading: balanceLoading, refetch } = useSpotBalances("BTC", "USDC");

  const [amount, setAmount] = useState("");

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const canSubmit = parsedAmount >= 1 && parsedAmount <= quoteBalance && !loading;

  const handleWithdraw = async () => {
    if (!canSubmit) return;
    const outcome = await withdraw(parsedAmount);
    if (outcome.success) {
      refetch();
      onWithdrawComplete?.();
    }
  };

  const handleNewWithdraw = () => {
    reset();
    setAmount("");
  };

  const handleMax = () => {
    if (quoteBalance > 0) {
      setAmount(String(quoteBalance));
    }
  };

  const isTerminal = result !== null;
  const showForm = !loading && !isTerminal;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1e2329] rounded-2xl border border-[#2b3139] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3139]">
          <h2 className="text-base font-semibold text-white">
            Withdraw from Spot Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2b3139] transition-colors"
          >
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Result banner */}
          {isTerminal && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result?.success
                  ? "bg-[#0ecb81]/10"
                  : "bg-[#f6465d]/10"
              }`}
            >
              <Icon
                icon={
                  result?.success
                    ? "ph:check-circle-fill"
                    : "ph:x-circle"
                }
                width={18}
                className={
                  result?.success ? "text-[#0ecb81]" : "text-[#f6465d]"
                }
              />
              <span
                className={`text-sm ${
                  result?.success ? "text-[#0ecb81]" : "text-[#f6465d]"
                }`}
              >
                {result?.success
                  ? `Withdrawn ${result.amount} USDC to your Arbitrum wallet`
                  : result?.error || "Withdrawal failed"}
              </span>
            </div>
          )}

          {/* Processing state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Icon
                icon="ph:spinner"
                width={32}
                className="animate-spin text-[#f0b90b]"
              />
              <p className="text-sm text-[#848e9c]">
                Processing withdrawal...
              </p>
              <p className="text-xs text-[#4a5056] text-center">
                Moving USDC from Spot → Perps, then withdrawing to Arbitrum.
                This may take a moment.
              </p>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <>
              {/* Available balance */}
              <div className="bg-[#0b0e11] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848e9c]">
                    Available Spot USDC
                  </span>
                  <span className="text-sm text-white font-medium">
                    {balanceLoading ? (
                      <Icon
                        icon="ph:spinner"
                        width={14}
                        className="animate-spin inline"
                      />
                    ) : (
                      `${quoteBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} USDC`
                    )}
                  </span>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#848e9c]">
                    Amount (USDC)
                  </label>
                  <button
                    type="button"
                    onClick={handleMax}
                    disabled={quoteBalance <= 0}
                    className="text-xs text-[#f0b90b] hover:text-[#f0b90b]/80 disabled:text-[#4a5056] disabled:cursor-not-allowed"
                  >
                    Max
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min 1 USDC"
                    min={1}
                    className="w-full px-3 py-3 bg-[#0b0e11] border border-[#2b3139] rounded-lg text-sm text-white placeholder:text-[#4a5056] focus:outline-none focus:border-[#f0b90b]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">
                    USDC
                  </span>
                </div>
                {parsedAmount > 0 && parsedAmount < 1 && (
                  <p className="text-xs text-[#f6465d] mt-1">
                    Minimum withdrawal is 1 USDC
                  </p>
                )}
                {parsedAmount > quoteBalance && quoteBalance > 0 && (
                  <p className="text-xs text-[#f6465d] mt-1">
                    Exceeds available balance
                  </p>
                )}
              </div>

              {/* Destination info */}
              <div className="bg-[#0b0e11] rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-[#848e9c]">
                  <Icon icon="ph:info" width={14} />
                  <span>
                    USDC will be withdrawn to your Arbitrum trading wallet.
                  </span>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-[#f6465d]">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={isTerminal ? handleNewWithdraw : handleWithdraw}
                disabled={!isTerminal && !canSubmit}
                className="w-full py-3 bg-[#f0b90b] hover:bg-[#f0b90b]/90 disabled:bg-[#2b3139] disabled:text-[#4a5056] text-black font-semibold text-sm rounded-lg transition-colors"
              >
                {isTerminal ? "New Withdrawal" : "Withdraw"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
