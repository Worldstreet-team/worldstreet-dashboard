// Client-side market data fetching
// Types match the dashboard-revamp interfaces

export interface CoinData {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  marketCap: number
  volume24h: number
  image: string
}

export interface TradeResult {
  id: string
  price: string
  amount: string
  side: "buy" | "sell"
  time: number
}

// ── CoinGecko mapping ──────────────────────────────────────────────────────

const COINGECKO_IDS = [
  "bitcoin", "ethereum", "solana", "tron", "toncoin", "tether", "usd-coin",
  "ripple", "cardano", "dogecoin", "polkadot", "chainlink", "avalanche-2",
  "litecoin", "uniswap", "stellar", "cosmos", "near", "aptos", "sui",
  "arbitrum", "optimism", "filecoin", "pepe", "worldcoin-wld",
  "injective-protocol", "sei-network", "celestia", "jupiter-exchange-solana",
  "render-token", "dogwifcoin", "ondo-finance", "pendle", "ethena",
]

const ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", tron: "TRX", toncoin: "TON",
  tether: "USDT", "usd-coin": "USDC", ripple: "XRP", cardano: "ADA",
  dogecoin: "DOGE", polkadot: "DOT", chainlink: "LINK", "avalanche-2": "AVAX",
  "polygon-matic-token": "MATIC", litecoin: "LTC", uniswap: "UNI", stellar: "XLM",
  cosmos: "ATOM", near: "NEAR", aptos: "APT", sui: "SUI", arbitrum: "ARB",
  optimism: "OP", filecoin: "FIL", pepe: "PEPE", "worldcoin-wld": "WLD",
  "injective-protocol": "INJ", "sei-network": "SEI", celestia: "TIA",
  "jupiter-exchange-solana": "JUP", "render-token": "RENDER",
  "artificial-superintelligence-alliance": "FET",
  dogwifcoin: "WIF", "ondo-finance": "ONDO", pendle: "PENDLE", ethena: "ENA",
}

// ── In-memory cache ────────────────────────────────────────────────────────

let priceCache: { coins: CoinData[]; prices: Record<string, number>; ts: number } | null = null
const CACHE_TTL = 5 * 60_000

export async function fetchPrices(): Promise<{
  coins: CoinData[]
  prices: Record<string, number>
  error?: string
}> {
  if (priceCache && Date.now() - priceCache.ts < CACHE_TTL) {
    return { coins: priceCache.coins, prices: priceCache.prices }
  }

  try {
    const ids = COINGECKO_IDS.join(",")
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`
    )

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)

    const data = await res.json()
    const coins: CoinData[] = data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      symbol: ID_TO_SYMBOL[item.id as string] || (item.symbol as string).toUpperCase(),
      name: item.name as string,
      price: (item.current_price as number) ?? 0,
      change24h: (item.price_change_percentage_24h as number) ?? 0,
      marketCap: (item.market_cap as number) ?? 0,
      volume24h: (item.total_volume as number) ?? 0,
      image: (item.image as string) ?? "",
    }))

    const prices: Record<string, number> = {}
    coins.forEach((c) => { prices[c.symbol] = c.price })

    priceCache = { coins, prices, ts: Date.now() }
    return { coins, prices }
  } catch {
    return {
      coins: priceCache?.coins ?? [],
      prices: priceCache?.prices ?? {},
      error: "Failed to load market data",
    }
  }
}

export async function fetchTrades(symbol: string, limit = 8): Promise<TradeResult[]> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`
    )
    if (!res.ok) throw new Error(`Binance ${res.status}`)
    const data = await res.json()
    return data.map((t: Record<string, unknown>) => ({
      id: String(t.id),
      price: t.price as string,
      amount: t.qty as string,
      side: t.isBuyerMaker ? "sell" as const : "buy" as const,
      time: t.time as number,
    }))
  } catch {
    return []
  }
}
