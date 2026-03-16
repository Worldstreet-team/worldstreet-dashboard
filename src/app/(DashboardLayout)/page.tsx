import { Suspense } from "react"
import { WalletCard } from "@/components/dashboard/UserCard"
import { DashboardGrid } from "@/components/dashboard/BentoGrid"
import {
  WalletCardSkeleton,
  DashboardGridSkeleton,
} from "@/components/dashboard/DashboardSkeletons"
import { PendingDeposit } from "@/components/dashboard/PendingDeposit"
import { getPrices, getTrades } from "@/lib/market-actions"

async function WalletCardLoader() {
  const pricesData = await getPrices()
  return (
    <WalletCard
      coins={pricesData.coins}
      prices={pricesData.prices}
      error={
        pricesData.error ||
        (pricesData.coins.length === 0 ? "No market data available" : undefined)
      }
    />
  )
}

async function DashboardGridLoader() {
  const [pricesData, btcTrades, ethTrades, solTrades] = await Promise.all([
    getPrices(),
    getTrades("BTCUSDT", 8),
    getTrades("ETHUSDT", 8),
    getTrades("SOLUSDT", 8),
  ])
  return (
    <DashboardGrid
      coins={pricesData.coins}
      prices={pricesData.prices}
      tradesByPair={{
        BTC: btcTrades.data,
        ETH: ethTrades.data,
        SOL: solTrades.data,
      }}
      error={
        pricesData.error ||
        (pricesData.coins.length === 0 ? "No market data available" : undefined)
      }
    />
  )
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Pending deposit banner (client component) */}
      <PendingDeposit />

      <Suspense fallback={<WalletCardSkeleton />}>
        <WalletCardLoader />
      </Suspense>

      <Suspense fallback={<DashboardGridSkeleton />}>
        <DashboardGridLoader />
      </Suspense>
    </div>
  )
}
