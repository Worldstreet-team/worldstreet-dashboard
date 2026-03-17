"use client";

import React from "react";
import type { UnifiedTransaction } from "@/types/transactions";

// ── Type config ────────────────────────────────────────────────────────────

interface TypeConfig {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  label: string;
}

function getTypeConfig(tx: UnifiedTransaction): TypeConfig {
  switch (tx.type) {
    case "deposit":
    case "spot_deposit":
      return {
        label: tx.type === "spot_deposit" ? "Spot Deposit" : "Deposit",
        bgColor: "bg-green-500/10",
        textColor: "text-green-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        ),
      };
    case "withdrawal":
      return {
        label: "Withdrawal",
        bgColor: "bg-red-500/10",
        textColor: "text-red-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        ),
      };
    case "p2p":
      return tx.subType === "buy"
        ? {
            label: "P2P Deposit",
            bgColor: "bg-green-500/10",
            textColor: "text-green-500",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            ),
          }
        : {
            label: "P2P Withdrawal",
            bgColor: "bg-red-500/10",
            textColor: "text-red-500",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ),
          };
    case "spot_trade":
    case "spot_order":
      return {
        label: tx.pair ? `Trade ${tx.pair}` : "Spot Trade",
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
      };
    case "swap":
      return {
        label: "Swap",
        bgColor: "bg-purple-500/10",
        textColor: "text-purple-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ),
      };
    case "transfer":
      if (tx.subType === "internal" || tx.direction?.includes("-to-")) {
        return {
          label: "Internal Transfer",
          bgColor: "bg-yellow-500/10",
          textColor: "text-yellow-500",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
        };
      }
      return {
        label: "Send",
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        ),
      };
    default:
      return {
        label: "Transaction",
        bgColor: "bg-gray-500/10",
        textColor: "text-gray-500",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      };
  }
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-500", label: "Pending" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-500", label: "Processing" },
    completed: { bg: "bg-green-500/10", text: "text-green-500", label: "Completed" },
    failed: { bg: "bg-red-500/10", text: "text-red-500", label: "Failed" },
    cancelled: { bg: "bg-gray-500/10", text: "text-gray-500", label: "Cancelled" },
    expired: { bg: "bg-gray-500/10", text: "text-gray-400", label: "Expired" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Chain badge ────────────────────────────────────────────────────────────

function ChainBadge({ chain }: { chain?: string }) {
  if (!chain) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/30 dark:bg-white/5 text-muted capitalize">
      {chain}
    </span>
  );
}

// ── Currency helpers ───────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

function formatFiat(amount?: number, currency?: string) {
  if (amount == null || !currency) return null;
  const sym = CURRENCY_SYMBOLS[currency] || "";
  return `${sym}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// ── Amount display ─────────────────────────────────────────────────────────

function getAmountColor(tx: UnifiedTransaction): string {
  if (tx.type === "deposit" || tx.type === "spot_deposit" || (tx.type === "p2p" && tx.subType === "buy")) {
    return "text-green-500";
  }
  if (tx.type === "withdrawal" || (tx.type === "p2p" && tx.subType === "sell")) {
    return "text-red-500";
  }
  if (tx.type === "transfer" && tx.subType === "send") {
    return "text-orange-500";
  }
  return "text-dark dark:text-white";
}

function getAmountPrefix(tx: UnifiedTransaction): string {
  if (tx.type === "deposit" || tx.type === "spot_deposit" || (tx.type === "p2p" && tx.subType === "buy")) {
    return "+";
  }
  if (tx.type === "withdrawal" || (tx.type === "p2p" && tx.subType === "sell") || (tx.type === "transfer" && tx.subType === "send")) {
    return "-";
  }
  return "";
}

// ── Main component ─────────────────────────────────────────────────────────

interface TransactionRowProps {
  transaction: UnifiedTransaction;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode; // Expanded detail
}

export default function TransactionRow({ transaction, isExpanded, onToggle, children }: TransactionRowProps) {
  const config = getTypeConfig(transaction);

  return (
    <button
      onClick={onToggle}
      className="w-full text-left px-5 py-4 hover:bg-muted/20 dark:hover:bg-white/2 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bgColor} ${config.textColor}`}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-dark dark:text-white truncate">{config.label}</p>
              <ChainBadge chain={transaction.chain} />
            </div>
            <p className="text-xs text-muted">
              {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-4 shrink-0">
          <div>
            <p className={`text-sm font-semibold ${getAmountColor(transaction)}`}>
              {getAmountPrefix(transaction)}
              {transaction.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {transaction.token}
            </p>
            {transaction.fiatAmount != null && transaction.fiatCurrency && (
              <p className="text-xs text-muted">
                {formatFiat(transaction.fiatAmount, transaction.fiatCurrency)}
              </p>
            )}
            {transaction.type === "swap" && transaction.toToken && (
              <p className="text-xs text-muted">
                → {typeof transaction.toAmount === "string" ? parseFloat(transaction.toAmount).toLocaleString(undefined, { maximumFractionDigits: 6 }) : transaction.toAmount} {transaction.toToken}
              </p>
            )}
          </div>
          <StatusBadge status={transaction.status} />
        </div>
      </div>

      {/* Expanded detail slot */}
      {isExpanded && children && (
        <div className="mt-4 pt-4 border-t border-border/50 dark:border-darkborder" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </button>
  );
}
