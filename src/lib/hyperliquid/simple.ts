import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";

class HyperliquidClient {
  private info = new InfoClient({
    transport: new HttpTransport({ isTestnet: false })
  });

  async getMarkets() {
    const [meta, mids] = await Promise.all([
      this.info.meta(),
      this.info.allMids()
    ]);

    return meta.universe
      .filter((a: any) => !a.name.includes('-PERP')) // Only spot markets
      .map((a: any) => ({
        symbol: a.name,
        baseAsset: a.name.split('/')[0] || a.name,
        quoteAsset: a.name.split('/')[1] || 'USD',
        price: Number(mids[a.name] ?? 0),
        change24h: 0, // No stats - just basic data
        volume24h: 0,
        high24h: 0,
        low24h: 0,
        chain: 'ethereum' as const,
        szDecimals: a.szDecimals,
        maxLeverage: a.maxLeverage,
        onlyIsolated: a.onlyIsolated
      }));
  }

  async getAccount(address: string) {
    return this.info.clearinghouseState({ user: address });
  }

  async getSpotAccount(address: string) {
    return this.info.spotClearinghouseState({ user: address });
  }

  async getOrderBook(symbol: string) {
    return this.info.l2Book({ coin: symbol });
  }

  async getRecentTrades(symbol: string) {
    return this.info.recentTrades({ coin: symbol });
  }
}

export const hyperliquid = new HyperliquidClient();