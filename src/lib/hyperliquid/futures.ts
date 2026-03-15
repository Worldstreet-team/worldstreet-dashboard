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
    const walletClient = createWalletClient({
      chain: arbitrum,
      transport: http()
    });

    return new ExchangeClient({
      transport: this.transport,
      wallet: walletClient
    });
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
      .filter((asset: any) => asset.name.includes('-PERP'))
      .map((asset: any) => ({
        symbol: asset.name,
        base: asset.name.split('/')[0] || asset.name.replace('-PERP', ''),
        quote: asset.name.split('/')[1] || 'USD',
        price: Number(mids[asset.name] || 0),
        assetIndex: asset.index,
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
    const exchange = this.createExchangeClient(privateKey);
    return exchange.order(orderParams);
  }

  async cancelOrder(privateKey: string, cancelParams: any) {
    const exchange = this.createExchangeClient(privateKey);
    return exchange.cancel(cancelParams);
  }

  async cancelAllOrders(privateKey: string, coin?: string) {
    const exchange = this.createExchangeClient(privateKey);
    return exchange.cancelByCloid({
      asset: coin || null,
      cloid: null
    });
  }
}

export const hyperliquidFutures = new HyperliquidFuturesService({
  testnet: process.env.NODE_ENV !== 'production'
});