import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid";
import { createWalletClient, http } from "viem";
import { arbitrum } from "viem/chains";

export interface HyperliquidFuturesConfig {
  testnet?: boolean;
}

export class HyperliquidFuturesService {
  private transport: HttpTransport;
  private info: InfoClient;

  constructor(config: HyperliquidFuturesConfig = {}) {
    const isTestnet = config.testnet ?? false;

    this.transport = new HttpTransport({
      isTestnet
    });

    this.info = new InfoClient({
      transport: this.transport
    });

    console.log(`[Hyperliquid Futures] initialized (testnet=${isTestnet})`);
  }

  createExchangeClient(privateKey: string) {
    // For now, return a placeholder since we need proper wallet integration
    // This will be implemented when we add order placement functionality
    throw new Error('Exchange client creation not yet implemented - requires proper Privy wallet integration');
  }

  /* -------------------------------- */
  /* FUTURES MARKETS                  */
  /* -------------------------------- */

  async getFuturesMarkets() {
    const [meta, mids] = await Promise.all([
      this.info.meta(),
      this.info.allMids()
    ]);

    return meta.universe
      .filter((asset: any) => !asset.isDelisted) // Filter out delisted assets
      .map((asset: any, index: number) => ({
        symbol: `${asset.name}-PERP`, // Add -PERP suffix for display
        base: asset.name,
        quote: 'USD',
        price: Number(mids[asset.name] || 0),
        assetIndex: index, // Use array index as asset index
        szDecimals: asset.szDecimals,
        maxLeverage: asset.maxLeverage ?? null,
        isolatedOnly: asset.onlyIsolated ?? false
      }));
  }

  /* -------------------------------- */
  /* ACCOUNT & POSITIONS              */
  /* -------------------------------- */

  async getAccount(address: string) {
    return this.info.clearinghouseState({
      user: address
    });
  }

  async getPositions(address: string) {
    const accountState = await this.getAccount(address);
    return (accountState as any)?.assetPositions || [];
  }

  /* -------------------------------- */
  /* ORDERBOOK                        */
  /* -------------------------------- */

  async getOrderBook(coin: string) {
    return this.info.l2Book({
      coin: coin
    });
  }

  /* -------------------------------- */
  /* RECENT TRADES                    */
  /* -------------------------------- */

  async getRecentTrades(coin: string) {
    return this.info.recentTrades({
      coin: coin
    });
  }

  /* -------------------------------- */
  /* TRADING OPERATIONS               */
  /* -------------------------------- */

  async placeOrder(privateKey: string, orderParams: any) {
    // This will be implemented when exchange client is properly set up
    throw new Error('Order placement not yet implemented - requires proper Privy wallet integration');
  }

  async cancelOrder(privateKey: string, cancelParams: any) {
    // This will be implemented when exchange client is properly set up  
    throw new Error('Order cancellation not yet implemented - requires proper Privy wallet integration');
  }

  async cancelAllOrders(privateKey: string, coin?: string) {
    const exchange = this.createExchangeClient(privateKey);
    // This will be implemented when exchange client is properly set up
    throw new Error('Cancel all orders not yet implemented');
  }
}

export const hyperliquidFutures = new HyperliquidFuturesService({
  testnet: process.env.NODE_ENV !== 'production'
});