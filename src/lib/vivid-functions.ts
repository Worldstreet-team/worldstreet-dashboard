import {
  createVividFunction,
  buildParameters,
  stringParam,
  enumParam,
  numberParam,
} from '@worldstreet/vivid-voice/functions'
import type { VoiceFunctionConfig } from '@worldstreet/vivid-voice/functions'

// =============================================================================
// Constants
// =============================================================================

const COINGECKO_API = 'https://api.coingecko.com/api/v3'
const BACKEND_URL = 'https://trading.watchup.site'

// CoinGecko ID mapping for supported symbols
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDT: 'tether',
  USDC: 'usd-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  MATIC: 'polygon-matic-token',
  LTC: 'litecoin',
  UNI: 'uniswap',
  XLM: 'stellar',
  ATOM: 'cosmos',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
}

// =============================================================================
// Client Functions (run in browser)
// =============================================================================

export const navigateToPage = createVividFunction({
  name: 'navigateToPage',
  description:
    'Navigate to a page in the WorldStreet dashboard. ' +
    'Valid paths: / (Dashboard home), /spot (Spot trading), /futures (Futures trading), ' +
    '/swap (Token swap), /assets (Portfolio & assets), /deposit (Deposit funds), ' +
    '/withdraw (Withdraw funds), /transfer (Transfer funds between wallets), ' +
    '/transactions (Transaction history).',
  parameters: buildParameters({
    path: stringParam(
      'The URL path to navigate to. Must be one of: /, /spot, /futures, /swap, /assets, /deposit, /withdraw, /transfer, /transactions',
      true,
    ),
  }),
  handler: async ({ path }) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vivid:navigate', { detail: { path } }),
      )
    }
    return { success: true, navigatedTo: path }
  },
  executionContext: 'client',
})

export const showAlert = createVividFunction({
  name: 'showAlert',
  description: 'Show an alert message to the user',
  parameters: buildParameters({
    message: stringParam('The message to display', true),
  }),
  handler: async ({ message }) => {
    if (typeof window !== 'undefined') {
      alert(message)
    }
    return { success: true }
  },
  executionContext: 'client',
})

// =============================================================================
// Server Functions (run via /api/vivid/function)
// =============================================================================

export const getCryptoPrice = createVividFunction({
  name: 'getCryptoPrice',
  description:
    'Get the current price, 24h change, market cap, and volume for one or more cryptocurrencies. ' +
    'If no symbol is given, returns top coins overview. ' +
    'Supported symbols: BTC, ETH, SOL, USDT, USDC, XRP, ADA, DOGE, DOT, LINK, AVAX, MATIC, LTC, UNI, XLM, ATOM, NEAR, APT, SUI.',
  parameters: buildParameters({
    symbol: stringParam(
      'Crypto symbol (e.g. BTC, ETH, SOL). Leave empty for market overview.',
      false,
    ),
  }),
  handler: async ({ symbol }: { symbol?: string }) => {
    try {
      // Fetch from CoinGecko markets endpoint
      const coinIds = Object.values(SYMBOL_TO_COINGECKO).join(',')
      const url = `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })

      if (!res.ok) {
        return { error: `Market data temporarily unavailable (${res.status})` }
      }

      const coins: Array<{
        id: string
        symbol: string
        name: string
        current_price: number
        price_change_percentage_24h: number
        market_cap: number
        total_volume: number
      }> = await res.json()

      // If a specific symbol was requested, filter to that coin
      if (symbol) {
        const sym = symbol.toUpperCase()
        const geckoId = SYMBOL_TO_COINGECKO[sym]
        const coin = geckoId
          ? coins.find(c => c.id === geckoId)
          : coins.find(c => c.symbol === sym.toLowerCase())

        if (!coin) {
          return { error: `Couldn't find data for ${sym}. Supported: ${Object.keys(SYMBOL_TO_COINGECKO).join(', ')}` }
        }

        return {
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change24h: Math.round((coin.price_change_percentage_24h ?? 0) * 100) / 100,
          marketCap: coin.market_cap,
          volume24h: coin.total_volume,
        }
      }

      // No symbol — return top 10 overview
      const overview = coins.slice(0, 10).map(c => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: Math.round((c.price_change_percentage_24h ?? 0) * 100) / 100,
        marketCap: c.market_cap,
        volume24h: c.total_volume,
      }))

      // Also grab global stats
      let globalStats = null
      try {
        const globalRes = await fetch(`${COINGECKO_API}/global`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5_000),
        })
        if (globalRes.ok) {
          const g = await globalRes.json()
          globalStats = {
            totalMarketCap: g.data?.total_market_cap?.usd ?? null,
            totalVolume: g.data?.total_volume?.usd ?? null,
            btcDominance: g.data?.market_cap_percentage?.btc
              ? Math.round(g.data.market_cap_percentage.btc * 100) / 100
              : null,
          }
        }
      } catch {
        // Non-critical — skip global stats on failure
      }

      return { coins: overview, globalStats }
    } catch (err) {
      return { error: `Failed to fetch prices: ${(err as Error).message}` }
    }
  },
  executionContext: 'server',
})

export const getPortfolioBalance = createVividFunction({
  name: 'getPortfolioBalance',
  description:
    'Get the authenticated user\'s wallet balance, wallet addresses, and open trading positions. ' +
    'Returns USDT balance, wallet addresses (Solana, Ethereum, Bitcoin), and any open positions.',
  parameters: buildParameters({}),
  handler: async () => {
    try {
      // Fetch profile via the app's own API route (handles auth server-side)
      const profileRes = await fetch('/api/profile', {
        credentials: 'include',
        signal: AbortSignal.timeout(10_000),
      })

      if (profileRes.status === 401) {
        return { error: 'You need to be logged in for me to check your portfolio.' }
      }
      if (!profileRes.ok) {
        return { error: 'Could not fetch your profile. Please try again.' }
      }

      const { profile } = await profileRes.json()
      if (!profile) {
        return { error: 'No profile found. You may need to set up your account first.' }
      }

      // Gather wallet addresses
      const wallets: Record<string, string | null> = {
        solana: profile.wallets?.solana?.address ?? null,
        ethereum: profile.wallets?.ethereum?.address ?? null,
        bitcoin: profile.wallets?.bitcoin?.address ?? null,
      }

      // Read cached USDT balance from the profile (updated by the balance sync)
      const usdtBalance = profile.usdtBalance ?? profile.wallets?.solana?.usdtBalance ?? null

      // Fetch open positions
      let openPositions: unknown[] = []
      try {
        const posRes = await fetch(
          `${BACKEND_URL}/api/trades/open`,
          { credentials: 'include', signal: AbortSignal.timeout(8_000) },
        )
        if (posRes.ok) {
          const posData = await posRes.json()
          openPositions = Array.isArray(posData) ? posData : posData.trades ?? posData.positions ?? []
        }
      } catch {
        // Non-critical
      }

      return {
        usdtBalance,
        wallets,
        openPositionsCount: openPositions.length,
        openPositions: openPositions.slice(0, 5),
      }
    } catch (err) {
      return { error: `Failed to fetch portfolio: ${(err as Error).message}` }
    }
  },
  executionContext: 'client',
})

export const getMarketAnalysis = createVividFunction({
  name: 'getMarketAnalysis',
  description:
    'Get market data and chart analysis for a specific cryptocurrency over a given timeframe. ' +
    'Returns price history, high/low, percent change, and volume — useful for providing market opinions and analysis. ' +
    'Supported symbols: BTC, ETH, SOL, XRP, ADA, DOGE, DOT, LINK, AVAX, LTC.',
  parameters: buildParameters({
    symbol: stringParam('Crypto symbol to analyze (e.g. BTC, ETH, SOL). Default: BTC.', false),
    timeframe: enumParam(
      'Time period for the analysis',
      ['1H', '4H', '1D', '1W', '1M'],
      false,
    ),
  }),
  handler: async ({ symbol, timeframe }: { symbol?: string; timeframe?: string }) => {
    try {
      const sym = (symbol || 'BTC').toUpperCase()
      const tf = timeframe || '1D'

      const geckoId = SYMBOL_TO_COINGECKO[sym]
      if (!geckoId) {
        return { error: `Unsupported symbol: ${sym}. Try one of: BTC, ETH, SOL, XRP, ADA, DOGE, DOT, LINK, AVAX, LTC.` }
      }

      // Map timeframe to CoinGecko days parameter
      const tfToDays: Record<string, string> = {
        '1H': '0.042',  // ~1 hour
        '4H': '0.167',  // ~4 hours
        '1D': '1',
        '1W': '7',
        '1M': '30',
      }
      const days = tfToDays[tf] || '1'

      // Fetch chart data and current price in parallel
      const [chartRes, priceRes] = await Promise.all([
        fetch(
          `${COINGECKO_API}/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
        ),
        fetch(
          `${COINGECKO_API}/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
        ),
      ])

      if (!chartRes.ok) {
        return { error: `Chart data unavailable for ${sym} (${chartRes.status})` }
      }

      const chartData = await chartRes.json() as {
        prices: [number, number][]
        total_volumes: [number, number][]
      }

      const prices = chartData.prices || []
      if (prices.length === 0) {
        return { error: `No price data available for ${sym} over ${tf}` }
      }

      // Calculate key metrics
      const priceValues = prices.map(p => p[1])
      const high = Math.max(...priceValues)
      const low = Math.min(...priceValues)
      const start = priceValues[0]
      const end = priceValues[priceValues.length - 1]
      const changePercent = start > 0 ? Math.round(((end - start) / start) * 10000) / 100 : 0

      // Calculate volume if available
      const volumes = chartData.total_volumes || []
      const totalVolume = volumes.reduce((sum, v) => sum + (v[1] || 0), 0)

      // Get current detailed data
      let currentData: Record<string, unknown> = {}
      if (priceRes.ok) {
        const coinDetail = await priceRes.json() as {
          market_data?: {
            current_price?: { usd?: number }
            market_cap?: { usd?: number }
            total_volume?: { usd?: number }
            price_change_percentage_24h?: number
            price_change_percentage_7d?: number
            price_change_percentage_30d?: number
            ath?: { usd?: number }
            ath_change_percentage?: { usd?: number }
          }
        }
        const md = coinDetail.market_data
        if (md) {
          currentData = {
            currentPrice: md.current_price?.usd,
            marketCap: md.market_cap?.usd,
            volume24h: md.total_volume?.usd,
            change24h: md.price_change_percentage_24h
              ? Math.round(md.price_change_percentage_24h * 100) / 100
              : null,
            change7d: md.price_change_percentage_7d
              ? Math.round(md.price_change_percentage_7d * 100) / 100
              : null,
            change30d: md.price_change_percentage_30d
              ? Math.round(md.price_change_percentage_30d * 100) / 100
              : null,
            allTimeHigh: md.ath?.usd,
            distanceFromATH: md.ath_change_percentage?.usd
              ? Math.round(md.ath_change_percentage.usd * 100) / 100
              : null,
          }
        }
      }

      return {
        symbol: sym,
        timeframe: tf,
        periodHigh: high,
        periodLow: low,
        periodStart: start,
        periodEnd: end,
        periodChangePercent: changePercent,
        periodVolume: totalVolume,
        dataPoints: prices.length,
        ...currentData,
      }
    } catch (err) {
      return { error: `Analysis failed: ${(err as Error).message}` }
    }
  },
  executionContext: 'client',
})

export const getTransactionHistory = createVividFunction({
  name: 'getTransactionHistory',
  description:
    'Get the authenticated user\'s recent transaction history — including trades and swap history. ' +
    'Filter by type: "trades" for spot/futures trades, "swaps" for token swaps, or "all" for everything.',
  parameters: buildParameters({
    type: enumParam(
      'Type of transactions to fetch',
      ['all', 'trades', 'swaps'],
      false,
    ),
    limit: numberParam(
      'Maximum number of transactions to return (default 10, max 50)',
      false,
    ),
  }),
  handler: async ({ type, limit }: { type?: string; limit?: number }) => {
    try {
      const txType = type || 'all'
      const maxItems = Math.min(Math.max(limit || 10, 1), 50)

      const results: {
        trades?: unknown[]
        swaps?: unknown[]
        tradeError?: string
        swapError?: string
      } = {}

      // Fetch trades via backend
      if (txType === 'all' || txType === 'trades') {
        try {
          const res = await fetch(
            `${BACKEND_URL}/api/trades?limit=${maxItems}`,
            { credentials: 'include', signal: AbortSignal.timeout(8_000) },
          )
          if (res.ok) {
            const data = await res.json()
            results.trades = Array.isArray(data) ? data.slice(0, maxItems) : data.trades?.slice(0, maxItems) ?? []
          } else {
            results.tradeError = `Trade history unavailable (${res.status})`
          }
        } catch {
          results.tradeError = 'Could not reach the trading backend'
        }
      }

      // Fetch swap history via our API route
      if (txType === 'all' || txType === 'swaps') {
        try {
          const res = await fetch(
            `/api/swap/history?limit=${maxItems}`,
            { credentials: 'include', signal: AbortSignal.timeout(8_000) },
          )
          if (res.ok) {
            const data = await res.json()
            results.swaps = Array.isArray(data.swaps) ? data.swaps.slice(0, maxItems) : []
          } else {
            results.swapError = 'Could not fetch swap history'
          }
        } catch {
          results.swapError = 'Could not fetch swap history'
        }
      }

      const totalCount = (results.trades?.length ?? 0) + (results.swaps?.length ?? 0)

      return {
        totalTransactions: totalCount,
        ...results,
      }
    } catch (err) {
      return { error: `Failed to fetch history: ${(err as Error).message}` }
    }
  },
  executionContext: 'client',
})

// =============================================================================
// Export Collections
// =============================================================================

export const allFunctions: VoiceFunctionConfig[] = [
  navigateToPage,
  showAlert,
  getCryptoPrice,
  getPortfolioBalance,
  getMarketAnalysis,
  getTransactionHistory,
]
