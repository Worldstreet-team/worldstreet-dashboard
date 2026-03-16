import { Skeleton } from "@/components/ui/skeleton"

/* ── Wallet Card Skeleton ── */
export function WalletCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card">
      {/* Greeting row */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="h-px bg-border/30" />

      {/* Balance area */}
      <div className="flex flex-col gap-2 p-4 border-b border-border/30">
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x divide-border/30">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Markets Table Skeleton ── */
export function MarketsTableSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-card">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="border-t border-border/30 px-4 py-2">
        <div className="grid grid-cols-4 gap-4 py-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-border/10 px-4 py-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

/* ── Recent Trades Skeleton ── */
export function RecentTradesSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-card">
      <div className="flex items-center justify-between p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-14" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-border/20 px-4 py-2.5">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-28" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Watchlist Skeleton ── */
export function WatchlistSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl bg-card">
      <div className="flex items-center justify-between p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-border/20 px-4 py-2.5">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Dashboard Grid Skeleton (composite) ── */
export function DashboardGridSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="flex flex-col gap-4 lg:col-span-3">
        <MarketsTableSkeleton />
        <RecentTradesSkeleton />
      </div>
      <div className="flex flex-col gap-4 lg:col-span-2">
        <WatchlistSkeleton />
      </div>
    </div>
  )
}
