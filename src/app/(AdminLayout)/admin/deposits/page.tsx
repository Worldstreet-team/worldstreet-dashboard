"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";

interface DepositRecord {
  _id: string;
  userId: string;
  email: string;
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  merchantTransactionReference: string;
  globalPayTransactionReference?: string;
  checkoutUrl?: string;
  userSolanaAddress: string;
  status: string;
  txHash?: string;
  deliveryError?: string;
  adminActions?: Array<{
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
  "awaiting_verification",
  "verifying",
  "payment_confirmed",
  "sending_usdt",
  "completed",
  "payment_failed",
  "delivery_failed",
  "cancelled",
];

const statusColors: Record<string, string> = {
  completed: "text-success bg-success/10",
  pending: "text-warning bg-warning/10",
  awaiting_verification: "text-warning bg-warning/10",
  verifying: "text-info bg-info/10",
  payment_confirmed: "text-primary bg-primary/10",
  sending_usdt: "text-info bg-info/10",
  payment_failed: "text-error bg-error/10",
  delivery_failed: "text-error bg-error/10",
  cancelled: "text-muted bg-muted/10",
};

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
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
  const [emailFilter, setEmailFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail modal
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRecord | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchDeposits = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (emailFilter) params.set("email", emailFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/admin/deposits?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setDeposits(data.deposits);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, emailFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchDeposits(1);
  }, [fetchDeposits]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => fetchDeposits(pagination.page), 15000);
    return () => clearInterval(interval);
  }, [fetchDeposits, pagination.page]);

  const handleAction = async (
    depositId: string,
    action: string,
    newStatus?: string
  ) => {
    setActionLoading(depositId);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId,
          action,
          note: adminNote,
          newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchDeposits(pagination.page);
        setSelectedDeposit(null);
        setAdminNote("");
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Deposit Management
        </h1>
        <p className="text-muted text-sm mt-1">
          Track and manage all GlobalPay deposit transactions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
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

      {/* Deposits Table */}
      <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : deposits.length === 0 ? (
          <div className="text-center py-16">
            <Icon icon="ph:empty-duotone" height={40} className="text-muted mx-auto mb-3" />
            <p className="text-muted text-sm">No deposits found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-darkborder bg-herobg/50 dark:bg-darkgray/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    USDT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Fiat
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    GlobalPay Ref
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <tr
                    key={deposit._id}
                    className="border-b border-border dark:border-darkborder hover:bg-herobg/30 dark:hover:bg-darkgray/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-dark dark:text-white text-xs truncate max-w-[180px]">
                        {deposit.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-dark dark:text-white">
                      ${deposit.usdtAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      ₦{deposit.fiatAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-[10px] font-medium ${
                          statusColors[deposit.status] || "text-muted bg-muted/10"
                        }`}
                      >
                        {deposit.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted font-mono truncate max-w-[120px]">
                      {deposit.globalPayTransactionReference || deposit.merchantTransactionReference || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(deposit.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedDeposit(deposit);
                          setAdminNote("");
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
                onClick={() => fetchDeposits(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none border border-border dark:border-darkborder"
              >
                Previous
              </button>
              <button
                onClick={() => fetchDeposits(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-primary disabled:opacity-40 disabled:pointer-events-none border border-border dark:border-darkborder"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDeposit && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDeposit(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-dark border-l border-border dark:border-darkborder shadow-xl overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-dark dark:text-white">
                  Deposit Details
                </h2>
                <button
                  onClick={() => setSelectedDeposit(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Icon icon="tabler:x" height={18} />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    statusColors[selectedDeposit.status] || "text-muted bg-muted/10"
                  }`}
                >
                  {selectedDeposit.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                <InfoRow label="Email" value={selectedDeposit.email} />
                <InfoRow label="USDT Amount" value={`$${selectedDeposit.usdtAmount.toFixed(2)}`} />
                <InfoRow
                  label="Fiat Amount"
                  value={`₦${selectedDeposit.fiatAmount.toLocaleString()}`}
                />
                <InfoRow label="Exchange Rate" value={`₦${selectedDeposit.exchangeRate.toFixed(2)} per USDT`} />
                <InfoRow label="Merchant Ref" value={selectedDeposit.merchantTransactionReference} mono />
                {selectedDeposit.globalPayTransactionReference && (
                  <InfoRow label="GlobalPay Ref" value={selectedDeposit.globalPayTransactionReference} mono />
                )}
                <InfoRow label="User Solana Address" value={selectedDeposit.userSolanaAddress} mono />
                {selectedDeposit.txHash && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted uppercase tracking-wider">TX Hash</span>
                    <a
                      href={`https://solscan.io/tx/${selectedDeposit.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-mono break-all"
                    >
                      {selectedDeposit.txHash}
                    </a>
                  </div>
                )}
                {selectedDeposit.deliveryError && (
                  <div className="p-3 rounded-lg bg-error/10 text-error text-xs">
                    <span className="font-medium">Delivery Error: </span>
                    {selectedDeposit.deliveryError}
                  </div>
                )}
                <InfoRow
                  label="Created"
                  value={new Date(selectedDeposit.createdAt).toLocaleString()}
                />
                {selectedDeposit.completedAt && (
                  <InfoRow
                    label="Completed"
                    value={new Date(selectedDeposit.completedAt).toLocaleString()}
                  />
                )}
              </div>

              {/* Admin Actions History */}
              {selectedDeposit.adminActions && selectedDeposit.adminActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-dark dark:text-white mb-2">
                    Admin Actions
                  </h3>
                  <div className="space-y-2">
                    {selectedDeposit.adminActions.map((a, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-herobg dark:bg-darkgray text-xs"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-dark dark:text-white">
                            {a.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted">
                            {new Date(a.timestamp).toLocaleString()}
                          </span>
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
                <h3 className="text-sm font-semibold text-dark dark:text-white">
                  Admin Actions
                </h3>

                <div>
                  <label className="text-xs text-muted mb-1 block">Admin Note (optional)</label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-sm text-dark dark:text-white resize-none"
                    placeholder="Add a note..."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Retry Delivery */}
                  {["payment_confirmed", "delivery_failed", "sending_usdt"].includes(
                    selectedDeposit.status
                  ) && (
                    <button
                      onClick={() =>
                        handleAction(selectedDeposit._id, "retry_delivery")
                      }
                      disabled={actionLoading === selectedDeposit._id}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedDeposit._id
                        ? "Retrying..."
                        : "Retry USDT Delivery"}
                    </button>
                  )}

                  {/* Mark Completed */}
                  {selectedDeposit.status !== "completed" &&
                    selectedDeposit.status !== "cancelled" && (
                      <button
                        onClick={() =>
                          handleAction(
                            selectedDeposit._id,
                            "override_status",
                            "completed"
                          )
                        }
                        disabled={actionLoading === selectedDeposit._id}
                        className="px-4 py-2 rounded-lg bg-success text-white text-xs font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                      >
                        Mark Completed
                      </button>
                    )}

                  {/* Mark Failed */}
                  {!["completed", "cancelled", "payment_failed", "delivery_failed"].includes(
                    selectedDeposit.status
                  ) && (
                    <button
                      onClick={() =>
                        handleAction(
                          selectedDeposit._id,
                          "override_status",
                          "payment_failed"
                        )
                      }
                      disabled={actionLoading === selectedDeposit._id}
                      className="px-4 py-2 rounded-lg bg-error text-white text-xs font-medium hover:bg-error/90 transition-colors disabled:opacity-50"
                    >
                      Mark Failed
                    </button>
                  )}

                  {/* Cancel */}
                  {!["completed", "cancelled"].includes(selectedDeposit.status) && (
                    <button
                      onClick={() =>
                        handleAction(
                          selectedDeposit._id,
                          "override_status",
                          "cancelled"
                        )
                      }
                      disabled={actionLoading === selectedDeposit._id}
                      className="px-4 py-2 rounded-lg border border-muted/30 text-muted text-xs font-medium hover:bg-muted/10 transition-colors disabled:opacity-50"
                    >
                      Cancel
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

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xs text-dark dark:text-white break-all ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
