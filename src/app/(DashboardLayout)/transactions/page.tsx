"use client";

import React, { useState } from "react";
import { useWallet } from "@/app/context/walletContext";
import Footer from "@/components/dashboard/Footer";
import { useUnifiedTransactions } from "@/components/transactions/useUnifiedTransactions";
import TransactionStats from "@/components/transactions/TransactionStats";
import TransactionFilterBar from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";
import TransactionDetail from "@/components/transactions/TransactionDetail";
import { exportTransactionsPdf } from "@/lib/exportTransactionsPdf";

export default function TransactionsPage() {
  const { walletsGenerated } = useWallet();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    transactions,
    stats,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    filters,
    setFilters,
    sentinelRef,
  } = useUnifiedTransactions({ pollInterval: 30000 });

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
            <p className="text-muted mt-1">Your complete transaction history</p>
          </div>

          {/* Stats Cards */}
          <TransactionStats stats={stats} isLoading={isLoading} />

          {/* Filters + Search */}
          <TransactionFilterBar
            filters={filters}
            onFilterChange={setFilters}
            totalCount={transactions.length}
            onExportPdf={() => exportTransactionsPdf(transactions)}
          />

          {/* Transaction List */}
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl shadow-sm overflow-hidden mt-4">
            {error && (
              <div className="px-5 py-3 bg-red-500/10 text-red-500 text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : transactions.length === 0 ? (
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
                {transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    isExpanded={expandedId === tx.id}
                    onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  >
                    <TransactionDetail transaction={tx} />
                  </TransactionRow>
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-4">
                {isLoadingMore && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12"><Footer /></div>
      </div>
    </>
  );
}
