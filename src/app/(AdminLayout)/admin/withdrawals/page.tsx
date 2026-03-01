"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";

interface WithdrawalRecord {
  _id: string;
  userId: string;
  email: string;
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  chain: string;
  userWalletAddress: string;
  treasuryWalletAddress: string;
  txHash?: string;
  txVerified: boolean;
  txVerifiedAt?: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  status: string;
  payoutReference?: string;
  adminNote?: string;
  adminActions: Array<{
    action: string;
    adminEmail: string;
    note?: string;
    timestamp: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  "all",
  "pending",
  "usdt_sent",
  "tx_verified",
  "processing",
  "ngn_sent",
  "completed",
  "failed",
  "cancelled",
];

const statusColors: Record<string, string> = {
  completed: "text-success bg-success/10",
  pending: "text-warning bg-warning/10",
  usdt_sent: "text-info bg-info/10",
  tx_verified: "text-primary bg-primary/10",
  processing: "text-info bg-info/10",
  ngn_sent: "text-success bg-success/10",
  failed: "text-error bg-error/10",
  cancelled: "text-muted bg-muted/10",
};

const chainColors: Record<string, string> = {
  solana: "text-[#9945FF] bg-[#9945FF]/10",
  ethereum: "text-[#627EEA] bg-[#627EEA]/10",
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [chainFilter, setChainFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRecord | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [payoutRef, setPayoutRef] = useState("");

  const fetchWithdrawals = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (chainFilter !== "all") params.set("chain", chainFilter);
        if (emailFilter) params.set("email", emailFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/admin/withdrawals?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setWithdrawals(data.withdrawals);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, chainFilter, emailFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchWithdrawals(1);
  }, [fetchWithdrawals]);

  useEffect(() => {
    const interval = setInterval(() => fetchWithdrawals(pagination.page), 10000);
    return () => clearInterval(interval);
  }, [fetchWithdrawals, pagination.page]);

  const handleAction = async (
    withdrawalId: string,
    action: string,
    extra?: { newStatus?: string; payoutReference?: string }
  ) => {
    setActionLoading(withdrawalId);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawalId,
          action,
          note: adminNote,
          ...extra,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchWithdrawals(pagination.page);
        setSelectedWithdrawal(null);
        setAdminNote("");
        setPayoutRef("");
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    if (chain === "solana") return `https://solscan.io/tx/${txHash}`;
    return `https://etherscan.io/tx/${txHash}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Withdrawal Management
        </h1>
        <p className="text-muted text-sm mt-1">
          Track and manage all withdrawal transactions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Statuses" : s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Chain</label>
            <select
              value={chainFilter}
              onChange={(e) => setChainFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
            >
              <option value="all">All Chains</option>
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">User Email</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="Search by email..."
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-16">
            <Icon icon="ph:empty-duotone" height={40} className="text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No withdrawals found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-darkborder bg-herobg/50 dark:bg-darkgray/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">USDT</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">NGN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Chain</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">TX Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr
                    key={w._id}
                    className="border-b border-border dark:border-darkborder hover:bg-herobg/30 dark:hover:bg-darkgray/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-dark dark:text-white text-xs truncate max-w-[180px]">
                        {w.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-dark dark:text-white">
                      ${w.usdtAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      ₦{w.fiatAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium uppercase ${chainColors[w.chain] || "text-muted bg-muted/10"}`}>
                        {w.chain}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-medium ${statusColors[w.status] || "text-muted bg-muted/10"}`}>
                        {w.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {w.txVerified ? (
                        <Icon icon="ph:check-circle-fill" height={16} className="text-success" />
                      ) : w.txHash ? (
                        <Icon icon="ph:clock-duotone" height={16} className="text-warning" />
                      ) : (
                        <Icon icon="ph:minus-circle-duotone" height={16} className="text-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedWithdrawal(w);
                          setAdminNote("");
                          setPayoutRef(w.payoutReference || "");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-darkborder">
            <p className="text-xs text-muted">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchWithdrawals(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none border border-border dark:border-darkborder"
              >
                Previous
              </button>
              <button
                onClick={() => fetchWithdrawals(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none border border-border dark:border-darkborder"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {selectedWithdrawal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedWithdrawal(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-dark border-l border-border dark:border-darkborder shadow-xl overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-dark dark:text-white">
                  Withdrawal Details
                </h2>
                <button
                  onClick={() => setSelectedWithdrawal(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Icon icon="tabler:x" height={18} />
                </button>
              </div>

              {/* Status + Chain */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusColors[selectedWithdrawal.status] || "text-muted bg-muted/10"}`}>
                  {selectedWithdrawal.status.replace(/_/g, " ").toUpperCase()}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase ${chainColors[selectedWithdrawal.chain] || ""}`}>
                  {selectedWithdrawal.chain}
                </span>
                {selectedWithdrawal.txVerified && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-success bg-success/10">
                    TX Verified
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3">
                <InfoRow label="Email" value={selectedWithdrawal.email} />
                <InfoRow label="USDT Amount" value={`$${selectedWithdrawal.usdtAmount.toFixed(2)}`} />
                <InfoRow label="NGN Amount" value={`₦${selectedWithdrawal.fiatAmount.toLocaleString()}`} />
                <InfoRow label="Exchange Rate" value={`₦${selectedWithdrawal.exchangeRate.toFixed(2)} per USDT`} />
                <InfoRow label="User Wallet" value={selectedWithdrawal.userWalletAddress} mono />
                <InfoRow label="Treasury Wallet" value={selectedWithdrawal.treasuryWalletAddress} mono />

                {selectedWithdrawal.txHash && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted uppercase tracking-wider">TX Hash</span>
                    <a
                      href={getExplorerUrl(selectedWithdrawal.chain, selectedWithdrawal.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono break-all"
                    >
                      {selectedWithdrawal.txHash}
                    </a>
                  </div>
                )}

                {/* Bank Details */}
                <div className="p-3 rounded-lg bg-herobg dark:bg-darkgray">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Bank Details</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-dark dark:text-white">
                      <span className="text-muted">Bank: </span>
                      {selectedWithdrawal.bankDetails.bankName}
                    </p>
                    <p className="text-dark dark:text-white">
                      <span className="text-muted">Account: </span>
                      {selectedWithdrawal.bankDetails.accountNumber}
                    </p>
                    <p className="text-dark dark:text-white">
                      <span className="text-muted">Name: </span>
                      {selectedWithdrawal.bankDetails.accountName}
                    </p>
                  </div>
                </div>

                {selectedWithdrawal.payoutReference && (
                  <InfoRow label="Payout Reference" value={selectedWithdrawal.payoutReference} mono />
                )}

                <InfoRow label="Created" value={new Date(selectedWithdrawal.createdAt).toLocaleString()} />
                {selectedWithdrawal.completedAt && (
                  <InfoRow label="Completed" value={new Date(selectedWithdrawal.completedAt).toLocaleString()} />
                )}
              </div>

              {/* Admin Actions History */}
              {selectedWithdrawal.adminActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-dark dark:text-white mb-2">Admin Actions</h3>
                  <div className="space-y-2">
                    {selectedWithdrawal.adminActions.map((a, i) => (
                      <div key={i} className="p-2 rounded-lg bg-herobg dark:bg-darkgray text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium text-dark dark:text-white">
                            {a.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted">{new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-muted">{a.adminEmail}</p>
                        {a.note && <p className="text-muted mt-1">{a.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Action Buttons */}
              <div className="border-t border-border dark:border-darkborder pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-dark dark:text-white">Admin Actions</h3>

                <div>
                  <label className="text-xs text-muted mb-1 block">Admin Note</label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white resize-none"
                    placeholder="Add a note..."
                  />
                </div>

                {/* Payout Reference input for NGN sent */}
                {["tx_verified", "processing"].includes(selectedWithdrawal.status) && (
                  <div>
                    <label className="text-xs text-muted mb-1 block">Payout Reference</label>
                    <input
                      type="text"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white"
                      placeholder="Bank transfer reference..."
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* Verify TX manually */}
                  {!selectedWithdrawal.txVerified && selectedWithdrawal.txHash && (
                    <button
                      onClick={() => handleAction(selectedWithdrawal._id, "verify_tx")}
                      disabled={actionLoading === selectedWithdrawal._id}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Verify TX
                    </button>
                  )}

                  {/* Mark Processing */}
                  {["tx_verified", "usdt_sent"].includes(selectedWithdrawal.status) && (
                    <button
                      onClick={() => handleAction(selectedWithdrawal._id, "mark_processing")}
                      disabled={actionLoading === selectedWithdrawal._id}
                      className="px-4 py-2 rounded-lg bg-info text-white text-xs font-medium hover:bg-info/90 transition-colors disabled:opacity-50"
                    >
                      Mark Processing
                    </button>
                  )}

                  {/* Mark NGN Sent */}
                  {["tx_verified", "processing"].includes(selectedWithdrawal.status) && (
                    <button
                      onClick={() =>
                        handleAction(selectedWithdrawal._id, "mark_ngn_sent", {
                          payoutReference: payoutRef,
                        })
                      }
                      disabled={actionLoading === selectedWithdrawal._id}
                      className="px-4 py-2 rounded-lg bg-warning text-white text-xs font-medium hover:bg-warning/90 transition-colors disabled:opacity-50"
                    >
                      Mark NGN Sent
                    </button>
                  )}

                  {/* Mark Completed */}
                  {["ngn_sent", "processing", "tx_verified"].includes(selectedWithdrawal.status) && (
                    <button
                      onClick={() =>
                        handleAction(selectedWithdrawal._id, "mark_completed", {
                          payoutReference: payoutRef,
                        })
                      }
                      disabled={actionLoading === selectedWithdrawal._id}
                      className="px-4 py-2 rounded-lg bg-success text-white text-xs font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                    >
                      Mark Completed
                    </button>
                  )}

                  {/* Reject */}
                  {!["completed", "cancelled", "failed"].includes(selectedWithdrawal.status) && (
                    <button
                      onClick={() => handleAction(selectedWithdrawal._id, "reject")}
                      disabled={actionLoading === selectedWithdrawal._id}
                      className="px-4 py-2 rounded-lg bg-error text-white text-xs font-medium hover:bg-error/90 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-xs text-dark dark:text-white break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
