"use client";

import React, { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface TreasuryWalletInfo {
  address: string;
  network: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  solBalance: number;
  usdtBalance: number;
}

interface GeneratedWallet {
  address: string;
  privateKey: string;
  network: string;
}

// ── Treasury Admin Page ────────────────────────────────────────────────────

export default function TreasuryAdminPage() {
  const [wallet, setWallet] = useState<TreasuryWalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  // Newly generated wallet (shown once)
  const [newWallet, setNewWallet] = useState<GeneratedWallet | null>(null);
  const [copied, setCopied] = useState<"address" | "key" | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // ── Fetch existing treasury ────────────────────────────────────────────

  const fetchTreasury = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/treasury");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet || null);
      } else {
        setError(data.message || "Failed to load treasury");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreasury();
  }, [fetchTreasury]);

  // ── Generate new wallet ────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!confirmed) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/treasury", { method: "POST" });
      const data = await res.json();

      if (data.success && data.wallet) {
        setNewWallet(data.wallet);
        setShowKey(true);
        // Refresh treasury info after a short delay
        setTimeout(() => fetchTreasury(), 2000);
      } else {
        setError(data.message || "Failed to generate wallet");
      }
    } catch {
      setError("Failed to generate wallet");
    } finally {
      setGenerating(false);
      setConfirmed(false);
    }
  };

  // ── Copy helper ────────────────────────────────────────────────────────

  const copyToClipboard = async (text: string, type: "address" | "key") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // ── Access denied ──────────────────────────────────────────────────────

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-muted">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              Treasury Wallet
            </h1>
            <p className="text-muted mt-1">
              Manage the Solana treasury wallet used for auto-sending USDT to
              users after deposit.
            </p>
          </div>
          <a
            href="/admin/p2p"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            ← P2P Admin
          </a>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* ── Newly Generated Wallet (shown once) ───────────────────── */}
        {newWallet && (
          <div className="bg-yellow-500/5 border-2 border-yellow-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                  Save Your Private Key NOW
                </h3>
                <p className="text-sm text-muted mt-1">
                  This private key will <strong>never be shown again</strong>.
                  Copy and store it in a secure location (password manager,
                  hardware backup, etc.).
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium">
                Public Address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-black rounded-lg text-sm text-dark dark:text-white break-all border border-border/50 dark:border-darkborder">
                  {newWallet.address}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(newWallet.address, "address")
                  }
                  className="px-3 py-2 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm rounded-lg hover:bg-muted/40 transition-colors shrink-0"
                >
                  {copied === "address" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Private Key */}
            <div className="space-y-1">
              <label className="text-xs text-muted font-medium">
                Private Key (Base58)
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-black rounded-lg text-sm text-dark dark:text-white break-all border border-red-500/30">
                  {showKey
                    ? newWallet.privateKey
                    : "••••••••••••••••••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm rounded-lg hover:bg-muted/40 transition-colors shrink-0"
                >
                  {showKey ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(newWallet.privateKey, "key")
                  }
                  className="px-3 py-2 bg-red-500/10 text-red-500 text-sm rounded-lg hover:bg-red-500/20 transition-colors shrink-0"
                >
                  {copied === "key" ? "Copied!" : "Copy Key"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setNewWallet(null)}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-colors"
            >
              I&apos;ve Saved the Private Key
            </button>
          </div>
        )}

        {/* ── Active Wallet Card ────────────────────────────────────── */}
        {wallet ? (
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl overflow-hidden">
            {/* Wallet header */}
            <div className="p-6 border-b border-border/50 dark:border-darkborder">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-dark dark:text-white">
                      Active Treasury
                    </h2>
                    <p className="text-xs text-muted">
                      Solana • Created by {wallet.createdBy}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="p-6 border-b border-border/50 dark:border-darkborder">
              <label className="text-xs text-muted font-medium mb-1.5 block">
                Wallet Address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm text-dark dark:text-white break-all">
                  {wallet.address}
                </code>
                <button
                  onClick={() => copyToClipboard(wallet.address, "address")}
                  className="px-3 py-2 bg-muted/30 dark:bg-white/5 text-dark dark:text-white text-sm rounded-lg hover:bg-muted/40 transition-colors shrink-0"
                >
                  {copied === "address" ? "Copied!" : "Copy"}
                </button>
                <a
                  href={`https://solscan.io/account/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 transition-colors shrink-0"
                >
                  Solscan ↗
                </a>
              </div>
            </div>

            {/* Balances */}
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4">
                <p className="text-xs text-muted mb-1">SOL Balance</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {wallet.solBalance.toFixed(4)}
                </p>
                <p className="text-xs text-muted mt-1">
                  {wallet.solBalance < 0.01 && (
                    <span className="text-red-500">
                      ⚠ Low — fund SOL for tx fees
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-muted/30 dark:bg-white/5 rounded-xl p-4">
                <p className="text-xs text-muted mb-1">USDT Balance</p>
                <p className="text-2xl font-bold text-dark dark:text-white">
                  {wallet.usdtBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted mt-1">
                  {wallet.usdtBalance < 10 && (
                    <span className="text-yellow-500">
                      ⚠ Low — fund USDT for deposits
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Refresh */}
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchTreasury().finally(() => setLoading(false));
                }}
                className="w-full py-2.5 bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-dark dark:text-white font-medium rounded-xl transition-colors"
              >
                Refresh Balances
              </button>
            </div>
          </div>
        ) : (
          /* ── No Wallet Configured ───────────────────────────────── */
          <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-dark dark:text-white mb-2">
              No Treasury Wallet
            </h2>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Generate a Solana wallet to use as the deposit treasury. After
              generating, fund it with SOL (for fees) and USDT (for user
              deposits).
            </p>
          </div>
        )}

        {/* ── Generate Wallet Section ───────────────────────────────── */}
        <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            {wallet ? "Replace Treasury Wallet" : "Generate Treasury Wallet"}
          </h3>

          {wallet && (
            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
              <p className="text-sm text-red-500">
                <strong>Warning:</strong> Generating a new wallet will
                deactivate the current treasury. Make sure to withdraw all
                funds from the current wallet first.
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
            <p className="text-sm text-muted">
              <strong>Requirements before generating:</strong>
            </p>
            <ul className="text-sm text-muted mt-1 list-disc list-inside space-y-0.5">
              <li>
                <code className="text-xs bg-muted/30 px-1 rounded">
                  TREASURY_ENCRYPTION_KEY
                </code>{" "}
                must be set in environment variables (64-char hex)
              </li>
              <li>After generating, fund the wallet with SOL + USDT</li>
              <li>The private key is shown only once — save it securely</li>
            </ul>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-border/50"
            />
            <span className="text-sm text-dark dark:text-white">
              I understand that generating a new wallet will replace the current
              treasury and the private key will only be shown once.
            </span>
          </label>

          <button
            onClick={handleGenerate}
            disabled={!confirmed || generating}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : wallet ? (
              "Generate New Treasury Wallet"
            ) : (
              "Generate Treasury Wallet"
            )}
          </button>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
            How Deposit Auto-Send Works
          </h3>
          <div className="space-y-3 text-sm text-muted">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                User enters USDT amount and pays in NGN via GlobalPay
                checkout.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                After paying, user clicks &ldquo;I&apos;ve Paid&rdquo; — backend
                requeries GlobalPay to verify.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                If verified, the treasury wallet auto-sends USDT (SPL) to the
                user&apos;s Solana address on-chain.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <span>
                The treasury must always have sufficient SOL (for tx fees) and
                USDT. Monitor balances above.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
