import * as hl from "@nktkas/hyperliquid";
import { HttpTransport, InfoClient, ExchangeClient } from "@nktkas/hyperliquid";

export interface HyperliquidConfig {
  testnet?: boolean;
}

export interface TradingWalletInfo {
  address: string;
  walletId: string;
  chainType: string;
}

export interface ViemAccountInfo {
  address: string;
  ready: boolean;
}

export class HyperliquidService {
  private testnet: boolean;
  private transport: hl.HttpTransport;

  constructor(config: HyperliquidConfig = {}) {
    this.testnet = config.testnet ?? (process.env.NODE_ENV !== 'production');
    
    // Initialize HTTP transport - this determines testnet vs mainnet
    this.transport = new HttpTransport({ 
      isTestnet: this.testnet 
    });
    
    console.log(`[Hyperliquid] Service initialized (testnet: ${this.testnet})`);
  }

  /**
   * Create InfoClient for read-only operations (market data, account info, etc.)
   */
  createInfoClient(): InfoClient {
    return new InfoClient({ 
      transport: this.transport 
    });
  }

  /**
   * Create ExchangeClient for trading operations
   */
  createExchangeClient(viemAccount: any): ExchangeClient {
    return new ExchangeClient({
      transport: this.transport,
      wallet: viemAccount,
      isTestnet: this.testnet,
    });
  }

  /**
   * Initialize Hyperliquid for a trading wallet with Viem account
   */
  async initializeTradingWallet(walletInfo: TradingWalletInfo, viemAccount?: any) {
    try {
      console.log(`[Hyperliquid] Initializing wallet ${walletInfo.address} (testnet: ${this.testnet})`);
      
      // Create exchange client if viem account is provided
      let exchangeClient = null;
      if (viemAccount) {
        exchangeClient = this.createExchangeClient(viemAccount);
        console.log(`[Hyperliquid] Exchange client created for trading`);
      }
      
      // Get account info to verify the wallet is accessible
      const accountInfo = await this.getAccountInfo(walletInfo.address);
      
      return {
        success: true,
        walletInfo,
        accountInfo,
        testnet: this.testnet,
        initialized: true,
        hasExchangeClient: !!exchangeClient,
        exchangeClient, // Return the client for direct use
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("[Hyperliquid] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Get account information for a wallet address using InfoClient
   */
  async getAccountInfo(address: string) {
    try {
      const infoClient = this.createInfoClient();
      
      // Get user state (positions, balances, etc.) using clearinghouseState
      const userState = await infoClient.clearinghouseState({ user: address });
      
      return {
        address,
        balances: userState.marginSummary,
        positions: userState.assetPositions,
        crossMarginSummary: userState.crossMarginSummary,
        withdrawable: userState.withdrawable
      };
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get account info for ${address}:`, error);
      
      // Return empty state for new accounts (this is normal)
      return {
        address,
        balances: null,
        positions: [],
        crossMarginSummary: null,
        withdrawable: null,
        isNewAccount: true
      };
    }
  }

  /**
   * Get available markets/assets using InfoClient
   */
  async getMarkets() {
    try {
      const infoClient = this.createInfoClient();
      const meta = await infoClient.meta();
      return meta.universe;
    } catch (error) {
      console.error("[Hyperliquid] Failed to get markets:", error);
      throw error;
    }
  }

  /**
   * Get all mid prices using InfoClient
   */
  async getAllMidPrices() {
    try {
      const infoClient = this.createInfoClient();
      return await infoClient.allMids();
    } catch (error) {
      console.error("[Hyperliquid] Failed to get mid prices:", error);
      throw error;
    }
  }

  /**
   * Get market data for a specific asset using InfoClient
   */
  async getMarketData(asset: string) {
    try {
      const infoClient = this.createInfoClient();
      
      const [meta, midPrices, orderBook] = await Promise.all([
        infoClient.meta(),
        infoClient.allMids(),
        infoClient.l2Book({ coin: asset }) // Fixed: Use proper parameter object
      ]);

      const assetInfo = meta.universe.find(u => u.name === asset);
      const midPrice = midPrices[asset];

      return {
        asset,
        assetInfo,
        midPrice,
        orderBook,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get market data for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get spot market data for all available assets
   */
  async getSpotMarkets() {
    try {
      const infoClient = this.createInfoClient();
      
      // Get universe (all available markets) and current prices
      const [meta, midPrices] = await Promise.all([
        infoClient.meta(),
        infoClient.allMids()
      ]);

      // Filter for spot markets (non-perp markets)
      const spotMarkets = meta.universe
        .filter((asset: any) => !asset.name.includes('-PERP'))
        .map((asset: any) => {
          const price = midPrices[asset.name] || 0;
          
          return {
            symbol: asset.name,
            baseAsset: asset.name.split('/')[0] || asset.name,
            quoteAsset: asset.name.split('/')[1] || 'USD',
            price: price,
            change24h: 0, // Hyperliquid doesn't provide 24h change in basic API
            volume24h: 0, // Would need additional API calls for volume
            high24h: 0,
            low24h: 0,
            chain: 'ethereum' as const,
            szDecimals: asset.szDecimals,
            maxLeverage: asset.maxLeverage,
            onlyIsolated: asset.onlyIsolated
          };
        });

      return spotMarkets;
    } catch (error) {
      console.error("[Hyperliquid] Failed to get spot markets:", error);
      throw error;
    }
  }

  /**
   * Get 24h statistics for spot markets (requires additional API calls)
   */
  async getSpotMarketStats() {
    try {
      const infoClient = this.createInfoClient();
      
      // Get current timestamp for 24h lookback
      const endTime = Date.now();
      const startTime = endTime - (24 * 60 * 60 * 1000); // 24 hours ago

      const [meta, midPrices] = await Promise.all([
        infoClient.meta(),
        infoClient.allMids()
      ]);

      // Get spot markets only
      const spotAssets = meta.universe.filter((asset: any) => !asset.name.includes('-PERP'));
      
      // For each spot asset, get 24h stats
      const marketStats = await Promise.all(
        spotAssets.map(async (asset: any) => {
          try {
            // Get candle data for 24h period (1h candles)
            const candles = await infoClient.candleSnapshot({
              coin: asset.name,
              interval: '1h',
              startTime,
              endTime
            });

            let high24h = 0;
            let low24h = Infinity;
            let volume24h = 0;
            let change24h = 0;

            if (candles && candles.length > 0) {
              // Calculate 24h stats from candle data
              candles.forEach((candle: any) => {
                const high = parseFloat(candle.h);
                const low = parseFloat(candle.l);
                const volume = parseFloat(candle.v);
                high24h = Math.max(high24h, high);
                low24h = Math.min(low24h, low);
                volume24h += volume;
              });

              // Calculate 24h change
              const firstCandle = candles[0];
              const lastCandle = candles[candles.length - 1];
              if (firstCandle && lastCandle) {
                const openPrice = parseFloat(firstCandle.o); // open price of first candle
                const closePrice = parseFloat(lastCandle.c); // close price of last candle
                change24h = ((closePrice - openPrice) / openPrice) * 100;
              }
            }

            const currentPrice = midPrices[asset.name] || 0;

            return {
              symbol: asset.name,
              baseAsset: asset.name.split('/')[0] || asset.name,
              quoteAsset: asset.name.split('/')[1] || 'USD',
              price: currentPrice,
              change24h: isFinite(change24h) ? change24h : 0,
              volume24h: isFinite(volume24h) ? volume24h : 0,
              high24h: isFinite(high24h) && high24h > 0 ? high24h : currentPrice,
              low24h: isFinite(low24h) && low24h < Infinity ? low24h : currentPrice,
              chain: 'ethereum' as const,
              szDecimals: asset.szDecimals,
              maxLeverage: asset.maxLeverage,
              onlyIsolated: asset.onlyIsolated
            };
          } catch (assetError) {
            console.warn(`[Hyperliquid] Failed to get stats for ${asset.name}:`, assetError);
            
            // Return basic data without stats
            return {
              symbol: asset.name,
              baseAsset: asset.name.split('/')[0] || asset.name,
              quoteAsset: asset.name.split('/')[1] || 'USD',
              price: midPrices[asset.name] || 0,
              change24h: 0,
              volume24h: 0,
              high24h: 0,
              low24h: 0,
              chain: 'ethereum' as const,
              szDecimals: asset.szDecimals,
              maxLeverage: asset.maxLeverage,
              onlyIsolated: asset.onlyIsolated
            };
          }
        })
      );

      return marketStats;
    } catch (error) {
      console.error("[Hyperliquid] Failed to get spot market stats:", error);
      throw error;
    }
  }

  /**
   * Get order book for a specific spot market
   */
  async getSpotOrderBook(asset: string) {
    try {
      const infoClient = this.createInfoClient();
      return await infoClient.l2Book({ coin: asset });
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get order book for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Get recent trades for a specific spot market
   */
  async getSpotTrades(asset: string) {
    try {
      const infoClient = this.createInfoClient();
      
      // Get recent trades using userFills (if available) or return empty array
      // Note: Hyperliquid SDK may not have public recent trades endpoint
      console.warn(`[Hyperliquid] Recent trades not available for ${asset} - using placeholder`);
      
      return [];
    } catch (error) {
      console.error(`[Hyperliquid] Failed to get trades for ${asset}:`, error);
      throw error;
    }
  }

  /**
   * Place an order using ExchangeClient
   */
  async placeOrder(viemAccount: any, orderParams: any) {
    try {
      const exchangeClient = this.createExchangeClient(viemAccount);
      return await exchangeClient.order(orderParams);
    } catch (error) {
      console.error("[Hyperliquid] Failed to place order:", error);
      throw error;
    }
  }

  /**
   * Cancel an order using ExchangeClient
   */
  async cancelOrder(viemAccount: any, cancelParams: any) {
    try {
      const exchangeClient = this.createExchangeClient(viemAccount);
      return await exchangeClient.cancel(cancelParams);
    } catch (error) {
      console.error("[Hyperliquid] Failed to cancel order:", error);
      throw error;
    }
  }

  /**
   * Withdraw funds using ExchangeClient
   */
  async withdraw(viemAccount: any, withdrawParams: any) {
    try {
      const exchangeClient = this.createExchangeClient(viemAccount);
      return await exchangeClient.withdraw3(withdrawParams);
    } catch (error) {
      console.error("[Hyperliquid] Failed to withdraw:", error);
      throw error;
    }
  }

  /**
   * Check if the service is using testnet
   */
  isTestnet(): boolean {
    return this.testnet;
  }

  /**
   * Get the transport instance
   */
  getTransport(): hl.HttpTransport {
    return this.transport;
  }
}

// Export a default instance
export const hyperliquidService = new HyperliquidService();

// Export types and classes from the official SDK
export type { InfoClient, ExchangeClient } from "@nktkas/hyperliquid";
export { HttpTransport } from "@nktkas/hyperliquid";