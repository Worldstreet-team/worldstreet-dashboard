"use client"

import * as React from "react"
import { Icon } from "@iconify/react"
import { useAuth } from "@/app/context/authContext"
import { useWallet } from "@/app/context/walletContext"
import { ErrorState } from "@/components/dashboard/ErrorState"
import type { CoinData } from "@/lib/market-actions"

function truncAddr(addr: string) {
  if (!addr || addr.length < 14) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

interface WalletCardProps {
  coins: CoinData[]
  prices: Record<string, number>
  error?: string
}

const WALLET_VIEWS = [
  { key: "total",   label: "Total",   icon: "solar:coin-bold",         sub: "All accounts" },
  { key: "main",    label: "Main",    icon: "solar:wallet-bold",       sub: "USDT balance" },
  { key: "spot",    label: "Spot",    icon: "solar:chart-bold",        sub: "Spot trading" },
  { key: "futures", label: "Futures", icon: "solar:chart-2-bold",      sub: "Futures wallet" },
] as const

type WalletView = (typeof WALLET_VIEWS)[number]["key"]

export function WalletCard({ error }: WalletCardProps) {
  const { user, loading } = useAuth()
  const walletCtx = useWallet()
  const [isCopied, setIsCopied] = React.useState(false)
  const [activeView, setActiveView] = React.useState<WalletView>("total")

  const isLoaded = !loading
  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Trader"
    : "Trader"

  const solAddress = walletCtx?.addresses?.solana ?? ""
  const currentView = WALLET_VIEWS.find((v) => v.key === activeView)!

  const handleCopy = () => {
    if (solAddress) {
      navigator.clipboard.writeText(solAddress)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    }
  }

  if (error) return <ErrorState message={error} />

  return (
    <div className="rounded-2xl bg-card">
      {/* ── Top: Greeting + Deposit / Withdraw ── */}
      <div data-onboarding="dash-greeting" className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isLoaded ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          )}
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight">
              {isLoaded ? `Welcome back, ${displayName}!` : "Loading…"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Here&apos;s what&apos;s happening with your portfolio today.
            </p>
          </div>
        </div>

        <div data-onboarding="dash-actions" className="flex items-center gap-2">
          <a
            href="/deposit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
          >
            <Icon icon="solar:transfer-horizontal-bold" className="h-3.5 w-3.5" />
            Deposit
          </a>
          <a
            href="/withdraw"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <Icon icon="solar:card-bold" className="h-3.5 w-3.5" />
            Withdraw
          </a>
        </div>
      </div>

      {/* ── Separator ── */}
      <div className="h-px bg-border/30" />

      {/* ── Balance selector ── */}
      <div data-onboarding="dash-balance" className="flex flex-col gap-2 p-4 border-b border-border/30">
        <div className="flex items-center gap-0.5">
          {WALLET_VIEWS.map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeView === view.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              }`}
            >
              <Icon icon={view.icon} className="h-3 w-3" />
              {view.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-bold tabular-nums tracking-tight">$0.00</span>
          {activeView === "main" && solAddress && (
            <button
              onClick={handleCopy}
              className="mb-0.5 inline-flex items-center gap-1 rounded bg-accent/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-accent"
            >
              {truncAddr(solAddress)}
              <Icon
                icon="solar:copy-bold"
                className={`h-2.5 w-2.5 ${isCopied ? "text-emerald-500" : "text-muted-foreground/50"}`}
              />
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{currentView.sub}</span>
      </div>

      {/* ── Stats row ── */}
      <div data-onboarding="dash-stats" className="grid grid-cols-3 divide-x divide-border/30">
        {/* Today's P&L */}
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Today&apos;s P&amp;L
            </span>
          </div>
          <span className="text-lg font-bold tabular-nums tracking-tight text-emerald-500">+$0.00</span>
          <span className="text-[10px] text-muted-foreground">24h change</span>
        </div>

        {/* Assets */}
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center gap-1.5">
            <Icon icon="solar:transfer-horizontal-bold" className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Assets
            </span>
          </div>
          <span className="text-lg font-bold tabular-nums tracking-tight">0</span>
          <span className="text-[10px] text-muted-foreground">Active tokens</span>
        </div>

        {/* Networks */}
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center gap-1.5">
            <Icon icon="solar:globe-bold" className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Networks
            </span>
          </div>
          <span className="text-lg font-bold tabular-nums tracking-tight">6</span>
          <span className="text-[10px] text-muted-foreground">SOL · ETH · ARB · SUI · TON · TRX</span>
        </div>
      </div>
    </div>
  )
}
