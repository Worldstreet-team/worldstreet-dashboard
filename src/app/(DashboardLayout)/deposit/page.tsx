"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/app/context/walletContext";
import Footer from "@/components/dashboard/Footer";

// ── Types ──────────────────────────────────────────────────────────────────

interface Rate {
  marketRate: number;
  buyRate: number;
  sellRate: number;
  symbol: string;
}

interface DepositRecord {
  _id: string;
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  merchantTransactionReference: string;
  status: string;
  txHash?: string;
  deliveryError?: string;
  network?: "solana" | "ethereum";
  createdAt: string;
  completedAt?: string;
}

type FiatCurrency = "NGN";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Pending" },
    awaiting_verification: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Awaiting Verification" },
    verifying: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Verifying..." },
    payment_confirmed: { bg: "bg-green-500/10", text: "text-green-500", label: "Payment Confirmed" },
    sending_usdt: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Sending USDT..." },
    completed: { bg: "bg-green-500/10", text: "text-green-500", label: "Completed" },
    payment_failed: { bg: "bg-red-500/10", text: "text-red-500", label: "Payment Failed" },
    delivery_failed: { bg: "bg-red-500/10", text: "text-red-500", label: "Delivery Failed" },
    cancelled: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Cancelled" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Steps indicator ────────────────────────────────────────────────────────

function DepositSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Enter Amount", icon: "1" },
    { label: "Pay", icon: "2" },
    { label: "Receive USDT", icon: "3" },
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < currentStep
                  ? "bg-green-500 text-white"
                  : i === currentStep
                  ? "bg-primary text-white"
                  : "bg-muted/30 dark:bg-white/10 text-muted"
              }`}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.icon
              )}
            </div>
            <span
              className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                i <= currentStep ? "text-dark dark:text-white" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full ${
                i < currentStep ? "bg-green-500" : "bg-muted/30 dark:bg-white/10"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DepositPage() {
  const { walletsGenerated } = useWallet();
  const searchParams = useSearchParams();

  // UI state
  const [fiatCurrency] = useState<FiatCurrency>("NGN");
  const [network, setNetwork] = useState<"solana" | "ethereum">("solana");
  const [usdtAmount, setUsdtAmount] = useState(() => {
    const urlAmount = searchParams.get("amount");
    return urlAmount && !isNaN(parseFloat(urlAmount)) ? urlAmount : "";
  });
  const [rates, setRates] = useState<Record<string, Rate>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // Deposit state
  const [activeDeposit, setActiveDeposit] = useState<DepositRecord | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch rates ────────────────────────────────────────────────────────

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/p2p/rates");
      const data = await res.json();
      if (data.rates) setRates(data.rates);
    } catch {
      console.error("Failed to fetch rates");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 120_000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // ── Resume from GlobalPay redirect ─────────────────────────────────────

  const loadDeposit = useCallback(async (depositId: string) => {
    try {
      const res = await fetch(`/api/deposit/status/${depositId}`);
      const data = await res.json();
      if (data.success && data.deposit) {
        setActiveDeposit(data.deposit);
        setPaymentUrl(data.deposit.checkoutUrl || null);
      }
    } catch {
      console.error("Failed to load deposit");
    }
  }, []);

  useEffect(() => {
    const depositId = searchParams.get("depositId");
    if (depositId) {
      loadDeposit(depositId);
    }
  }, [searchParams, loadDeposit]);

  // ── Status polling ─────────────────────────────────────────────────────

  useEffect(() => {
    if (
      activeDeposit &&
      ["verifying", "payment_confirmed", "sending_usdt"].includes(activeDeposit.status)
    ) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/deposit/status/${activeDeposit._id}`);
          const data = await res.json();
          if (data.success && data.deposit) {
            setActiveDeposit(data.deposit);
            if (["completed", "payment_failed", "delivery_failed", "cancelled"].includes(data.deposit.status)) {
              if (pollRef.current) clearInterval(pollRef.current);
            }
          }
        } catch {
          // Continue polling
        }
      }, 5000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [activeDeposit?.status, activeDeposit?._id]);

  // ── Calculations ───────────────────────────────────────────────────────

  const currentRate = rates[fiatCurrency];
  const buyRate = currentRate?.buyRate;
  const amountNum = parseFloat(usdtAmount) || 0;
  const fiatAmount = amountNum * (buyRate || 0);
  const isValidAmount = amountNum >= 1 && amountNum <= 5000;

  // ── Determine current step ─────────────────────────────────────────────

  const getStep = (): number => {
    if (!activeDeposit) return 0;
    const st = activeDeposit.status;
    if (st === "pending" || st === "awaiting_verification" || st === "payment_failed") return 1;
    if (st === "verifying" || st === "payment_confirmed" || st === "sending_usdt") return 2;
    if (st === "completed" || st === "delivery_failed") return 2;
    return 0;
  };

  // ── Create deposit order ───────────────────────────────────────────────

  const handleInitiate = async () => {
    if (!isValidAmount || !buyRate) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/deposit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdtAmount: amountNum, fiatCurrency, network }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to create deposit order");
        return;
      }

      setActiveDeposit(data.deposit);
      setPaymentUrl(data.checkoutUrl || null);
      setUsdtAmount("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify payment (user clicks "I've Paid") ──────────────────────────

  const handleVerify = async () => {
    if (!activeDeposit) return;
    setVerifying(true);
    setVerifyMessage("");
    setError("");

    try {
      const res = await fetch("/api/deposit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId: activeDeposit._id }),
      });

      const data = await res.json();
      if (data.deposit) {
        setActiveDeposit(data.deposit);
      }

      if (!data.success) {
        setVerifyMessage(data.message || "Verification failed");
      }
    } catch {
      setError("Failed to verify payment. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // ── Cancel deposit ─────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!activeDeposit) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/deposit/status/${activeDeposit._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveDeposit(null);
        setPaymentUrl(null);
        setError("");
        setVerifyMessage("");
      }
    } catch {
      setError("Failed to cancel deposit");
    } finally {
      setLoading(false);
    }
  };

  // ── Open payment page ───────────────────────────────────────────────────

  const openPayment = () => {
    if (typeof window === "undefined") return;
    if (!paymentUrl) {
      setError("Payment link not available yet. Please try again or contact support.");
      return;
    }

    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  };

  // ── No wallet state ────────────────────────────────────────────────────

  if (!walletsGenerated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">Wallet Required</h2>
          <p className="text-muted mb-4">Set up your wallet on the Assets page to deposit funds.</p>
          <a
            href="/assets"
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
          >
            Go to Assets.
          </a>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-12 gap-5 lg:gap-6">
        <div className="col-span-12 lg:col-span-8 lg:col-start-3">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-dark dark:text-white">Deposit</h1>
            <p className="text-muted mt-1">Fund your wallet with USDT</p>
          </div>

          {/* Steps */}
          <DepositSteps currentStep={getStep()} />

          {/* Main Card */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
            {/* ── Step 0: Enter amount ─────────────────────────────────── */}
            {!activeDeposit && (
              <div className="p-6 space-y-5">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-dark dark:text-white font-medium">How deposit works</p>
                    <p className="text-xs text-muted mt-1">
                      Select network → Enter USDT amount → Pay via GlobalPay → USDT is sent to your {network === "solana" ? "Solana" : "Ethereum"} wallet automatically.
                    </p>
                  </div>
                </div>

                {/* Rate display */}
                {currentRate && (
                  <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Exchange Rate</span>
                      <span className="text-dark dark:text-white font-semibold">
                        1 USDT = {currentRate.symbol}
                        {currentRate.buyRate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Market rate: {currentRate.symbol}{currentRate.marketRate.toLocaleString()} • 5% markup
                    </p>
                  </div>
                )}

                {ratesLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                )}

                {/* Network Selection */}
                <div>
                  <label className="block text-sm text-muted mb-2">Receive USDT on</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNetwork("solana")}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                        network === "solana"
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border/50 dark:border-darkborder hover:border-border dark:hover:border-white/20"
                      }`}
                    >
                      <img
                        src="https://cryptologos.cc/logos/solana-sol-logo.png"
                        alt="Solana"
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${
                          network === "solana" ? "text-primary" : "text-dark dark:text-white"
                        }`}>Solana</p>
                        <p className="text-[10px] text-muted">SPL USDT</p>
                      </div>
                      {network === "solana" && (
                        <svg className="w-5 h-5 text-primary ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNetwork("ethereum")}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                        network === "ethereum"
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border/50 dark:border-darkborder hover:border-border dark:hover:border-white/20"
                      }`}
                    >
                      <img
                        src="https://cryptologos.cc/logos/ethereum-eth-logo.png"
                        alt="Ethereum"
                        className="w-7 h-7 rounded-full"
                      />
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${
                          network === "ethereum" ? "text-primary" : "text-dark dark:text-white"
                        }`}>Ethereum</p>
                        <p className="text-[10px] text-muted">ERC-20 USDT</p>
                      </div>
                      {network === "ethereum" && (
                        <svg className="w-5 h-5 text-primary ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* USDT Amount */}
                <div>
                  <label className="block text-sm text-muted mb-2">Amount to deposit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(e.target.value)}
                      placeholder="Enter USDT amount"
                      step="any"
                      min={5}
                      max={5000}
                      className="w-full px-4 py-3.5 pr-20 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">
                      USDT
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-muted">Min: 5 USDT • Max: 5,000 USDT</p>
                    <div className="flex gap-1.5">
                      {[10, 50, 100, 500].map((v) => (
                        <button
                          key={v}
                          onClick={() => setUsdtAmount(v.toString())}
                          className="px-2 py-0.5 text-xs bg-muted/30 dark:bg-white/5 text-muted hover:text-dark dark:hover:text-white rounded-md transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fiat equivalent */}
                {amountNum > 0 && buyRate && (
                  <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">You will pay</span>
                      <span className="text-2xl font-bold text-dark dark:text-white">
                        {CURRENCY_SYMBOLS[fiatCurrency]}
                        {fiatAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {/* Continue button */}
                <button
                  onClick={handleInitiate}
                  disabled={!isValidAmount || !buyRate || loading}
                  className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : `Deposit ${amountNum > 0 ? amountNum + " " : ""}USDT`}
                </button>
              </div>
            )}

            {/* ── Step 1: Pay via GlobalPay ────────────────────────────── */}
            {activeDeposit &&
              ["pending", "awaiting_verification", "payment_failed"].includes(activeDeposit.status) && (
                <div className="p-6 space-y-6">
                  {/* Order summary */}
                  <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted">Deposit Amount</span>
                      <span className="text-dark dark:text-white font-semibold">
                        {activeDeposit.usdtAmount} USDT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Total to Pay</span>
                      <span className="text-lg font-bold text-dark dark:text-white">
                        {CURRENCY_SYMBOLS[activeDeposit.fiatCurrency]}
                        {activeDeposit.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Rate</span>
                      <span className="text-dark dark:text-white">
                        1 USDT = {CURRENCY_SYMBOLS[activeDeposit.fiatCurrency]}
                        {activeDeposit.exchangeRate.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Status</span>
                      <StatusBadge status={activeDeposit.status} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted">
                      Click the button below to pay{" "}
                      <strong className="text-dark dark:text-white">
                        {CURRENCY_SYMBOLS[activeDeposit.fiatCurrency]}
                        {activeDeposit.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>{" "}
                      via GlobalPay:
                    </p>
                    <button
                      onClick={openPayment}
                      disabled={!paymentUrl}
                      className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      {`Pay ${CURRENCY_SYMBOLS[activeDeposit.fiatCurrency]}${activeDeposit.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </button>
                    <p className="text-xs text-muted">
                      {paymentUrl
                        ? "If payment does not open, click the button again."
                        : "Payment link is being prepared."}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border/50 dark:bg-darkborder" />
                    <span className="text-xs text-muted">after paying</span>
                    <div className="flex-1 h-px bg-border/50 dark:bg-darkborder" />
                  </div>

                  {/* I've Paid section */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted">
                      Completed your payment? Click below to verify and receive your USDT:
                    </p>

                    {verifyMessage && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">{verifyMessage}</p>
                      </div>
                    )}

                    {activeDeposit.status === "payment_failed" && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-500">
                          Previous payment verification failed. You can pay again using the button above or try
                          verifying again.
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-500">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        disabled={loading || verifying}
                        className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                      >
                        {verifying ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Verifying...
                          </span>
                        ) : (
                          "I've Paid"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* ── Step 2: Processing / Sending USDT ────────────────────── */}
            {activeDeposit &&
              ["verifying", "payment_confirmed", "sending_usdt"].includes(activeDeposit.status) && (
                <div className="p-6">
                  <div className="text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-orange-500 animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                      {activeDeposit.status === "verifying"
                        ? "Verifying Payment..."
                        : activeDeposit.status === "payment_confirmed"
                        ? "Payment Confirmed!"
                        : "Sending USDT to Your Wallet..."}
                    </h3>
                    <p className="text-muted max-w-sm mx-auto">
                      {activeDeposit.status === "verifying" ? (
                        "Checking your payment with GlobalPay..."
                      ) : (
                        <>
                          Sending{" "}
                          <strong className="text-dark dark:text-white">
                            {activeDeposit.usdtAmount} USDT
                          </strong>{" "}
                          to your {activeDeposit.network === "ethereum" ? "Ethereum" : "Solana"} wallet.
                        </>
                      )}
                    </p>
                    <div className="mt-6 p-3 bg-muted/30 dark:bg-white/5 rounded-xl inline-flex items-center gap-2 text-sm text-muted">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                      Your funds are safe. Status updates automatically.
                    </div>
                  </div>
                </div>
              )}

            {/* ── Completed ─────────────────────────────────────────────── */}
            {activeDeposit && activeDeposit.status === "completed" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">Deposit Successful!</h3>
                  <p className="text-muted">
                    <strong className="text-dark dark:text-white">{activeDeposit.usdtAmount} USDT</strong> has been
                    sent to your {activeDeposit.network === "ethereum" ? "Ethereum" : "Solana"} wallet.
                  </p>
                  {activeDeposit.txHash && (
                    <a
                      href={
                        activeDeposit.network === "ethereum"
                          ? `https://etherscan.io/tx/${activeDeposit.txHash}`
                          : `https://solscan.io/tx/${activeDeposit.txHash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-3"
                    >
                      View on {activeDeposit.network === "ethereum" ? "Etherscan" : "Solscan"} →
                    </a>
                  )}
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setActiveDeposit(null);
                        setPaymentUrl(null);
                        setError("");
                        setVerifyMessage("");
                      }}
                      className="py-2.5 px-6 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                    >
                      Deposit Again
                    </button>
                    <a
                      href="/assets"
                      className="py-2.5 px-6 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
                    >
                      View Assets
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── Delivery Failed ──────────────────────────────────────── */}
            {activeDeposit && activeDeposit.status === "delivery_failed" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                    Payment Received — USDT Delivery Pending
                  </h3>
                  <p className="text-muted max-w-md mx-auto">
                    Your payment of{" "}
                    <strong className="text-dark dark:text-white">
                      {CURRENCY_SYMBOLS[activeDeposit.fiatCurrency]}
                      {activeDeposit.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>{" "}
                    was confirmed, but we encountered an issue sending USDT to your wallet. Our team has been notified
                    and will resolve this shortly.
                  </p>
                  {activeDeposit.deliveryError && (
                    <p className="text-xs text-red-400 mt-2 font-mono">{activeDeposit.deliveryError}</p>
                  )}
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setActiveDeposit(null);
                        setError("");
                        setVerifyMessage("");
                      }}
                      className="py-2.5 px-6 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
                    >
                      Back to Deposit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="col-span-12">
          <Footer />
        </div>
      </div>
    </>
  );
}
