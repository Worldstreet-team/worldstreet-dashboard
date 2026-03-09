"use client";

import React, { useEffect, useState } from 'react';
import { useDrift } from '@/app/context/driftContext';
import { useFuturesStore } from '@/store/futuresStore';
import { MarketSelector } from '@/components/futures/MarketSelector';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { OrderPanel } from '@/components/futures/OrderPanel';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { DriftAccountGuard } from '@/components/futures/DriftAccountGuard';
import { Icon } from '@iconify/react';

export default function FuturesPage() {
  const { perpMarkets, getMarketPrice, isClientReady } = useDrift();
  const { selectedMarket, setSelectedMarket, setMarkets, markets } = useFuturesStore();
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);

  // Convert Drift perpMarkets to futuresStore format and load prices
  useEffect(() => {
    if (!isClientReady || perpMarkets.size === 0) {
      setIsLoadingMarkets(true);
      return;
    }

    console.log('[FuturesPage] Loading markets from Drift...');
    console.log('[FuturesPage] perpMarkets size:', perpMarkets.size);

    // Convert Map to array and sort by marketIndex to maintain order
    const sortedMarkets = Array.from(perpMarkets.entries())
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([marketIndex, market]) => {
        // Get current price from Drift oracle
        const markPrice = getMarketPrice(marketIndex, 'perp');
        
        console.log(`[FuturesPage] Market ${marketIndex}: ${market.symbol} - $${markPrice}`);

        return {
          id: market.symbol,
          symbol: market.symbol,
          baseAsset: market.baseAssetSymbol,
          quoteAsset: 'USD',
          markPrice,
          indexPrice: markPrice,
          lastPrice: markPrice,
          priceChange24h: 0, // TODO: Calculate from historical data
          priceChangePercent24h: 0,
          volume24h: 0, // TODO: Get from Drift
          high24h: markPrice * 1.05,
          low24h: markPrice * 0.95,
          fundingRate: 0, // TODO: Get from Drift
          nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
          openInterest: 0,
          maxLeverage: 20,
          minOrderSize: 0.001,
          tickSize: 0.01,
        };
      });

    console.log('[FuturesPage] Formatted markets:', sortedMarkets.length);
    console.log('[FuturesPage] Market symbols (ordered):', sortedMarkets.map(m => m.symbol));

    setMarkets(sortedMarkets);
    setIsLoadingMarkets(false);

    // Set first market as selected if none selected
    if (!selectedMarket && sortedMarkets.length > 0) {
      console.log('[FuturesPage] Setting default market:', sortedMarkets[0].symbol);
      setSelectedMarket(sortedMarkets[0]);
    }
  }, [perpMarkets, isClientReady, getMarketPrice, setMarkets, selectedMarket, setSelectedMarket]);

  // Update prices periodically
  useEffect(() => {
    if (!isClientReady || perpMarkets.size === 0 || markets.length === 0) return;

    const interval = setInterval(() => {
      // Sort by marketIndex to maintain order
      const updatedMarkets = Array.from(perpMarkets.entries())
        .sort(([indexA], [indexB]) => indexA - indexB)
        .map(([marketIndex, market]) => {
          const markPrice = getMarketPrice(marketIndex, 'perp');
          
          return {
            id: market.symbol,
            symbol: market.symbol,
            baseAsset: market.baseAssetSymbol,
            quoteAsset: 'USD',
            markPrice,
            indexPrice: markPrice,
            lastPrice: markPrice,
            priceChange24h: 0,
            priceChangePercent24h: 0,
            volume24h: 0,
            high24h: markPrice * 1.05,
            low24h: markPrice * 0.95,
            fundingRate: 0,
            nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
            openInterest: 0,
            maxLeverage: 20,
            minOrderSize: 0.001,
            tickSize: 0.01,
          };
        });

      setMarkets(updatedMarkets);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [perpMarkets, isClientReady, getMarketPrice, setMarkets, markets.length]);

  return (
      <div className="min-h-screen bg-herobg dark:bg-dark">
        {/* Loading State */}
        {isLoadingMarkets && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Icon 
                icon="svg-spinners:ring-resize" 
                className="w-12 h-12 mx-auto mb-4 text-primary" 
              />
              <p className="text-lg font-semibold text-dark dark:text-white">
                Loading Drift Markets...
              </p>
              <p className="text-sm text-muted dark:text-darklink mt-2">
                Fetching market data from Drift Protocol
              </p>
              {perpMarkets.size > 0 && (
                <p className="text-xs text-muted dark:text-darklink mt-1">
                  Found {perpMarkets.size} markets
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoadingMarkets && markets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
            {/* Left Sidebar - Market Selector */}
            <div className="lg:col-span-2">
              <MarketSelector />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-7 space-y-4">
              {/* Chart */}
              <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder">
                <FuturesChart />
              </div>

              {/* Positions */}
              <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder">
                <PositionPanel />
              </div>
            </div>

            {/* Right Sidebar - Trading Panel */}
            <div className="lg:col-span-3 space-y-4">
              {/* Collateral */}
              <CollateralPanel />

              {/* Order Entry */}
              <OrderPanel />

              {/* Risk Info */}
              <RiskPanel />
            </div>
          </div>
        )}

        {/* No Markets State */}
        {!isLoadingMarkets && markets.length === 0 && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Icon 
                icon="mdi:alert-circle-outline" 
                className="w-12 h-12 mx-auto mb-4 text-warning" 
              />
              <p className="text-lg font-semibold text-dark dark:text-white">
                No Markets Available
              </p>
              <p className="text-sm text-muted dark:text-darklink mt-2">
                Unable to load markets from Drift Protocol
              </p>
            </div>
          </div>
        )}
      </div>
  );
}
