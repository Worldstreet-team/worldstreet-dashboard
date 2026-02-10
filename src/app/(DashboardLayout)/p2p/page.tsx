"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/app/context/walletContext";
import { useSolana } from "@/app/context/solanaContext";
import { formatUSD } from "@/lib/wallet/amounts";
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

type FiatCurrency = "NGN" | "USD" | "GBP";

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

const PLATFORM_WALLET = "DYJ5erEEoJT6PDueRSkKARxXt4W4jcGLbcYeMmKHAxBo";
const USDT_MINT = "Es9vMFrzaCERmKfrFhQ1dZRDgjXzhJMTo6mnstHbDvn";

// ── Status badge component ─────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────

export default function P2PPage() {
  const { addresses, walletsGenerated, getEncryptedKeys } = useWallet();
  const { sendTokenTransaction } = useSolana();

  // UI state
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>("NGN");
  const [usdtAmount, setUsdtAmount] = useState("");
  const [rates, setRates] = useState<Record<string, Rate>>({});
  const [ratesLoading, setRatesLoading] = useState(true);

  // Bank details for sell
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // Active order state
  const [activeOrder, setActiveOrder] = useState<P2POrder | null>(null);
  const [platformBank, setPlatformBank] = useState<BankDetails | null>(null);
  const [paymentRef, setPaymentRef] = useState("");

  // Order history
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // PIN modal for sell orders
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [pinError, setPinError] = useState("");
  const [sending, setSending] = useState(false);

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

  // ── Fetch orders ───────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/p2p/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        // Check for active order
        const active = data.orders.find((o: P2POrder) =>
          ["pending", "awaiting_payment", "payment_sent"].includes(o.status)
        );
        setActiveOrder(active || null);
      }
    } catch {
      console.error("Failed to fetch orders");
    }
  }, []);

  useEffect(() => {
    if (walletsGenerated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15_000); // Poll for status updates
      return () => clearInterval(interval);
    }
  }, [walletsGenerated, fetchOrders]);

  // ── Calculations ───────────────────────────────────────────────────────

  const currentRate = rates[fiatCurrency];
  const rate = tab === "buy" ? currentRate?.buyRate : currentRate?.sellRate;
  const amountNum = parseFloat(usdtAmount) || 0;
  const fiatAmount = amountNum * (rate || 0);
  const isValidAmount = amountNum >= 5 && amountNum <= 5000;

  // ── Create order ───────────────────────────────────────────────────────

  const handleCreateOrder = async () => {
    if (!isValidAmount || !rate) return;
    setError("");
    setLoading(true);

    try {
      if (tab === "sell") {
        // For sell: show PIN modal to send USDT first
        setShowPinModal(true);
        setLoading(false);
        return;
      }

      // Buy order: create directly
      const res = await fetch("/api/p2p/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "buy",
          usdtAmount: amountNum,
          fiatCurrency,
          exchangeRate: rate,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to create order");
        return;
      }

      setActiveOrder(data.order);
      if (data.platformBankDetails) setPlatformBank(data.platformBankDetails);
      setUsdtAmount("");
      fetchOrders();
    } catch {
      setError("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  // ── Sell: Send USDT and create order ───────────────────────────────────

  const handleSellConfirm = async () => {
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
        6 // USDT has 6 decimals
      );

      // Create the sell order with txHash
      const res = await fetch("/api/p2p/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "sell",
          usdtAmount: amountNum,
          fiatCurrency,
          exchangeRate: rate,
          bankDetails: { bankName, accountNumber, accountName },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setPinError(data.message || "Failed to create order");
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
      fetchOrders();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  // ── Mark buy order as paid ─────────────────────────────────────────────

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
        fetchOrders();
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
        fetchOrders();
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
          <p className="text-muted mb-4">Set up your wallet to access P2P trading</p>
        </div>
      </div>
    );
  }

  // ── Active order view ──────────────────────────────────────────────────

  if (activeOrder) {
    return (
      <>
        <div className="grid grid-cols-12 gap-5 lg:gap-6">
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-border/50 dark:border-darkborder">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark dark:text-white">
                      {activeOrder.orderType === "buy" ? "Buy" : "Sell"} USDT Order
                    </h2>
                    <p className="text-sm text-muted mt-1">
                      Order #{activeOrder._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={activeOrder.status} />
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Order Details */}
                <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Amount</span>
                    <span className="text-dark dark:text-white font-medium">
                      {activeOrder.usdtAmount} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Total</span>
                    <span className="text-dark dark:text-white font-medium">
                      {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}
                      {activeOrder.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Rate</span>
                    <span className="text-dark dark:text-white">
                      1 USDT = {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}{activeOrder.exchangeRate.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Buy Order: Show bank details + mark as paid */}
                {activeOrder.orderType === "buy" && activeOrder.status === "awaiting_payment" && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-dark dark:text-white mb-3">
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
                                <p className="text-dark dark:text-white font-medium font-mono">{platformBank.accountNumber}</p>
                              </div>
                              <button
                                onClick={() => handleCopy(platformBank.accountNumber, "acct")}
                                className="text-primary text-sm hover:text-primary/80"
                              >
                                {copied === "acct" ? "Copied!" : "Copy"}
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
                                  <p className="text-xs text-muted">Amount to Send</p>
                                  <p className="text-lg font-bold text-dark dark:text-white">
                                    {CURRENCY_SYMBOLS[activeOrder.fiatCurrency]}
                                    {activeOrder.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleCopy(activeOrder.fiatAmount.toString(), "amt")}
                                  className="text-primary text-sm hover:text-primary/80"
                                >
                                  {copied === "amt" ? "Copied!" : "Copy"}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted">
                            Bank details not available for {activeOrder.fiatCurrency} yet. Please contact support.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Payment reference + confirm */}
                    <div>
                      <label className="block text-sm text-muted mb-2">Payment Reference (optional)</label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="Enter your transfer reference"
                        className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        Cancel Order
                      </button>
                      <button
                        onClick={handleMarkPaid}
                        disabled={loading}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        {loading ? "Processing..." : "I Have Paid"}
                      </button>
                    </div>
                  </>
                )}

                {/* Buy order: payment sent, waiting for admin */}
                {activeOrder.orderType === "buy" && activeOrder.status === "payment_sent" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                      Payment Being Verified
                    </h3>
                    <p className="text-muted">
                      Your payment is being verified. USDT will be sent to your wallet once confirmed. This usually takes 5-30 minutes.
                    </p>
                    {activeOrder.paymentReference && (
                      <p className="text-sm text-muted mt-2">
                        Ref: {activeOrder.paymentReference}
                      </p>
                    )}
                  </div>
                )}

                {/* Sell order: payment sent, waiting for fiat */}
                {activeOrder.orderType === "sell" && activeOrder.status === "payment_sent" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                      USDT Received — Sending Fiat
                    </h3>
                    <p className="text-muted">
                      Your USDT has been received. Fiat payment to your bank account is being processed. This usually takes 5-30 minutes.
                    </p>
                    {activeOrder.txHash && (
                      <a
                        href={`https://solscan.io/tx/${activeOrder.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-2"
                      >
                        View Transaction →
                      </a>
                    )}
                  </div>
                )}

                {/* Completed */}
                {activeOrder.status === "completed" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                      Order Completed!
                    </h3>
                    <p className="text-muted">
                      {activeOrder.orderType === "buy"
                        ? "USDT has been sent to your wallet."
                        : "Fiat has been sent to your bank account."}
                    </p>
                    <button
                      onClick={() => setActiveOrder(null)}
                      className="mt-4 py-2 px-6 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6"><Footer /></div>
      </>
    );
  }

  // ── Main buy/sell form ─────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-12 gap-5 lg:gap-6">
        {/* Trading Card */}
        <div className="col-span-12 lg:col-span-8 lg:col-start-3">
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
            {/* Buy / Sell Tabs */}
            <div className="flex border-b border-border/50 dark:border-darkborder">
              <button
                onClick={() => { setTab("buy"); setError(""); }}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  tab === "buy"
                    ? "text-green-500 border-b-2 border-green-500 bg-green-500/5"
                    : "text-muted hover:text-dark dark:hover:text-white"
                }`}
              >
                Buy USDT
              </button>
              <button
                onClick={() => { setTab("sell"); setError(""); }}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  tab === "sell"
                    ? "text-red-500 border-b-2 border-red-500 bg-red-500/5"
                    : "text-muted hover:text-dark dark:hover:text-white"
                }`}
              >
                Sell USDT
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Currency selector */}
              <div>
                <label className="block text-sm text-muted mb-2">Currency</label>
                <div className="flex gap-2">
                  {(["NGN"] as FiatCurrency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setFiatCurrency(c)}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-colors ${
                        fiatCurrency === c
                          ? "bg-primary text-white"
                          : "bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate display */}
              {currentRate && (
                <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">
                      {tab === "buy" ? "Buy" : "Sell"} Rate
                    </span>
                    <span className="text-dark dark:text-white font-semibold">
                      1 USDT = {currentRate.symbol}
                      {(tab === "buy" ? currentRate.buyRate : currentRate.sellRate).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Market rate: {currentRate.symbol}{currentRate.marketRate.toLocaleString()} • 5% {tab === "buy" ? "markup" : "spread"}
                  </p>
                </div>
              )}

              {ratesLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}

              {/* USDT Amount */}
              <div>
                <label className="block text-sm text-muted mb-2">
                  {tab === "buy" ? "I want to buy" : "I want to sell"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    placeholder="Enter USDT amount"
                    step="any"
                    min={5}
                    max={5000}
                    className="w-full px-4 py-3 pr-20 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">
                    USDT
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">Min: 5 USDT • Max: 5,000 USDT</p>
              </div>

              {/* Fiat equivalent */}
              {amountNum > 0 && rate && (
                <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">
                      {tab === "buy" ? "You will pay" : "You will receive"}
                    </span>
                    <span className="text-xl font-bold text-dark dark:text-white">
                      {CURRENCY_SYMBOLS[fiatCurrency]}
                      {fiatAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Bank details for sell */}
              {tab === "sell" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-dark dark:text-white">
                    Your Bank Details
                  </h3>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name"
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
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleCreateOrder}
                disabled={
                  !isValidAmount ||
                  !rate ||
                  loading ||
                  (tab === "sell" && (!bankName || !accountNumber || !accountName))
                }
                className={`w-full py-3.5 px-4 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white ${
                  tab === "buy"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {loading
                  ? "Processing..."
                  : tab === "buy"
                  ? `Buy ${amountNum > 0 ? amountNum + " " : ""}USDT`
                  : `Sell ${amountNum > 0 ? amountNum + " " : ""}USDT`}
              </button>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="col-span-12 lg:col-span-8 lg:col-start-3">
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full p-5 flex items-center justify-between"
            >
              <h3 className="text-base font-semibold text-dark dark:text-white">
                Order History ({orders.length})
              </h3>
              <svg
                className={`w-5 h-5 text-muted transition-transform ${showHistory ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHistory && (
              <div className="border-t border-border/50 dark:border-darkborder">
                {orders.length === 0 ? (
                  <p className="p-6 text-center text-muted">No orders yet</p>
                ) : (
                  <div className="divide-y divide-border/50 dark:divide-darkborder">
                    {orders.map((order) => (
                      <div key={order._id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              order.orderType === "buy"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {order.orderType === "buy" ? "B" : "S"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {order.orderType === "buy" ? "Buy" : "Sell"} {order.usdtAmount} USDT
                            </p>
                            <p className="text-xs text-muted">
                              {new Date(order.createdAt).toLocaleDateString()} •{" "}
                              {CURRENCY_SYMBOLS[order.fiatCurrency]}
                              {order.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12"><Footer /></div>
      </div>

      {/* PIN Modal for Sell */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !sending && setShowPinModal(false)} />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2 text-center">
              Confirm USDT Transfer
            </h3>
            <p className="text-sm text-muted text-center mb-2">
              You are sending <span className="font-semibold text-dark dark:text-white">{amountNum} USDT</span> to the platform.
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
                onClick={handleSellConfirm}
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
