"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/app/context/walletContext";
import Footer from "@/components/dashboard/Footer";

// ── Types ──────────────────────────────────────────────────────────────────

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
  userBankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

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

type FilterTab = "all" | "deposit" | "withdrawal";
type StatusFilter = "all" | "pending" | "awaiting_payment" | "payment_sent" | "completed" | "cancelled" | "expired";

// ── Main component ─────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { walletsGenerated } = useWallet();

  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);

  // ── Fetch orders ───────────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/p2p/orders?limit=100");
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (walletsGenerated) fetchOrders();
  }, [walletsGenerated, fetchOrders]);

  // ── Filter logic ───────────────────────────────────────────────────────

  const filteredOrders = orders.filter((o) => {
    if (filterTab === "deposit" && o.orderType !== "buy") return false;
    if (filterTab === "withdrawal" && o.orderType !== "sell") return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    totalDeposits: orders.filter((o) => o.orderType === "buy" && o.status === "completed").length,
    totalWithdrawals: orders.filter((o) => o.orderType === "sell" && o.status === "completed").length,
    totalDepositAmount: orders
      .filter((o) => o.orderType === "buy" && o.status === "completed")
      .reduce((sum, o) => sum + o.usdtAmount, 0),
    totalWithdrawAmount: orders
      .filter((o) => o.orderType === "sell" && o.status === "completed")
      .reduce((sum, o) => sum + o.usdtAmount, 0),
    pending: orders.filter((o) => ["pending", "awaiting_payment", "payment_sent"].includes(o.status)).length,
  };

  // ── No wallet state ────────────────────────────────────────────────────

  if (!walletsGenerated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">No Transactions</h2>
          <p className="text-muted mb-4">Set up your wallet to start depositing and withdrawing.</p>
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
        <div className="col-span-12">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-dark dark:text-white">Transactions</h1>
            <p className="text-muted mt-1">Your deposit and withdrawal history</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Total Deposits</p>
              <p className="text-xl font-bold text-dark dark:text-white">{stats.totalDeposits}</p>
              <p className="text-xs text-green-500 mt-1">{stats.totalDepositAmount.toLocaleString()} USDT</p>
            </div>
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Total Withdrawals</p>
              <p className="text-xl font-bold text-dark dark:text-white">{stats.totalWithdrawals}</p>
              <p className="text-xs text-red-500 mt-1">{stats.totalWithdrawAmount.toLocaleString()} USDT</p>
            </div>
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-xs text-muted mb-1">In Progress</p>
              <p className="text-xl font-bold text-orange-500">{stats.pending}</p>
              <p className="text-xs text-muted mt-1">Active orders</p>
            </div>
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-xs text-muted mb-1">Net Volume</p>
              <p className="text-xl font-bold text-dark dark:text-white">
                {(stats.totalDepositAmount + stats.totalWithdrawAmount).toLocaleString()}
              </p>
              <p className="text-xs text-muted mt-1">USDT total</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
            <div className="flex border-b border-border/50 dark:border-darkborder">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "deposit", label: "Deposits" },
                  { key: "withdrawal", label: "Withdrawals" },
                ] as { key: FilterTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors ${
                    filterTab === tab.key
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted hover:text-dark dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-60">
                    ({tab.key === "all"
                      ? orders.length
                      : tab.key === "deposit"
                      ? orders.filter((o) => o.orderType === "buy").length
                      : orders.filter((o) => o.orderType === "sell").length})
                  </span>
                </button>
              ))}
            </div>

            {/* Status pills */}
            <div className="px-5 py-3 border-b border-border/50 dark:border-darkborder flex flex-wrap gap-2">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "pending", label: "Pending" },
                  { key: "awaiting_payment", label: "Awaiting" },
                  { key: "payment_sent", label: "Processing" },
                  { key: "completed", label: "Completed" },
                  { key: "cancelled", label: "Cancelled" },
                ] as { key: StatusFilter; label: string }[]
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s.key
                      ? "bg-primary text-white"
                      : "bg-muted/30 dark:bg-white/5 text-muted hover:text-dark dark:hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Orders list */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-muted/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-muted">No transactions found</p>
                <div className="mt-4 flex justify-center gap-3">
                  <a
                    href="/deposit"
                    className="py-2 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Deposit
                  </a>
                  <a
                    href="/withdraw"
                    className="py-2 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Withdraw
                  </a>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50 dark:divide-darkborder">
                {filteredOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                    className="w-full text-left px-5 py-4 hover:bg-muted/20 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            order.orderType === "buy"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {order.orderType === "buy" ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-dark dark:text-white">
                            {order.orderType === "buy" ? "Deposit" : "Withdrawal"}
                          </p>
                          <p className="text-xs text-muted">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className={`text-sm font-semibold ${
                            order.orderType === "buy" ? "text-green-500" : "text-red-500"
                          }`}>
                            {order.orderType === "buy" ? "+" : "-"}{order.usdtAmount} USDT
                          </p>
                          <p className="text-xs text-muted">
                            {CURRENCY_SYMBOLS[order.fiatCurrency]}
                            {order.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {selectedOrder?._id === order._id && (
                      <div className="mt-4 pt-4 border-t border-border/50 dark:border-darkborder space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted">Type</p>
                            <p className="text-dark dark:text-white capitalize">{order.orderType === "buy" ? "Deposit" : "Withdrawal"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Exchange Rate</p>
                            <p className="text-dark dark:text-white">
                              1 USDT = {CURRENCY_SYMBOLS[order.fiatCurrency]}{order.exchangeRate.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">USDT Amount</p>
                            <p className="text-dark dark:text-white font-medium">{order.usdtAmount} USDT</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Fiat Amount</p>
                            <p className="text-dark dark:text-white font-medium">
                              {CURRENCY_SYMBOLS[order.fiatCurrency]}
                              {order.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {order.paymentReference && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted">Payment Reference</p>
                              <p className="text-dark dark:text-white font-mono text-xs">{order.paymentReference}</p>
                            </div>
                          )}
                          {order.txHash && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted">Transaction Hash</p>
                              <a
                                href={`https://solscan.io/tx/${order.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 text-xs font-mono break-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {order.txHash.slice(0, 20)}...{order.txHash.slice(-8)}
                              </a>
                            </div>
                          )}
                          {order.userBankDetails && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted">Bank Details</p>
                              <p className="text-dark dark:text-white text-xs">
                                {order.userBankDetails.bankName} • {order.userBankDetails.accountNumber} • {order.userBankDetails.accountName}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted">Order ID</p>
                            <p className="text-dark dark:text-white font-mono text-xs">#{order._id.slice(-8).toUpperCase()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Created</p>
                            <p className="text-dark dark:text-white text-xs">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12"><Footer /></div>
      </div>
    </>
  );
}
