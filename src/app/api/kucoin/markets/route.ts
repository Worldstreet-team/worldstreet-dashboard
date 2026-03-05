import { NextResponse } from 'next/server';

interface KuCoinSymbol {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  enableTrading: boolean;
}

interface SolanaToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
}

interface KuCoinTicker {
  symbol: string;
  last: string;
  changeRate: string;
  volValue: string;
  high: string;
  low: string;
}

type Chain = 'solana' | 'ethereum' | 'bitcoin';

interface MarketData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  chain?: Chain;
  mintAddress?: string;
  logoURI?: string;
}

export async function GET() {
  try {
    // Fetch KuCoin symbols
    const symbolsRes = await fetch('https://api.kucoin.com/api/v2/symbols');
    const symbolsData = await symbolsRes.json();
    
    if (symbolsData.code !== '200000') {
      throw new Error('Failed to fetch symbols');
    }

    const kucoinSymbols: KuCoinSymbol[] = symbolsData.data;
    
    // Filter for USDT pairs that are tradable
    const usdtSymbols = kucoinSymbols.filter(
      (s) => s.quoteCurrency === 'USDT' && s.enableTrading
    );

    // Fetch Solana token list
    const solanaRes = await fetch('https://tokens.coingecko.com/solana/all.json');
    const solanaData = await solanaRes.json();
    const solanaTokens: SolanaToken[] = solanaData.tokens;

    // Create a map of Solana tokens by symbol
    const solanaTokenMap = new Map(
      solanaTokens.map((token) => [token.symbol.toUpperCase(), token])
    );

    // Fetch 24hr stats for all symbols
    const tickersRes = await fetch('https://api.kucoin.com/api/v1/market/allTickers');
    const tickersData = await tickersRes.json();
    
    if (tickersData.code !== '200000') {
      throw new Error('Failed to fetch tickers');
    }

    const tickers: KuCoinTicker[] = tickersData.data.ticker;
    const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));

    // Map symbols to market data with chain detection
    const marketData = usdtSymbols
      .map((symbol) => {
        const ticker = tickerMap.get(symbol.symbol);
        if (!ticker) return null;

        const baseAsset = symbol.baseCurrency.toUpperCase();
        const solanaToken = solanaTokenMap.get(baseAsset);
        
        // Determine chain
        let chain: Chain | undefined;
        if (solanaToken) {
          chain = 'solana';
        } else if (['BTC', 'BCH', 'BSV', 'BTG'].includes(baseAsset)) {
          chain = 'bitcoin';
        } else if (['ETH', 'USDT', 'USDC', 'DAI', 'LINK', 'UNI', 'AAVE', 'MKR'].includes(baseAsset)) {
          chain = 'ethereum';
        }

        const price = parseFloat(ticker.last);
        if (isNaN(price)) return null;

        const marketItem: MarketData = {
          symbol: `${baseAsset}-USDT`,
          baseAsset,
          quoteAsset: 'USDT',
          price,
          change24h: parseFloat(ticker.changeRate) * 100,
          volume24h: parseFloat(ticker.volValue),
          high24h: parseFloat(ticker.high),
          low24h: parseFloat(ticker.low),
          chain,
          mintAddress: solanaToken?.address,
          logoURI: solanaToken?.logoURI,
        };

        return marketItem;
      })
      .filter((m): m is MarketData => m !== null);

    return NextResponse.json({ 
      success: true,
      data: marketData 
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data' 
      },
      { status: 500 }
    );
  }
}
