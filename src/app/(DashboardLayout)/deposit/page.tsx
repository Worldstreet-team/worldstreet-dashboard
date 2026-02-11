"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/app/context/walletContext";
import Footer from "@/components/dashboard/Footer";

// ── Types ──────────────────────────────────────────────────────────────────

interface Rate {
  marketRate: number;
  buyRate: number;
  sellRate: number;
  symbol: string;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface P2POrder {
  _id: string;
  orderType: "buy" | "sell";
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  status: string;
  paymentReference?: string;
  txHash?: string;
  userBankDetails?: BankDetails;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
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
    awaiting_payment: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Awaiting Payment" },
    payment_sent: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Payment Sent" },
    completed: { bg: "bg-green-500/10", text: "text-green-500", label: "Completed" },
    cancelled: { bg: "bg-red-500/10", text: "text-red-500", label: "Cancelled" },
    expired: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Expired" },
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
    { label: "Pay to Bank", icon: "2" },
    { label: "Confirm Payment", icon: "3" },
    { label: "Receive USDT", icon: "4" },
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
            <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
              i <= currentStep ? "text-dark dark:text-white" : "text-muted"
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full ${
              i < currentStep ? "bg-green-500" : "bg-muted/30 dark:bg-white/10"
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DepositPage() {
  const { walletsGenerated } = useWallet();

  // UI state
  const [fiatCurrency] = useState<FiatCurrency>("NGN");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [rates, setRates] = useState<Record<string, Rate>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // Active order state
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);
  const [platformBank, setPlatformBank] = useState<BankDetails | null>(null);
  const [paymentRef, setPaymentRef] = useState("");

  // General
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");

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

  // ── Fetch active order ─────────────────────────────────────────────────

  const fetchActiveOrder = useCallback(async () => {
    try {
      const res = await fetch("/api/p2p/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        const active = data.orders.find(
          (o: P2POrder) =>
            o.orderType === "buy" &&
            ["pending", "awaiting_payment", "payment_sent"].includes(o.status)
        );
        if (active) setActiveOrder(active);
      }
    } catch {
      console.error("Failed to fetch orders");
    }
  }, []);

  useEffect(() => {
    if (walletsGenerated) {
      fetchActiveOrder();
      const interval = setInterval(fetchActiveOrder, 15_000);
      return () => clearInterval(interval);
    }
  }, [walletsGenerated, fetchActiveOrder]);

  // ── Calculations ───────────────────────────────────────────────────────

  const currentRate = rates[fiatCurrency];
  const buyRate = currentRate?.buyRate;
  const amountNum = parseFloat(usdtAmount) || 0;
  const fiatAmount = amountNum * (buyRate || 0);
  const isValidAmount = amountNum >= 5 && amountNum <= 5000;

  // ── Get current step ───────────────────────────────────────────────────

  const getStep = () => {
    if (!activeOrder) return 0;
    if (activeOrder.status === "awaiting_payment") return 1;
    if (activeOrder.status === "payment_sent") return 2;
    if (activeOrder.status === "completed") return 3;
    return 0;
  };

  // ── Create deposit order ───────────────────────────────────────────────

  const handleDeposit = async () => {
    if (!isValidAmount || !buyRate) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/p2p/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "buy",
          usdtAmount: amountNum,
          fiatCurrency,
          exchangeRate: buyRate,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to create deposit order");
        return;
      }

      setActiveOrder(data.order);
      if (data.platformBankDetails) setPlatformBank(data.platformBankDetails);
      setUsdtAmount("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Mark as paid ───────────────────────────────────────────────────────

  const handleMarkPaid = async () => {
    if (!activeOrder || !paymentRef.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/p2p/orders/${activeOrder._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid", paymentReference: paymentRef }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveOrder(data.order);
        setPaymentRef("");
      }
    } catch {
      setError("Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel order ───────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!activeOrder) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/p2p/orders/${activeOrder._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveOrder(null);
      }
    } catch {
      setError("Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  // ── Copy helper ────────────────────────────────────────────────────────

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  // ── No wallet state ────────────────────────────────────────────────────

  if (!walletsGenerated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">Wallet Required</h2>
          <p className="text-muted mb-4">Set up your wallet on the Assets page to deposit funds.</p>
          <a
            href="/assets"
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
          >
            Go to Assets
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
            <p className="text-muted mt-1">Fund your wallet with USDT via bank transfer</p>
          </div>

          {/* Steps */}
          <DepositSteps currentStep={getStep()} />

          {/* Main Card */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">

            {/* ── Step 0: Enter amount ─────────────────────────────────── */}
            {!activeOrder && (
              <div className="p-6 space-y-5">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-dark dark:text-white font-medium">How deposit works</p>
                    <p className="text-xs text-muted mt-1">
                      Enter USDT amount → Transfer NGN to our bank → We send USDT to your Solana wallet.
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
                  onClick={handleDeposit}
                  disabled={!isValidAmount || !buyRate || loading}
                  className="w-full py-3.5 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : `Deposit ${amountNum > 0 ? amountNum + " " : ""}USDT`}
                </button>
              </div>
            )}

            {/* ── Step 1-2: Awaiting payment — show bank details ────── */}
            {activeOrder && activeOrder.status === "awaiting_payment" && (
              <div className="p-6 space-y-6">
                {/* Order summary */}
                <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Deposit Amount</span>
                    <span className="text-dark dark:text-white font-semibold">
                      {activeOrder.usdtAmount} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Total to Pay</span>
                    <span className="text-lg font-bold text-dark dark:text-white">
                      {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}
                      {activeOrder.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Rate</span>
                    <span className="text-dark dark:text-white">
                      1 USDT = {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}{activeOrder.exchangeRate.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Bank details */}
                <div>
                  <h3 className="text-sm font-semibold text-dark dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Transfer to this account
                  </h3>
                  <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4 space-y-3">
                    {platformBank ? (
                      <>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted">Bank Name</p>
                            <p className="text-dark dark:text-white font-medium">{platformBank.bankName}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted">Account Number</p>
                            <p className="text-dark dark:text-white font-medium font-mono text-lg">{platformBank.accountNumber}</p>
                          </div>
                          <button
                            onClick={() => handleCopy(platformBank.accountNumber, "acct")}
                            className="text-primary text-sm hover:text-primary/80 font-medium"
                          >
                            {copied === "acct" ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted">Account Name</p>
                            <p className="text-dark dark:text-white font-medium">{platformBank.accountName}</p>
                          </div>
                        </div>
                        <div className="border-t border-border/50 dark:border-darkborder pt-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-muted">Exact Amount to Send</p>
                              <p className="text-xl font-bold text-dark dark:text-white">
                                {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}
                                {activeOrder.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopy(activeOrder.fiatAmount.toFixed(2), "amt")}
                              className="text-primary text-sm hover:text-primary/80 font-medium"
                            >
                              {copied === "amt" ? "✓ Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted text-center py-4">
                        Bank details not available for {activeOrder.fiatCurrency}. Please contact support.
                      </p>
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2 text-sm text-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Order expires in 30 minutes. Complete your transfer and confirm below.
                </div>

                {/* Payment reference + confirm */}
                <div>
                  <label className="block text-sm text-muted mb-2">Payment Reference / Sender Name</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Enter transfer reference or sender name"
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkPaid}
                    disabled={loading || !paymentRef.trim()}
                    className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "I Have Paid"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Payment sent — waiting verification ───────── */}
            {activeOrder && activeOrder.status === "payment_sent" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                    Verifying Your Payment
                  </h3>
                  <p className="text-muted max-w-sm mx-auto">
                    We&apos;re verifying your bank transfer. Once confirmed, <strong className="text-dark dark:text-white">{activeOrder.usdtAmount} USDT</strong> will be sent to your Solana wallet.
                  </p>
                  <p className="text-sm text-muted mt-4">This usually takes 5–30 minutes.</p>
                  {activeOrder.paymentReference && (
                    <p className="text-xs text-muted mt-2 font-mono">
                      Ref: {activeOrder.paymentReference}
                    </p>
                  )}
                  <div className="mt-6 p-3 bg-muted/30 dark:bg-white/5 rounded-xl inline-flex items-center gap-2 text-sm text-muted">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Your funds are safe. Status updates automatically.
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Completed ─────────────────────────────────── */}
            {activeOrder && activeOrder.status === "completed" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                    Deposit Successful!
                  </h3>
                  <p className="text-muted">
                    <strong className="text-dark dark:text-white">{activeOrder.usdtAmount} USDT</strong> has been sent to your Solana wallet.
                  </p>
                  {activeOrder.txHash && (
                    <a
                      href={`https://solscan.io/tx/${activeOrder.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-3"
                    >
                      View on Solscan →
                    </a>
                  )}
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveOrder(null)}
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
          </div>
        </div>

        <div className="col-span-12"><Footer /></div>
      </div>
    </>
  );
}
