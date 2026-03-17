"use client";

import React from "react";
import type { UnifiedTransaction } from "@/types/transactions";

// ── Explorer URL helpers ───────────────────────────────────────────────────

function getExplorerUrl(chain: string | undefined, txHash: string): string {
  switch (chain) {
    case "solana": return `https://solscan.io/tx/${txHash}`;
    case "ethereum": return `https://etherscan.io/tx/${txHash}`;
    case "arbitrum": return `https://arbiscan.io/tx/${txHash}`;
    case "sui": return `https://suiscan.xyz/mainnet/tx/${txHash}`;
    case "tron": return `https://tronscan.org/#/transaction/${txHash}`;
    default: return `https://solscan.io/tx/${txHash}`;
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

// ── Detail row helper ──────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="text-dark dark:text-white text-sm">{children}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface TransactionDetailProps {
  transaction: UnifiedTransaction;
}

export default function TransactionDetail({ transaction: tx }: TransactionDetailProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {/* Type */}
      <DetailRow label="Type">
        <span className="capitalize">
          {tx.type === "p2p" ? `P2P ${tx.subType}` : tx.type.replace(/_/g, " ")}
        </span>
      </DetailRow>

      {/* Status */}
      <DetailRow label="Status">
        <span className="capitalize">{tx.status}</span>
      </DetailRow>

      {/* Amount */}
      <DetailRow label="Amount">
        <span className="font-medium">
          {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.token}
        </span>
      </DetailRow>

      {/* Chain */}
      {tx.chain && (
        <DetailRow label="Network">
          <span className="capitalize">{tx.chain}</span>
        </DetailRow>
      )}

      {/* Fiat info */}
      {tx.fiatAmount != null && tx.fiatCurrency && (
        <>
          <DetailRow label="Fiat Amount">
            {CURRENCY_SYMBOLS[tx.fiatCurrency] || ""}
            {tx.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </DetailRow>
          {tx.exchangeRate && (
            <DetailRow label="Exchange Rate">
              1 USDT = {CURRENCY_SYMBOLS[tx.fiatCurrency] || ""}
              {tx.exchangeRate.toLocaleString()}
            </DetailRow>
          )}
        </>
      )}

      {/* Trade-specific */}
      {tx.pair && (
        <DetailRow label="Pair">{tx.pair}</DetailRow>
      )}
      {tx.side && (
        <DetailRow label="Side">
          <span className={tx.side.toLowerCase() === "buy" ? "text-green-500" : "text-red-500"}>
            {String(tx.side).toUpperCase()}
          </span>
        </DetailRow>
      )}
      {tx.price != null && (
        <DetailRow label="Price">{tx.price.toLocaleString(undefined, { maximumFractionDigits: 8 })}</DetailRow>
      )}

      {/* Swap-specific */}
      {tx.type === "swap" && (
        <>
          {tx.fromToken && tx.toToken && (
            <DetailRow label="Swap">
              {tx.fromToken} → {tx.toToken}
            </DetailRow>
          )}
          {tx.fromChain && tx.toChain && (
            <DetailRow label="Route">
              <span className="capitalize">{tx.fromChain}</span> → <span className="capitalize">{tx.toChain}</span>
            </DetailRow>
          )}
          {tx.toAmount && (
            <DetailRow label="Received">
              {typeof tx.toAmount === "string"
                ? parseFloat(tx.toAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })
                : tx.toAmount}{" "}
              {tx.toToken}
            </DetailRow>
          )}
        </>
      )}

      {/* Transfer direction */}
      {tx.direction && (
        <DetailRow label="Direction">
          <span className="capitalize">{tx.direction.replace(/-/g, " → ").replace(/to →/g, "to")}</span>
        </DetailRow>
      )}

      {/* Addresses */}
      {tx.fromAddress && (
        <div className="col-span-2">
          <DetailRow label="From Address">
            <span className="font-mono text-xs break-all">{tx.fromAddress}</span>
          </DetailRow>
        </div>
      )}
      {tx.toAddress && (
        <div className="col-span-2">
          <DetailRow label="To Address">
            <span className="font-mono text-xs break-all">{tx.toAddress}</span>
          </DetailRow>
        </div>
      )}

      {/* Bank details */}
      {tx.bankDetails && (
        <div className="col-span-2">
          <DetailRow label="Bank Details">
            <span className="text-xs">
              {tx.bankDetails.bankName} &bull; {tx.bankDetails.accountNumber} &bull; {tx.bankDetails.accountName}
            </span>
          </DetailRow>
        </div>
      )}

      {/* Transaction hash */}
      {tx.txHash && (
        <div className="col-span-2">
          <p className="text-xs text-muted">Transaction Hash</p>
          <a
            href={getExplorerUrl(tx.chain, tx.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 text-xs font-mono break-all"
          >
            {tx.txHash.slice(0, 20)}...{tx.txHash.slice(-8)}
          </a>
        </div>
      )}

      {/* ID and date */}
      <DetailRow label="ID">
        <span className="font-mono text-xs">#{tx.id.slice(-8).toUpperCase()}</span>
      </DetailRow>
      <DetailRow label="Created">
        <span className="text-xs">{new Date(tx.createdAt).toLocaleString()}</span>
      </DetailRow>
      {tx.completedAt && (
        <DetailRow label="Completed">
          <span className="text-xs">{new Date(tx.completedAt).toLocaleString()}</span>
        </DetailRow>
      )}
    </div>
  );
}
