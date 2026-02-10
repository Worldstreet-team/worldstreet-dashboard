"use client";

import React, { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface P2POrder {
  _id: string;
  authUserId: string;
  email: string;
  orderType: "buy" | "sell";
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  platformMarkup: number;
  userSolanaAddress: string;
  userBankDetails?: BankDetails;
  status: string;
  statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
  paymentReference?: string;
  txHash?: string;
  adminNote?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

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

// ── Admin Page ─────────────────────────────────────────────────────────────

export default function AdminP2PPage() {
  const [orders, setOrders] = useState<P2POrder[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<P2POrder | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [txHash, setTxHash] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/p2p/admin?${params.toString()}`);

      if (res.status === 403) {
        setForbidden(true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setSummary(data.summary || {});
      } else {
        setError(data.message || "Failed to fetch orders");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAction = async (orderId: string, action: "approve" | "reject") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/p2p/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          adminNote: adminNote || undefined,
          txHash: txHash || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedOrder(null);
        setAdminNote("");
        setTxHash("");
        fetchOrders();
      } else {
        setError(data.message || "Action failed");
      }
    } catch {
      setError("Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">Access Denied</h1>
          <p className="text-muted">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark dark:text-white">P2P Admin Panel</h1>
          <p className="text-muted mt-1">Manage buy and sell orders</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Pending", key: "payment_sent", color: "text-orange-500" },
            { label: "Completed", key: "completed", color: "text-green-500" },
            { label: "Cancelled", key: "cancelled", color: "text-red-500" },
            { label: "Expired", key: "expired", color: "text-gray-500" },
          ].map(({ label, key, color }) => (
            <div key={key} className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-sm text-muted">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{summary[key] || 0}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["", "payment_sent", "awaiting_payment", "completed", "cancelled", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40"
              }`}
            >
              {s === "" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Orders table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 dark:border-darkborder">
                    <th className="text-left p-4 text-muted font-medium">Order</th>
                    <th className="text-left p-4 text-muted font-medium">User</th>
                    <th className="text-left p-4 text-muted font-medium">Type</th>
                    <th className="text-left p-4 text-muted font-medium">USDT</th>
                    <th className="text-left p-4 text-muted font-medium">Fiat</th>
                    <th className="text-left p-4 text-muted font-medium">Status</th>
                    <th className="text-left p-4 text-muted font-medium">Date</th>
                    <th className="text-left p-4 text-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-darkborder">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-muted/10 dark:hover:bg-white/5">
                      <td className="p-4 font-mono text-xs text-dark dark:text-white">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="p-4">
                        <p className="text-dark dark:text-white text-sm">{order.email}</p>
                        <p className="text-xs text-muted font-mono truncate max-w-[120px]">
                          {order.userSolanaAddress}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            order.orderType === "buy"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {order.orderType}
                        </span>
                      </td>
                      <td className="p-4 text-dark dark:text-white font-medium">
                        {order.usdtAmount}
                      </td>
                      <td className="p-4 text-dark dark:text-white">
                        {CURRENCY_SYMBOLS[order.fiatCurrency]}
                        {order.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="p-4 text-muted text-xs">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        {order.status === "payment_sent" ? (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Review
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-xs font-medium rounded-lg transition-colors hover:bg-muted/40"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-lg">
            <div className="p-6 border-b border-border/50 dark:border-darkborder">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  Order #{selectedOrder._id.slice(-8).toUpperCase()}
                </h3>
                <button onClick={() => setSelectedOrder(null)} className="text-muted hover:text-dark dark:hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Type</p>
                  <p className="text-dark dark:text-white font-medium capitalize">{selectedOrder.orderType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <p className="text-xs text-muted">USDT Amount</p>
                  <p className="text-dark dark:text-white font-medium">{selectedOrder.usdtAmount} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Fiat Amount</p>
                  <p className="text-dark dark:text-white font-medium">
                    {CURRENCY_SYMBOLS[selectedOrder.fiatCurrency]}
                    {selectedOrder.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Rate</p>
                  <p className="text-dark dark:text-white">
                    1 USDT = {CURRENCY_SYMBOLS[selectedOrder.fiatCurrency]}{selectedOrder.exchangeRate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">User Email</p>
                  <p className="text-dark dark:text-white text-sm">{selectedOrder.email}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">User Solana Address</p>
                <p className="text-dark dark:text-white text-xs font-mono bg-muted/30 dark:bg-white/5 p-2 rounded-lg break-all">
                  {selectedOrder.userSolanaAddress}
                </p>
              </div>

              {selectedOrder.paymentReference && (
                <div>
                  <p className="text-xs text-muted mb-1">Payment Reference</p>
                  <p className="text-dark dark:text-white text-sm">{selectedOrder.paymentReference}</p>
                </div>
              )}

              {selectedOrder.txHash && (
                <div>
                  <p className="text-xs text-muted mb-1">TX Hash</p>
                  <a
                    href={`https://solscan.io/tx/${selectedOrder.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-mono break-all hover:underline"
                  >
                    {selectedOrder.txHash}
                  </a>
                </div>
              )}

              {/* Bank details for sell orders */}
              {selectedOrder.orderType === "sell" && selectedOrder.userBankDetails && (
                <div>
                  <p className="text-xs text-muted mb-2">User Bank Details (Send fiat here)</p>
                  <div className="bg-muted/30 dark:bg-white/5 p-3 rounded-lg space-y-1">
                    <p className="text-dark dark:text-white text-sm">
                      <span className="text-muted">Bank:</span> {selectedOrder.userBankDetails.bankName}
                    </p>
                    <p className="text-dark dark:text-white text-sm">
                      <span className="text-muted">Acct:</span> {selectedOrder.userBankDetails.accountNumber}
                    </p>
                    <p className="text-dark dark:text-white text-sm">
                      <span className="text-muted">Name:</span> {selectedOrder.userBankDetails.accountName}
                    </p>
                  </div>
                </div>
              )}

              {/* Status history */}
              <div>
                <p className="text-xs text-muted mb-2">Status History</p>
                <div className="space-y-2">
                  {selectedOrder.statusHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted whitespace-nowrap">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                      <span className="text-dark dark:text-white">{h.note || h.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin actions */}
              {selectedOrder.status === "payment_sent" && (
                <div className="border-t border-border/50 dark:border-darkborder pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-dark dark:text-white">Admin Actions</h4>

                  {selectedOrder.orderType === "buy" && (
                    <div>
                      <label className="block text-xs text-muted mb-1">TX Hash (USDT sent to user)</label>
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Enter Solana TX hash"
                        className="w-full px-3 py-2 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-dark dark:text-white text-sm placeholder-gray-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted mb-1">Admin Note (optional)</label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add a note"
                      className="w-full px-3 py-2 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-dark dark:text-white text-sm placeholder-gray-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction(selectedOrder._id, "reject")}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(selectedOrder._id, "approve")}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
