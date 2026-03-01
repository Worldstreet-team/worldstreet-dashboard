"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface DashboardStats {
  deposits: {
    total: number;
    totalAmount: number;
    pending: number;
    completed: number;
    failed: number;
    todayCount: number;
    todayAmount: number;
    weekCount: number;
    weekAmount: number;
  };
  withdrawals: {
    total: number;
    totalAmount: number;
    pending: number;
    awaitingVerification: number;
    completed: number;
    todayCount: number;
    todayAmount: number;
    weekCount: number;
    weekAmount: number;
  };
  treasury: {
    solana: {
      address: string;
      solBalance: number;
      usdtBalance: number;
      isActive: boolean;
    } | null;
    ethereum: {
      address: string;
      ethBalance: number;
      usdtBalance: number;
      isActive: boolean;
    } | null;
  };
  recentActivity: Array<{
    id: string;
    type: "deposit" | "withdrawal";
    email: string;
    usdtAmount: number;
    status: string;
    createdAt: string;
    chain?: string;
  }>;
}

const statusColors: Record<string, string> = {
  completed: "text-success bg-success/10",
  pending: "text-warning bg-warning/10",
  processing: "text-info bg-info/10",
  usdt_sent: "text-info bg-info/10",
  tx_verified: "text-primary bg-primary/10",
  ngn_sent: "text-success bg-success/10",
  payment_confirmed: "text-primary bg-primary/10",
  sending_usdt: "text-info bg-info/10",
  awaiting_verification: "text-warning bg-warning/10",
  verifying: "text-info bg-info/10",
  payment_failed: "text-error bg-error/10",
  delivery_failed: "text-error bg-error/10",
  failed: "text-error bg-error/10",
  cancelled: "text-muted bg-muted/10",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-error/20 border-t-error mx-auto mb-4" />
          <p className="text-muted text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Icon icon="ph:warning-circle-duotone" height={48} className="text-error mx-auto mb-4" />
          <p className="text-error font-medium">{error || "Failed to load dashboard"}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-muted text-sm mt-1">
            Overview of platform activity and finances
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-dark border border-border dark:border-darkborder text-sm text-muted hover:text-primary transition-colors"
        >
          <Icon icon="ph:arrow-clockwise" height={16} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Deposits Today */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Icon icon="ph:download-simple-duotone" height={22} className="text-success" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Today</span>
          </div>
          <p className="text-2xl font-bold text-dark dark:text-white">
            ${stats.deposits.todayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted mt-1">
            {stats.deposits.todayCount} deposit{stats.deposits.todayCount !== 1 ? "s" : ""} today
          </p>
        </div>

        {/* Withdrawals Today */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Icon icon="ph:upload-simple-duotone" height={22} className="text-warning" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Today</span>
          </div>
          <p className="text-2xl font-bold text-dark dark:text-white">
            ${stats.withdrawals.todayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted mt-1">
            {stats.withdrawals.todayCount} withdrawal{stats.withdrawals.todayCount !== 1 ? "s" : ""} today
          </p>
        </div>

        {/* Pending Deposits */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Icon icon="ph:hourglass-medium-duotone" height={22} className="text-info" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Pending</span>
          </div>
          <p className="text-2xl font-bold text-dark dark:text-white">
            {stats.deposits.pending}
          </p>
          <p className="text-xs text-muted mt-1">
            deposits awaiting action
          </p>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
              <Icon icon="ph:clock-countdown-duotone" height={22} className="text-error" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Pending</span>
          </div>
          <p className="text-2xl font-bold text-dark dark:text-white">
            {stats.withdrawals.pending + stats.withdrawals.awaitingVerification}
          </p>
          <p className="text-xs text-muted mt-1">
            withdrawals awaiting action
          </p>
        </div>
      </div>

      {/* Weekly Stats + Treasury */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Stats */}
        <div className="xl:col-span-1 bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5 space-y-4">
          <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
            <Icon icon="ph:calendar-duotone" height={18} className="text-primary" />
            This Week
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Deposits</span>
              <div className="text-right">
                <p className="text-sm font-medium text-dark dark:text-white">
                  ${stats.deposits.weekAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted">{stats.deposits.weekCount} transactions</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Withdrawals</span>
              <div className="text-right">
                <p className="text-sm font-medium text-dark dark:text-white">
                  ${stats.withdrawals.weekAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted">{stats.withdrawals.weekCount} transactions</p>
              </div>
            </div>
            <div className="border-t border-border dark:border-darkborder pt-3 flex justify-between items-center">
              <span className="text-sm text-muted">All Time Deposits</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {stats.deposits.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">All Time Withdrawals</span>
              <span className="text-sm font-medium text-dark dark:text-white">
                {stats.withdrawals.total}
              </span>
            </div>
          </div>
        </div>

        {/* Treasury Overview */}
        <div className="xl:col-span-2 bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
              <Icon icon="ph:vault-duotone" height={18} className="text-primary" />
              Treasury Wallets
            </h3>
            <Link
              href="/admin/treasury"
              className="text-xs text-primary hover:underline"
            >
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Solana Treasury */}
            <div className="p-4 rounded-lg bg-herobg dark:bg-darkgray border border-border dark:border-darkborder">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-[#9945FF]/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#9945FF]">SOL</span>
                </div>
                <span className="text-sm font-medium text-dark dark:text-white">Solana</span>
                {stats.treasury.solana?.isActive ? (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Active</span>
                ) : (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-muted/10 text-muted text-[10px] font-medium">None</span>
                )}
              </div>
              {stats.treasury.solana ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">SOL Balance</span>
                    <span className="text-dark dark:text-white font-medium">{stats.treasury.solana.solBalance.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">USDT Balance</span>
                    <span className="text-dark dark:text-white font-medium">{stats.treasury.solana.usdtBalance.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted font-mono truncate mt-1">{stats.treasury.solana.address}</p>
                </div>
              ) : (
                <p className="text-xs text-muted">No active Solana treasury wallet</p>
              )}
            </div>

            {/* Ethereum Treasury */}
            <div className="p-4 rounded-lg bg-herobg dark:bg-darkgray border border-border dark:border-darkborder">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-[#627EEA]/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#627EEA]">ETH</span>
                </div>
                <span className="text-sm font-medium text-dark dark:text-white">Ethereum</span>
                {stats.treasury.ethereum?.isActive ? (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">Active</span>
                ) : (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-muted/10 text-muted text-[10px] font-medium">None</span>
                )}
              </div>
              {stats.treasury.ethereum ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">ETH Balance</span>
                    <span className="text-dark dark:text-white font-medium">{stats.treasury.ethereum.ethBalance.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">USDT Balance</span>
                    <span className="text-dark dark:text-white font-medium">{stats.treasury.ethereum.usdtBalance.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-muted font-mono truncate mt-1">{stats.treasury.ethereum.address}</p>
                </div>
              ) : (
                <p className="text-xs text-muted">No active Ethereum treasury wallet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="xl:col-span-1 bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2 mb-4">
            <Icon icon="ph:lightning-duotone" height={18} className="text-warning" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              href="/admin/treasury"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-herobg dark:hover:bg-darkgray transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon icon="ph:plus-circle-duotone" height={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark dark:text-white">Generate Treasury Wallet</p>
                <p className="text-[10px] text-muted">Create new Solana or Ethereum wallet</p>
              </div>
            </Link>
            <Link
              href="/admin/withdrawals"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-herobg dark:hover:bg-darkgray transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Icon icon="ph:queue-duotone" height={18} className="text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark dark:text-white">Pending Withdrawals</p>
                <p className="text-[10px] text-muted">
                  {stats.withdrawals.pending + stats.withdrawals.awaitingVerification} awaiting action
                </p>
              </div>
            </Link>
            <Link
              href="/admin/deposits"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-herobg dark:hover:bg-darkgray transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Icon icon="ph:magnifying-glass-duotone" height={18} className="text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark dark:text-white">View Deposits</p>
                <p className="text-[10px] text-muted">Track and manage deposit transactions</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="xl:col-span-2 bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-5">
          <h3 className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2 mb-4">
            <Icon icon="ph:clock-counter-clockwise-duotone" height={18} className="text-primary" />
            Recent Activity
          </h3>
          {stats.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Icon icon="ph:empty-duotone" height={32} className="text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recentActivity.map((activity) => (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-herobg dark:hover:bg-darkgray transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === "deposit"
                          ? "bg-success/10"
                          : "bg-warning/10"
                      }`}
                    >
                      <Icon
                        icon={
                          activity.type === "deposit"
                            ? "ph:download-simple-duotone"
                            : "ph:upload-simple-duotone"
                        }
                        height={16}
                        className={
                          activity.type === "deposit"
                            ? "text-success"
                            : "text-warning"
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark dark:text-white">
                        {activity.type === "deposit" ? "Deposit" : "Withdrawal"}
                        {activity.chain ? ` (${activity.chain.toUpperCase()})` : ""}
                      </p>
                      <p className="text-[10px] text-muted">{activity.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-dark dark:text-white">
                      ${activity.usdtAmount.toFixed(2)}
                    </p>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        statusColors[activity.status] || "text-muted bg-muted/10"
                      }`}
                    >
                      {activity.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
