"use client";

import React from "react";
import type { TransactionStats as TStats } from "@/types/transactions";

interface TransactionStatsProps {
  stats: TStats | null;
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  subtext,
  subtextColor,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-dark dark:text-white">{value}</p>
      {subtext && (
        <p className={`text-xs mt-1 ${subtextColor || "text-muted"}`}>{subtext}</p>
      )}
    </div>
  );
}

export default function TransactionStats({ stats, isLoading }: TransactionStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4 animate-pulse"
          >
            <div className="h-3 w-20 bg-muted/30 dark:bg-white/10 rounded mb-2" />
            <div className="h-6 w-12 bg-muted/30 dark:bg-white/10 rounded mb-1" />
            <div className="h-3 w-16 bg-muted/30 dark:bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total Deposits"
        value={stats.totalDeposits}
        subtext={`${stats.depositVolume.toLocaleString()} USDT`}
        subtextColor="text-green-500"
      />
      <StatCard
        label="Total Withdrawals"
        value={stats.totalWithdrawals}
        subtext={`${stats.withdrawalVolume.toLocaleString()} USDT`}
        subtextColor="text-red-500"
      />
      <StatCard
        label="Trades & Swaps"
        value={stats.totalTrades + stats.totalSwaps}
        subtext={`${stats.totalTransfers} transfers`}
        subtextColor="text-muted"
      />
      <StatCard
        label="Net Volume"
        value={stats.netVolume.toLocaleString()}
        subtext="USDT total"
      />
    </div>
  );
}
