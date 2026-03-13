import * as hl from "@nktkas/hyperliquid";
import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid";

export interface HyperliquidConfig {
  testnet?: boolean;
}

export class HyperliquidService {
  private transport: hl.HttpTransport;
  private info: InfoClient;

  constructor(config: HyperliquidConfig = {}) {
    const isTestnet = config.testnet ?? true;

    this.transport = new HttpTransport({
      isTestnet
    });

    this.info = new InfoClient({
      transport: this.transport
    });

    console.log(`[Hyperliquid] initialized (testnet=${isTestnet})`);
  }

  createExchangeClient(wallet: any) {
    return new ExchangeClient({
      transport: this.transport,
      wallet
    });
  }

  /* -------------------------------- */
  /* ACCOUNT                          */
  /* -------------------------------- */

  async getAccount(address: string) {
    return this.info.clearinghouseState({
      user: address
    });
  }

  /* -------------------------------- */
  /* MARKETS                          */
  /* -------------------------------- */

  async getMarkets() {
    const meta = await this.info.meta();
    const mids = await this.info.allMids();

    return meta.universe.map((asset: any) => ({
      symbol: asset.name,
      price: Number(mids[asset.name] || 0),
      szDecimals: asset.szDecimals,
      maxLeverage: asset.maxLeverage ?? null,
      isolatedOnly: asset.onlyIsolated ?? false
    }));
  }

  /* -------------------------------- */
  /* SPOT MARKETS (simple)            */
  /* -------------------------------- */

  async getSpotMarkets() {
    const meta = await this.info.meta();
    const mids = await this.info.allMids();

    return meta.universe
      .filter((a: any) => !a.name.includes("-PERP"))
      .map((asset: any) => ({
        symbol: asset.name,
        price: Number(mids[asset.name] || 0),
        base: asset.name.split("/")[0] || asset.name,
        quote: asset.name.split("/")[1] || "USD",
        szDecimals: asset.szDecimals
      }));
  }

  /* -------------------------------- */
  /* ORDERBOOK                        */
  /* -------------------------------- */

  async getOrderBook(symbol: string) {
    return this.info.l2Book({
      coin: symbol
    });
  }

  /* -------------------------------- */
  /* TRADING                          */
  /* -------------------------------- */

  async placeOrder(wallet: any, params: any) {
    const exchange = this.createExchangeClient(wallet);
    return exchange.order(params);
  }

  async cancelOrder(wallet: any, params: any) {
    const exchange = this.createExchangeClient(wallet);
    return exchange.cancel(params);
  }
}

export const hyperliquidService = new HyperliquidService();