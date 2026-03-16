"use server"

// ── Types ──────────────────────────────────────────────────────────────────

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

export interface PricesResponse {
  prices: Record<string, number>
  coins: CoinData[]
  fetchedAt: number
  error?: string
}

export interface TradeResult {
  id: string
  price: string
  amount: string
  side: "buy" | "sell"
  time: number
}

export interface TradesResponse {
  success: boolean
  source?: string
  data: TradeResult[]
  error?: string
}

// ── Coin Mappings ──────────────────────────────────────────────────────────

const CORE_COINS = [
  "bitcoin", "ethereum", "solana", "tron", "toncoin", "tether", "usd-coin",
]

const MARKET_COINS = [
  "ripple", "cardano", "dogecoin", "polkadot", "chainlink", "avalanche-2",
  "polygon-matic-token", "litecoin", "uniswap", "stellar", "cosmos", "near",
  "aptos", "sui", "arbitrum", "optimism", "filecoin", "pepe", "worldcoin-wld",
  "injective-protocol", "sei-network", "celestia", "jupiter-exchange-solana",
  "render-token", "artificial-superintelligence-alliance", "dogwifcoin",
  "ondo-finance", "pendle", "ethena",
]

const ALL_COIN_IDS = [...CORE_COINS, ...MARKET_COINS]

const ID_TO_SYMBOL: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", tron: "TRX", toncoin: "TON",
  tether: "USDT", "usd-coin": "USDC", ripple: "XRP", cardano: "ADA",
  dogecoin: "DOGE", polkadot: "DOT", chainlink: "LINK", "avalanche-2": "AVAX",
  "polygon-matic-token": "MATIC", litecoin: "LTC", uniswap: "UNI",
  stellar: "XLM", cosmos: "ATOM", near: "NEAR", aptos: "APT", sui: "SUI",
  arbitrum: "ARB", optimism: "OP", filecoin: "FIL", pepe: "PEPE",
  "worldcoin-wld": "WLD", "injective-protocol": "INJ", "sei-network": "SEI",
  celestia: "TIA", "jupiter-exchange-solana": "JUP", "render-token": "RENDER",
  "artificial-superintelligence-alliance": "FET", dogwifcoin: "WIF",
  "ondo-finance": "ONDO", pendle: "PENDLE", ethena: "ENA",
}

const KUCOIN_SYMBOLS: Record<string, string> = {
  bitcoin: "BTC-USDT", ethereum: "ETH-USDT", solana: "SOL-USDT",
  tron: "TRX-USDT", toncoin: "TON-USDT", ripple: "XRP-USDT",
  cardano: "ADA-USDT", dogecoin: "DOGE-USDT", polkadot: "DOT-USDT",
  chainlink: "LINK-USDT", "avalanche-2": "AVAX-USDT",
  "polygon-matic-token": "MATIC-USDT", litecoin: "LTC-USDT",
  uniswap: "UNI-USDT", stellar: "XLM-USDT", cosmos: "ATOM-USDT",
  near: "NEAR-USDT", aptos: "APT-USDT", sui: "SUI-USDT",
  arbitrum: "ARB-USDT", optimism: "OP-USDT", filecoin: "FIL-USDT",
  pepe: "PEPE-USDT", "worldcoin-wld": "WLD-USDT",
  "injective-protocol": "INJ-USDT", "sei-network": "SEI-USDT",
  celestia: "TIA-USDT", "jupiter-exchange-solana": "JUP-USDT",
  "render-token": "RENDER-USDT",
  "artificial-superintelligence-alliance": "FET-USDT",
  dogwifcoin: "WIF-USDT", "ondo-finance": "ONDO-USDT",
  pendle: "PENDLE-USDT", ethena: "ENA-USDT",
}

const COIN_NAMES: Record<string, string> = {
  bitcoin: "Bitcoin", ethereum: "Ethereum", solana: "Solana", tron: "TRON",
  toncoin: "Toncoin", tether: "Tether", "usd-coin": "USD Coin",
  ripple: "XRP", cardano: "Cardano", dogecoin: "Dogecoin", polkadot: "Polkadot",
  chainlink: "Chainlink", "avalanche-2": "Avalanche",
  "polygon-matic-token": "Polygon", litecoin: "Litecoin", uniswap: "Uniswap",
  stellar: "Stellar", cosmos: "Cosmos", near: "NEAR Protocol", aptos: "Aptos",
  sui: "Sui", arbitrum: "Arbitrum", optimism: "Optimism", filecoin: "Filecoin",
  pepe: "Pepe", "worldcoin-wld": "Worldcoin", "injective-protocol": "Injective",
  "sei-network": "Sei", celestia: "Celestia", "jupiter-exchange-solana": "Jupiter",
  "render-token": "Render", "artificial-superintelligence-alliance": "FET",
  dogwifcoin: "dogwifhat", "ondo-finance": "Ondo", pendle: "Pendle", ethena: "Ethena",
}

const COIN_IMAGES: Record<string, string> = {
  bitcoin: "https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png",
  ethereum: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
  solana: "https://coin-images.coingecko.com/coins/images/4128/small/solana.png",
  tron: "https://coin-images.coingecko.com/coins/images/1094/small/tron-logo.png",
  toncoin: "https://coin-images.coingecko.com/coins/images/17980/small/ton_symbol.png",
  tether: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png",
  "usd-coin": "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png",
  ripple: "https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  cardano: "https://coin-images.coingecko.com/coins/images/975/small/cardano.png",
  dogecoin: "https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png",
  polkadot: "https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png",
  chainlink: "https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  "avalanche-2": "https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  "polygon-matic-token": "https://coin-images.coingecko.com/coins/images/4713/small/polygon.png",
  litecoin: "https://coin-images.coingecko.com/coins/images/2/small/litecoin.png",
  uniswap: "https://coin-images.coingecko.com/coins/images/12504/small/uniswap-logo.png",
  stellar: "https://coin-images.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png",
  cosmos: "https://coin-images.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  near: "https://coin-images.coingecko.com/coins/images/10365/small/near.jpg",
  aptos: "https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png",
  sui: "https://coin-images.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
  arbitrum: "https://coin-images.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  optimism: "https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png",
  filecoin: "https://coin-images.coingecko.com/coins/images/12817/small/filecoin.png",
  pepe: "https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  "worldcoin-wld": "https://coin-images.coingecko.com/coins/images/31069/small/worldcoin.jpeg",
  "injective-protocol": "https://coin-images.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  "sei-network": "https://coin-images.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png",
  celestia: "https://coin-images.coingecko.com/coins/images/31967/small/tia.jpg",
  "jupiter-exchange-solana": "https://coin-images.coingecko.com/coins/images/34188/small/jup.png",
  "render-token": "https://coin-images.coingecko.com/coins/images/11636/small/rndr.png",
  "artificial-superintelligence-alliance": "https://coin-images.coingecko.com/coins/images/5681/small/Fetch.jpg",
  dogwifcoin: "https://coin-images.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  "ondo-finance": "https://coin-images.coingecko.com/coins/images/26580/small/ONDO.png",
  pendle: "https://coin-images.coingecko.com/coins/images/15069/small/Pendle_Logo_Normal-03.png",
  ethena: "https://coin-images.coingecko.com/coins/images/36530/small/ethena.png",
}

// ── Cache ──────────────────────────────────────────────────────────────────

function sanitize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

let priceCache: PricesResponse | null = null
let priceCacheTs = 0
let backoffUntil = 0
const PRICE_TTL = 5 * 60_000
const BACKOFF_MS = 90_000

const tradeCache = new Map<string, { data: TradesResponse; ts: number }>()
const TRADE_TTL = 30_000

// ── Hyperliquid ────────────────────────────────────────────────────────────

const HL_INFO = "https://api.hyperliquid.xyz/info"

async function hlPost(body: Record<string, unknown>) {
  const res = await fetch(HL_INFO, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) throw new Error(`Hyperliquid ${res.status}`)
  return res.json()
}

async function fetchHyperliquidPrices(): Promise<PricesResponse | null> {
  try {
    const [meta, mids] = await Promise.all([
      hlPost({ type: "meta" }),
      hlPost({ type: "allMids" }),
    ])
    const universe = meta?.universe as { name: string; szDecimals: number }[] | undefined
    if (!universe || !mids) return null

    const prices: Record<string, number> = { USDT: 1, USDC: 1 }
    const coins: CoinData[] = []

    for (const asset of universe) {
      const sym = asset.name.toUpperCase()
      const mid = parseFloat(mids[asset.name] ?? mids[sym] ?? "0")
      if (mid <= 0) continue
      const coinId = Object.entries(ID_TO_SYMBOL).find(([, s]) => s === sym)?.[0]
      if (!coinId) continue
      prices[sym] = mid
      coins.push({
        id: coinId, symbol: sym, name: COIN_NAMES[coinId] || sym,
        price: mid, change24h: 0, marketCap: 0, volume24h: 0,
        image: COIN_IMAGES[coinId] || "",
      })
    }
    if (coins.length === 0) return null

    if (!coins.find((c) => c.symbol === "USDT")) {
      coins.push({ id: "tether", symbol: "USDT", name: "Tether", price: 1, change24h: 0, marketCap: 0, volume24h: 0, image: COIN_IMAGES.tether || "" })
    }
    if (!coins.find((c) => c.symbol === "USDC")) {
      coins.push({ id: "usd-coin", symbol: "USDC", name: "USD Coin", price: 1, change24h: 0, marketCap: 0, volume24h: 0, image: COIN_IMAGES["usd-coin"] || "" })
    }

    return { prices, coins, fetchedAt: Date.now() }
  } catch (error) {
    console.error("[Hyperliquid] price fetch error:", error)
    return null
  }
}

async function fetchHyperliquidTrades(symbol: string, limit: number): Promise<TradeResult[] | null> {
  try {
    const upper = symbol.replace("/", "").replace("-", "").replace("_", "").toUpperCase()
    const quoteMatch = upper.match(/(USDT|USDC|USD)$/)
    const base = quoteMatch ? upper.slice(0, upper.length - quoteMatch[0].length) : upper

    const data = await hlPost({ type: "recentTrades", coin: base })
    if (!Array.isArray(data) || data.length === 0) return null

    return data.slice(0, limit).map((t: { tid: number; px: string; sz: string; side: string; time: number }) => ({
      id: String(t.tid),
      price: t.px,
      amount: t.sz,
      side: (t.side === "B" ? "buy" : "sell") as "buy" | "sell",
      time: t.time,
    }))
  } catch {
    return null
  }
}

// ── KuCoin ─────────────────────────────────────────────────────────────────

async function fetchKuCoinPrices(): Promise<PricesResponse | null> {
  try {
    const url = "https://api.kucoin.com/api/v1/market/allTickers"
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null

    const json = await res.json()
    if (json.code !== "200000" || !json.data?.ticker) return null

    const symbolToId = new Map<string, string>()
    for (const [id, sym] of Object.entries(KUCOIN_SYMBOLS)) {
      symbolToId.set(sym, id)
    }

    const prices: Record<string, number> = { USDT: 1, USDC: 1 }
    const coins: CoinData[] = []

    for (const ticker of json.data.ticker) {
      const coinId = symbolToId.get(ticker.symbol)
      if (!coinId) continue
      const symbol = ID_TO_SYMBOL[coinId]
      if (!symbol) continue

      const price = parseFloat(ticker.last) || 0
      const change24h = (parseFloat(ticker.changeRate) || 0) * 100
      const volume24h = parseFloat(ticker.volValue) || 0

      prices[symbol] = price
      coins.push({
        id: coinId, symbol, name: COIN_NAMES[coinId] || symbol,
        price, change24h, marketCap: 0, volume24h,
        image: COIN_IMAGES[coinId] || "",
      })
    }

    if (!coins.find((c) => c.symbol === "USDT")) {
      coins.push({ id: "tether", symbol: "USDT", name: "Tether", price: 1, change24h: 0, marketCap: 0, volume24h: 0, image: COIN_IMAGES.tether || "" })
    }

    coins.sort((a, b) => b.volume24h - a.volume24h)
    return { prices, coins, fetchedAt: Date.now() }
  } catch (error) {
    console.error("KuCoin price fetch error:", error)
    return null
  }
}

async function fetchKuCoinTrades(kucoinSymbol: string, limit: string): Promise<TradeResult[] | null> {
  const url = `https://api.kucoin.com/api/v1/market/histories?symbol=${encodeURIComponent(kucoinSymbol)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) return null
  const json = await res.json()
  if (!json.data) return null
  return json.data
    .slice(0, Number(limit))
    .map((t: Record<string, unknown>) => ({
      id: (t.sequence as string) || String(t.time),
      price: t.price,
      amount: t.size,
      side: t.side,
      time: Math.floor((t.time as number) / 1000000),
    }))
}

// ── getPrices ──────────────────────────────────────────────────────────────

export async function getPrices(): Promise<PricesResponse> {
  const now = Date.now()

  if (priceCache && now - priceCacheTs < PRICE_TTL) {
    return sanitize(priceCache)
  }
  if (now < backoffUntil && priceCache) {
    return sanitize(priceCache)
  }

  // Hyperliquid first
  const hlResult = await fetchHyperliquidPrices()
  if (hlResult && hlResult.coins.length > 0) {
    // Enrich with 24h change from KuCoin
    try {
      const kcRes = await fetch("https://api.kucoin.com/api/v1/market/allTickers", {
        signal: AbortSignal.timeout(5_000),
      })
      if (kcRes.ok) {
        const kcJson = await kcRes.json()
        if (kcJson.code === "200000" && kcJson.data?.ticker) {
          const symbolToId = new Map<string, string>()
          for (const [id, sym] of Object.entries(KUCOIN_SYMBOLS)) {
            symbolToId.set(sym, id)
          }
          const changeMap = new Map<string, number>()
          for (const ticker of kcJson.data.ticker) {
            const coinId = symbolToId.get(ticker.symbol)
            if (!coinId) continue
            const sym = ID_TO_SYMBOL[coinId]
            if (sym) changeMap.set(sym, (parseFloat(ticker.changeRate) || 0) * 100)
          }
          for (const coin of hlResult.coins) {
            const change = changeMap.get(coin.symbol)
            if (change !== undefined) coin.change24h = change
          }
        }
      }
    } catch {
      // KuCoin enrichment is optional
    }
    priceCache = hlResult
    priceCacheTs = now
    return sanitize(hlResult)
  }

  // KuCoin fallback
  const kucoinResult = await fetchKuCoinPrices()
  if (kucoinResult && kucoinResult.coins.length > 0) {
    priceCache = kucoinResult
    priceCacheTs = now
    return sanitize(kucoinResult)
  }

  // CoinGecko fallback
  try {
    const coinsUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_COIN_IDS.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    const coinsRes = await fetch(coinsUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15_000),
    })

    if (coinsRes.status === 429) {
      backoffUntil = Date.now() + BACKOFF_MS
      throw new Error("CoinGecko rate limited")
    }
    if (!coinsRes.ok) throw new Error(`CoinGecko returned ${coinsRes.status}`)

    const coinsData = await coinsRes.json()
    const prices: Record<string, number> = {}
    const coins: CoinData[] = []

    for (const coin of coinsData) {
      const symbol = ID_TO_SYMBOL[coin.id] || coin.symbol.toUpperCase()
      prices[symbol] = coin.current_price ?? 0
      coins.push({
        id: coin.id, symbol, name: coin.name,
        price: coin.current_price ?? 0,
        change24h: coin.price_change_percentage_24h ?? 0,
        marketCap: coin.market_cap ?? 0,
        volume24h: coin.total_volume ?? 0,
        image: coin.image ?? "",
      })
    }

    if (!prices.USDT) prices.USDT = 1
    if (!prices.USDC) prices.USDC = 1

    const result: PricesResponse = { prices, coins, fetchedAt: now }
    priceCache = result
    priceCacheTs = now
    return sanitize(result)
  } catch (error) {
    console.error("[getPrices] ERROR:", error)
    if (priceCache) return sanitize(priceCache)
    return {
      prices: {}, coins: [], fetchedAt: now,
      error: "Failed to fetch market data. Please check your connection and try again.",
    }
  }
}

// ── getTrades ──────────────────────────────────────────────────────────────

function parseSymbol(raw: string) {
  const upper = raw.replace("/", "").toUpperCase()
  const quoteMatch = upper.match(/(USDT|USDC|BUSD|USD)$/)
  const quote = quoteMatch ? quoteMatch[0] : "USDT"
  const base = upper.slice(0, upper.length - quote.length) || "BTC"
  return { base, quote, kucoin: `${base}-${quote}` }
}

export async function getTrades(symbol = "BTCUSDT", limit = 50): Promise<TradesResponse> {
  const { base, kucoin } = parseSymbol(symbol)
  const cacheKey = `${kucoin}:${limit}`

  const cached = tradeCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < TRADE_TTL) {
    return sanitize(cached.data)
  }

  // Hyperliquid first
  try {
    const hlTrades = await fetchHyperliquidTrades(base, limit)
    if (hlTrades && hlTrades.length > 0) {
      const payload: TradesResponse = { success: true, source: "hyperliquid", data: hlTrades }
      tradeCache.set(cacheKey, { data: payload, ts: Date.now() })
      return sanitize(payload)
    }
  } catch { /* fall through */ }

  // KuCoin fallback
  try {
    const trades = await fetchKuCoinTrades(kucoin, String(limit))
    if (trades && trades.length > 0) {
      const payload: TradesResponse = { success: true, source: "kucoin", data: trades }
      tradeCache.set(cacheKey, { data: payload, ts: Date.now() })
      return sanitize(payload)
    }
  } catch { /* fall through */ }

  const stale = tradeCache.get(cacheKey)
  if (stale) return sanitize(stale.data)

  return { success: false, data: [], error: "Trade data unavailable" }
}
