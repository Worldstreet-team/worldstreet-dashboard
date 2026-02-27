"use client";

import React, { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface DepositTransaction {
  _id: string;
  authUserId: string;
  email: string;
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  platformMarkup: number;
  userSolanaAddress: string;
  merchantTransactionReference: string;
  gatewayReference?: string;
  gatewayStatus?: string;
  status: string;
  statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
  txHash?: string;
  deliveryError?: string;
  adminNote?: string;
  createdAt: string;
  completedAt?: string;
}

interface TreasuryBalance {
  address: string;
  usdtBalance: number;
  solBalance: number;
  isLowUsdt: boolean;
  isLowSol: boolean;
}

interface GeneratedWallet {
  address: string;
  privateKey: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Pending" },
    awaiting_verification: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Awaiting Verification" },
    verifying: { bg: "bg-indigo-500/10", text: "text-indigo-500", label: "Verifying" },
    payment_confirmed: { bg: "bg-cyan-500/10", text: "text-cyan-500", label: "Payment Confirmed" },
    sending_usdt: { bg: "bg-purple-500/10", text: "text-purple-500", label: "Sending USDT" },
    completed: { bg: "bg-green-500/10", text: "text-green-500", label: "Completed" },
    payment_failed: { bg: "bg-red-500/10", text: "text-red-500", label: "Payment Failed" },
    delivery_failed: { bg: "bg-orange-500/10", text: "text-orange-500", label: "Delivery Failed" },
    cancelled: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Cancelled" },
  };
  const c = config[status] || { bg: "bg-gray-500/10", text: "text-gray-500", label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Admin Treasury Page ────────────────────────────────────────────────────

export default function AdminTreasuryPage() {
  // Wallet state
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Deposit list state
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [summary, setSummary] = useState<Record<string, { count: number; totalUsdt: number }>>({});
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  // Modal state
  const [selectedDeposit, setSelectedDeposit] = useState<DepositTransaction | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [txHash, setTxHash] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // ── Fetch treasury balance ─────────────────────────────────────────────

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/treasury/balance");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
      } else {
        setBalanceError(data.message || "Failed to fetch balance");
      }
    } catch {
      setBalanceError("Failed to connect");
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // ── Fetch deposits ─────────────────────────────────────────────────────

  const fetchDeposits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/treasury/deposits?${params.toString()}`);
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setDeposits(data.deposits);
        setSummary(data.summary || {});
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError(data.message || "Failed to fetch deposits");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setDepositsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchBalance();
    fetchDeposits();
    const interval = setInterval(() => {
      fetchBalance();
      fetchDeposits();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance, fetchDeposits]);

  // ── Generate wallet ────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerateLoading(true);
    try {
      const res = await fetch("/api/admin/treasury/generate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setGeneratedWallet(data.wallet);
        setShowGenerateConfirm(false);
      } else {
        setError(data.message || "Failed to generate wallet");
      }
    } catch {
      setError("Failed to generate wallet");
    } finally {
      setGenerateLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 3000);
  };

  // ── Admin actions ──────────────────────────────────────────────────────

  const handleAction = async (depositId: string, action: "retry_delivery" | "manual_complete" | "cancel") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/treasury", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId,
          action,
          adminNote: adminNote || undefined,
          txHash: txHash || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedDeposit(null);
        setAdminNote("");
        setTxHash("");
        fetchDeposits();
        fetchBalance();
      } else {
        setError(data.message || "Action failed");
      }
    } catch {
      setError("Failed to perform action");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Forbidden state ────────────────────────────────────────────────────

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
          <h1 className="text-2xl font-bold text-dark dark:text-white">Treasury Management</h1>
          <p className="text-muted mt-1">Manage treasury wallet and deposit transactions</p>
        </div>

        {/* ── Treasury Wallet Section ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Balance card */}
          <div className="md:col-span-2 bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Wallet Overview</h2>
            {balanceLoading ? (
              <div className="flex items-center gap-2 text-muted">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                Loading...
              </div>
            ) : balanceError ? (
              <p className="text-red-500 text-sm">{balanceError}</p>
            ) : balance ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted mb-1">Address</p>
                  <p className="text-dark dark:text-white text-sm font-mono bg-muted/30 dark:bg-white/5 p-2 rounded-lg break-all">
                    {balance.address}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted">USDT Balance</p>
                    <p className={`text-2xl font-bold ${balance.isLowUsdt ? "text-orange-500" : "text-green-500"}`}>
                      {balance.usdtBalance.toFixed(2)}
                    </p>
                    {balance.isLowUsdt && (
                      <p className="text-xs text-orange-500 mt-1">⚠ Low balance — fund treasury</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted">SOL Balance</p>
                    <p className={`text-2xl font-bold ${balance.isLowSol ? "text-orange-500" : "text-dark dark:text-white"}`}>
                      {balance.solBalance.toFixed(4)}
                    </p>
                    {balance.isLowSol && (
                      <p className="text-xs text-orange-500 mt-1">⚠ Low SOL — needs gas</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted text-sm">No treasury wallet configured. Generate one or add to .env</p>
            )}
          </div>

          {/* Generate wallet card */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-6">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Generate Wallet</h2>
            <p className="text-xs text-muted mb-4">
              Generate a new Solana keypair to use as the treasury wallet. You&apos;ll need to save the private key in your .env file.
            </p>

            {generatedWallet ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted mb-1">Address</p>
                  <p className="text-xs font-mono bg-muted/30 dark:bg-white/5 p-2 rounded text-dark dark:text-white break-all">
                    {generatedWallet.address}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-red-500 font-semibold mb-1">Private Key (save now — shown once!)</p>
                  <p className="text-xs font-mono bg-red-500/10 border border-red-500/20 p-2 rounded text-dark dark:text-white break-all">
                    {generatedWallet.privateKey}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedWallet.privateKey)}
                  className="w-full py-2 px-3 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {keyCopied ? "Copied!" : "Copy Private Key"}
                </button>
                <p className="text-[10px] text-muted">
                  Add to .env as: TREASURY_PRIVATE_KEY={generatedWallet.privateKey}
                </p>
              </div>
            ) : showGenerateConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-orange-500 font-medium">
                  Are you sure? This will generate a new keypair. The current treasury wallet will not be replaced automatically.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGenerateConfirm(false)}
                    className="flex-1 py-2 px-3 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm font-medium rounded-lg transition-colors hover:bg-muted/40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generateLoading}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generateLoading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowGenerateConfirm(true)}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Generate New Wallet
              </button>
            )}
          </div>
        </div>

        {/* ── Summary Cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Pending", key: "pending", color: "text-yellow-500" },
            { label: "Awaiting", key: "awaiting_verification", color: "text-blue-500" },
            { label: "Completed", key: "completed", color: "text-green-500" },
            { label: "Delivery Failed", key: "delivery_failed", color: "text-orange-500" },
            { label: "Cancelled", key: "cancelled", color: "text-gray-500" },
          ].map(({ label, key, color }) => (
            <div key={key} className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{summary[key]?.count || 0}</p>
              {summary[key]?.totalUsdt > 0 && (
                <p className="text-xs text-muted">{summary[key].totalUsdt.toFixed(2)} USDT</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Status Filters ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: "", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "awaiting_verification", label: "Awaiting" },
            { value: "payment_confirmed", label: "Confirmed" },
            { value: "sending_usdt", label: "Sending" },
            { value: "completed", label: "Completed" },
            { value: "delivery_failed", label: "Failed Delivery" },
            { value: "payment_failed", label: "Payment Failed" },
            { value: "cancelled", label: "Cancelled" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? "bg-primary text-white"
                  : "bg-muted/30 dark:bg-white/5 text-dark dark:text-white hover:bg-muted/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-400 text-xs">Dismiss</button>
          </div>
        )}

        {/* ── Deposits Table ──────────────────────────────────────────── */}
        {depositsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 dark:border-darkborder">
                      <th className="text-left p-4 text-muted font-medium">Ref</th>
                      <th className="text-left p-4 text-muted font-medium">User</th>
                      <th className="text-left p-4 text-muted font-medium">USDT</th>
                      <th className="text-left p-4 text-muted font-medium">Fiat</th>
                      <th className="text-left p-4 text-muted font-medium">Rate</th>
                      <th className="text-left p-4 text-muted font-medium">Status</th>
                      <th className="text-left p-4 text-muted font-medium">Date</th>
                      <th className="text-left p-4 text-muted font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 dark:divide-darkborder">
                    {deposits.map((deposit) => (
                      <tr key={deposit._id} className="hover:bg-muted/10 dark:hover:bg-white/5">
                        <td className="p-4 font-mono text-xs text-dark dark:text-white">
                          {deposit.merchantTransactionReference.slice(-12)}
                        </td>
                        <td className="p-4">
                          <p className="text-dark dark:text-white text-sm">{deposit.email}</p>
                          <p className="text-xs text-muted font-mono truncate max-w-[120px]">
                            {deposit.userSolanaAddress}
                          </p>
                        </td>
                        <td className="p-4 text-dark dark:text-white font-medium">
                          {deposit.usdtAmount}
                        </td>
                        <td className="p-4 text-dark dark:text-white">
                          {CURRENCY_SYMBOLS[deposit.fiatCurrency] || ""}
                          {deposit.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-muted text-xs">
                          {CURRENCY_SYMBOLS[deposit.fiatCurrency]}{deposit.exchangeRate}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={deposit.status} />
                        </td>
                        <td className="p-4 text-muted text-xs">
                          {new Date(deposit.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          {deposit.status === "delivery_failed" ? (
                            <button
                              onClick={() => setSelectedDeposit(deposit)}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Fix
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedDeposit(deposit)}
                              className="px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-xs font-medium rounded-lg transition-colors hover:bg-muted/40"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {deposits.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted">
                          No deposits found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm rounded-lg disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm rounded-lg disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Deposit Detail Modal ────────────────────────────────────────── */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDeposit(null)} />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-lg">
            {/* Modal header */}
            <div className="p-6 border-b border-border/50 dark:border-darkborder">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-dark dark:text-white">
                  Deposit {selectedDeposit.merchantTransactionReference.slice(-12)}
                </h3>
                <button onClick={() => setSelectedDeposit(null)} className="text-muted hover:text-dark dark:hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Status</p>
                  <StatusBadge status={selectedDeposit.status} />
                </div>
                <div>
                  <p className="text-xs text-muted">USDT Amount</p>
                  <p className="text-dark dark:text-white font-medium">{selectedDeposit.usdtAmount} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Fiat Amount</p>
                  <p className="text-dark dark:text-white font-medium">
                    {CURRENCY_SYMBOLS[selectedDeposit.fiatCurrency]}
                    {selectedDeposit.fiatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Exchange Rate</p>
                  <p className="text-dark dark:text-white">
                    1 USDT = {CURRENCY_SYMBOLS[selectedDeposit.fiatCurrency]}{selectedDeposit.exchangeRate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">User Email</p>
                  <p className="text-dark dark:text-white text-sm">{selectedDeposit.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Markup</p>
                  <p className="text-dark dark:text-white text-sm">{selectedDeposit.platformMarkup}%</p>
                </div>
              </div>

              {/* Addresses */}
              <div>
                <p className="text-xs text-muted mb-1">User Solana Address</p>
                <p className="text-dark dark:text-white text-xs font-mono bg-muted/30 dark:bg-white/5 p-2 rounded-lg break-all">
                  {selectedDeposit.userSolanaAddress}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted mb-1">Merchant Reference</p>
                <p className="text-dark dark:text-white text-xs font-mono bg-muted/30 dark:bg-white/5 p-2 rounded-lg break-all">
                  {selectedDeposit.merchantTransactionReference}
                </p>
              </div>

              {/* Gateway info */}
              {selectedDeposit.gatewayReference && (
                <div>
                  <p className="text-xs text-muted mb-1">Gateway Reference</p>
                  <p className="text-dark dark:text-white text-sm">{selectedDeposit.gatewayReference}</p>
                </div>
              )}
              {selectedDeposit.gatewayStatus && (
                <div>
                  <p className="text-xs text-muted mb-1">Gateway Status</p>
                  <p className="text-dark dark:text-white text-sm">{selectedDeposit.gatewayStatus}</p>
                </div>
              )}

              {/* TX Hash */}
              {selectedDeposit.txHash && (
                <div>
                  <p className="text-xs text-muted mb-1">TX Hash</p>
                  <a
                    href={`https://solscan.io/tx/${selectedDeposit.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs font-mono break-all hover:underline"
                  >
                    {selectedDeposit.txHash}
                  </a>
                </div>
              )}

              {/* Delivery error */}
              {selectedDeposit.deliveryError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-500 font-semibold mb-1">Delivery Error</p>
                  <p className="text-sm text-red-400">{selectedDeposit.deliveryError}</p>
                </div>
              )}

              {/* Admin note */}
              {selectedDeposit.adminNote && (
                <div>
                  <p className="text-xs text-muted mb-1">Admin Note</p>
                  <p className="text-dark dark:text-white text-sm">{selectedDeposit.adminNote}</p>
                </div>
              )}

              {/* Status history */}
              <div>
                <p className="text-xs text-muted mb-2">Status History</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedDeposit.statusHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted whitespace-nowrap">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                      <span className="text-dark dark:text-white">{h.note || h.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Admin Actions ────────────────────────────────────────── */}
              {["delivery_failed", "payment_confirmed", "sending_usdt", "pending", "awaiting_verification", "verifying"].includes(
                selectedDeposit.status
              ) && (
                <div className="border-t border-border/50 dark:border-darkborder pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-dark dark:text-white">Admin Actions</h4>

                  {/* Retry delivery (delivery_failed only) */}
                  {selectedDeposit.status === "delivery_failed" && (
                    <button
                      onClick={() => handleAction(selectedDeposit._id, "retry_delivery")}
                      disabled={actionLoading}
                      className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? "Retrying..." : "Retry USDT Delivery"}
                    </button>
                  )}

                  {/* Manual complete (delivery_failed, payment_confirmed, sending_usdt) */}
                  {["delivery_failed", "payment_confirmed", "sending_usdt"].includes(selectedDeposit.status) && (
                    <div className="space-y-2">
                      <label className="block text-xs text-muted">TX Hash (for manual completion)</label>
                      <input
                        type="text"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Enter Solana TX hash"
                        className="w-full px-3 py-2 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-dark dark:text-white text-sm placeholder-gray-500"
                      />
                      <button
                        onClick={() => handleAction(selectedDeposit._id, "manual_complete")}
                        disabled={actionLoading || !txHash}
                        className="w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? "Completing..." : "Mark as Completed"}
                      </button>
                    </div>
                  )}

                  {/* Note + Cancel */}
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

                  <button
                    onClick={() => handleAction(selectedDeposit._id, "cancel")}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel Deposit
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
