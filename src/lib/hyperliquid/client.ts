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

  async getSpotAccount(address: string) {
    return this.info.spotClearinghouseState({
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

  /* -------------------------------- */
  /* SETUP & INITIALIZATION           */
  /* -------------------------------- */

  /**
   * Initialize a new trading wallet for Hyperliquid
   * This primarily serves as a validation step to ensure the specialized 
   * wallet can connect to the Hyperliquid exchange.
   */
  async initializeTradingWallet(walletInfo: any, viemAccount: any) {
    try {
      console.log(`[Hyperliquid] Initializing trading wallet: ${walletInfo.address}`);
      
      // Test the connection by creating an exchange client
      const exchange = this.createExchangeClient(viemAccount);
      
      // In a real scenario, we might want to check the account state
      const state = await this.getAccount(walletInfo.address); // Keeping original line as the provided edit was syntactically incorrect and out of context.
      
      return {
        success: true,
        initialized: true,
        address: walletInfo.address,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('[Hyperliquid] Failed to initialize trading wallet:', error);
      return {
        success: false,
        initialized: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const hyperliquidService = new HyperliquidService();