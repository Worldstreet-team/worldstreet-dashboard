"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/app/context/walletContext";
import { useSolana } from "@/app/context/solanaContext";
import Footer from "@/components/dashboard/Footer";
import CryptoJS from "crypto-js";

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

const PLATFORM_WALLET = "DYJ5erEEoJT6PDueRSkKARxXt4W4jcGLbcYeMmKHAxBo";
const USDT_MINT = "Es9vMFrzaCERmKfrFhQ1dZRDgjXzhJMTo6mnstHbDvn";

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Pending" },
    awaiting_payment: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Awaiting Payment" },
    payment_sent: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Processing" },
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

function WithdrawSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Enter Amount", icon: "1" },
    { label: "Bank Details", icon: "2" },
    { label: "Send USDT", icon: "3" },
    { label: "Receive Fiat", icon: "4" },
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

export default function WithdrawPage() {
  const { walletsGenerated, getEncryptedKeys } = useWallet();
  const { sendTokenTransaction } = useSolana();
  const searchParams = useSearchParams();

  // UI state
  const [fiatCurrency] = useState<FiatCurrency>("NGN");
  const [usdtAmount, setUsdtAmount] = useState(() => {
    // Pre-fill from URL query param if present
    const urlAmount = searchParams.get("amount");
    return urlAmount && !isNaN(parseFloat(urlAmount)) ? urlAmount : "";
  });
  const [rates, setRates] = useState<Record<string, Rate>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // Bank details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // Active order state
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);

  // PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [pinError, setPinError] = useState("");
  const [sending, setSending] = useState(false);

  // General
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            o.orderType === "sell" &&
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
  const sellRate = currentRate?.sellRate;
  const amountNum = parseFloat(usdtAmount) || 0;
  const fiatAmount = amountNum * (sellRate || 0);
  const isValidAmount = amountNum >= 5 && amountNum <= 5000;
  const hasBankDetails = bankName.trim() && accountNumber.trim() && accountName.trim();

  // ── Get current step ───────────────────────────────────────────────────

  const getStep = () => {
    if (!activeOrder) {
      if (!usdtAmount) return 0;
      if (!hasBankDetails) return 1;
      return 2;
    }
    if (activeOrder.status === "payment_sent") return 3;
    if (activeOrder.status === "completed") return 3;
    return 2;
  };

  // ── Initiate withdrawal ────────────────────────────────────────────────

  const handleWithdraw = () => {
    if (!isValidAmount || !sellRate || !hasBankDetails) return;
    setError("");
    setShowPinModal(true);
  };

  // ── Confirm: send USDT & create order ──────────────────────────────────

  const handleConfirmSend = async () => {
    const pinString = pin.join("");
    if (pinString.length !== 6) return;

    setSending(true);
    setPinError("");

    try {
      // Get encrypted keys
      const pinHash = CryptoJS.SHA256(pinString).toString();
      const encryptedKeys = await getEncryptedKeys(pinHash);
      if (!encryptedKeys) {
        setPinError("Invalid PIN");
        setSending(false);
        return;
      }

      // Send USDT to platform wallet
      const txHash = await sendTokenTransaction(
        encryptedKeys.solana.encryptedPrivateKey,
        pinString,
        PLATFORM_WALLET,
        amountNum,
        USDT_MINT,
        6
      );

      // Create the sell order with bank details
      const res = await fetch("/api/p2p/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "sell",
          usdtAmount: amountNum,
          fiatCurrency,
          exchangeRate: sellRate,
          bankDetails: { bankName, accountNumber, accountName },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setPinError(data.message || "Failed to create withdrawal order");
        setSending(false);
        return;
      }

      // Update order with txHash
      await fetch(`/api/p2p/orders/${data.order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_usdt_sent", txHash }),
      });

      setActiveOrder({ ...data.order, txHash, status: "payment_sent" });
      setShowPinModal(false);
      setPin(["", "", "", "", "", ""]);
      setUsdtAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  // ── PIN handlers ───────────────────────────────────────────────────────

  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) pinRefs.current[index + 1]?.focus();
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
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
          <p className="text-muted mb-4">Set up your wallet on the Assets page to withdraw funds.</p>
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
            <h1 className="text-2xl font-bold text-dark dark:text-white">Withdraw</h1>
            <p className="text-muted mt-1">Cash out USDT to your bank account</p>
          </div>

          {/* Steps */}
          <WithdrawSteps currentStep={getStep()} />

          {/* Main Card */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">

            {/* ── Form: enter amount + bank details ────────────────── */}
            {!activeOrder && (
              <div className="p-6 space-y-5">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-dark dark:text-white font-medium">How withdrawal works</p>
                    <p className="text-xs text-muted mt-1">
                      Enter amount → Add bank details → Send USDT from wallet → Receive NGN in your bank.
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
                        {currentRate.sellRate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Market rate: {currentRate.symbol}{currentRate.marketRate.toLocaleString()} • 5% spread
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
                  <label className="block text-sm text-muted mb-2">Amount to withdraw</label>
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
                {amountNum > 0 && sellRate && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">You will receive</span>
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

                {/* Bank Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Your Bank Details
                  </h3>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name (e.g. Access Bank)"
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account Number"
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Account Name"
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {/* Withdraw button */}
                <button
                  onClick={handleWithdraw}
                  disabled={!isValidAmount || !sellRate || loading || !hasBankDetails}
                  className="w-full py-3.5 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : `Withdraw ${amountNum > 0 ? amountNum + " " : ""}USDT`}
                </button>

                {/* Summary */}
                {isValidAmount && sellRate && hasBankDetails && (
                  <div className="text-xs text-muted text-center">
                    {amountNum} USDT will be deducted from your Solana wallet •{" "}
                    {CURRENCY_SYMBOLS[fiatCurrency]}{fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} to your bank
                  </div>
                )}
              </div>
            )}

            {/* ── Active order: Processing ─────────────────────────── */}
            {activeOrder && activeOrder.status === "payment_sent" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                    Processing Withdrawal
                  </h3>
                  <p className="text-muted max-w-sm mx-auto">
                    Your <strong className="text-dark dark:text-white">{activeOrder.usdtAmount} USDT</strong> has been received.
                    We&apos;re sending <strong className="text-dark dark:text-white">{CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}{activeOrder.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> to your bank.
                  </p>
                  <p className="text-sm text-muted mt-4">This usually takes 5–30 minutes.</p>

                  {/* Order details */}
                  <div className="mt-6 bg-muted/30 dark:bg-white/5 rounded-xl p-4 text-left space-y-2 max-w-sm mx-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Bank</span>
                      <span className="text-dark dark:text-white">{activeOrder.userBankDetails?.bankName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Account</span>
                      <span className="text-dark dark:text-white font-mono">{activeOrder.userBankDetails?.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Name</span>
                      <span className="text-dark dark:text-white">{activeOrder.userBankDetails?.accountName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Status</span>
                      <StatusBadge status={activeOrder.status} />
                    </div>
                  </div>

                  {activeOrder.txHash && (
                    <a
                      href={`https://solscan.io/tx/${activeOrder.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-4"
                    >
                      View USDT Transaction →
                    </a>
                  )}

                  <div className="mt-4 p-3 bg-muted/30 dark:bg-white/5 rounded-xl inline-flex items-center gap-2 text-sm text-muted">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Status updates automatically.
                  </div>
                </div>
              </div>
            )}

            {/* ── Completed ────────────────────────────────────────── */}
            {activeOrder && activeOrder.status === "completed" && (
              <div className="p-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-dark dark:text-white mb-3">
                    Withdrawal Successful!
                  </h3>
                  <p className="text-muted">
                    <strong className="text-dark dark:text-white">
                      {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}{activeOrder.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </strong> has been sent to your bank account.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveOrder(null)}
                      className="py-2.5 px-6 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                    >
                      Withdraw Again
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

      {/* ── PIN Modal ───────────────────────────────────────────────────── */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !sending && setShowPinModal(false)} />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2 text-center">
              Confirm Withdrawal
            </h3>
            <p className="text-sm text-muted text-center mb-1">
              Sending <span className="font-semibold text-dark dark:text-white">{amountNum} USDT</span> from your wallet
            </p>
            <p className="text-sm text-muted text-center mb-1">
              You&apos;ll receive <span className="font-semibold text-dark dark:text-white">
                {CURRENCY_SYMBOLS[fiatCurrency]}{fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span> to your bank
            </p>
            <p className="text-xs text-muted text-center mb-6">
              Enter your 6-digit PIN to authorize.
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-sm text-red-500 text-center mb-4">{pinError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPinModal(false); setPin(["", "", "", "", "", ""]); setPinError(""); }}
                disabled={sending}
                className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={pin.some((d) => !d) || sending}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {sending ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
