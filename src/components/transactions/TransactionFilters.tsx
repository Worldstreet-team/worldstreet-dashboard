"use client";

import React, { useState, useRef, useEffect } from "react";
import type {
  UnifiedTransactionType,
  UnifiedTransactionStatus,
  TransactionFilters,
} from "@/types/transactions";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFilterChange: (filters: Partial<TransactionFilters>) => void;
  totalCount: number;
  onExportPdf: () => void;
}

const TYPE_TABS: { key: UnifiedTransactionType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "spot_trade", label: "Trades" },
  { key: "swap", label: "Swaps" },
  { key: "transfer", label: "Transfers" },
];

const STATUS_PILLS: { key: UnifiedTransactionStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function TransactionFilterBar({
  filters,
  onFilterChange,
  totalCount,
  onExportPdf,
}: TransactionFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeType = filters.type || "all";
  const activeStatus = filters.status || "all";
  const hasDateFilter = filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden">
      {/* Type Tabs */}
      <div className="flex border-b border-border/50 dark:border-darkborder">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange({ type: tab.key === "all" ? undefined : tab.key })}
            className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors ${
              activeType === tab.key
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted hover:text-dark dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Status pills + Date + Export */}
      <div className="px-5 py-3 border-b border-border/50 dark:border-darkborder space-y-3">
        {/* Search bar row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by hash, token, address, amount..."
              value={filters.search || ""}
              onChange={(e) => onFilterChange({ search: e.target.value || undefined })}
              className="w-full pl-10 pr-4 py-2 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Date filter toggle */}
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                hasDateFilter
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 dark:border-darkborder bg-muted/30 dark:bg-white/5 text-muted hover:text-dark dark:hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {hasDateFilter ? "Filtered" : "Date"}
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-20 bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-xl p-4 shadow-lg min-w-65">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
                      className="w-full px-3 py-1.5 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  {hasDateFilter && (
                    <button
                      onClick={() => {
                        onFilterChange({ dateFrom: undefined, dateTo: undefined });
                        setShowDatePicker(false);
                      }}
                      className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PDF Export */}
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border/50 dark:border-darkborder bg-muted/30 dark:bg-white/5 text-muted hover:text-dark dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            PDF
          </button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_PILLS.map((s) => (
            <button
              key={s.key}
              onClick={() => onFilterChange({ status: s.key === "all" ? undefined : s.key })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeStatus === s.key
                  ? "bg-primary text-white"
                  : "bg-muted/30 dark:bg-white/5 text-muted hover:text-dark dark:hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted self-center">
            {totalCount} transaction{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
