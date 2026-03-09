"use client";

import React from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

export const MarketSelector: React.FC = () => {
  const { markets, selectedMarket, setSelectedMarket } = useFuturesStore();

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <h3 className="text-sm font-semibold text-dark dark:text-white mb-3">Markets</h3>
      
      {markets.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Icon 
              icon="svg-spinners:ring-resize" 
              className="w-8 h-8 mx-auto mb-2 text-primary" 
            />
            <p className="text-xs text-muted dark:text-darklink">Loading markets...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {markets.map((market) => {
            const isSelected = selectedMarket?.id === market.id;
            const priceChange = market.priceChange24h || 0;
            const isPositive = priceChange >= 0;
            
            return (
              <button
                key={market.id}
                onClick={() => setSelectedMarket(market)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-gray-100 dark:hover:bg-darkgray/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-dark dark:text-white">
                      {market.symbol}
                    </div>
                    <div className="text-xs text-muted dark:text-darklink">
                      {market.baseAsset}/USD
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-dark dark:text-white">
                      ${market.markPrice > 0 ? market.markPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: market.markPrice < 1 ? 6 : 2
                      }) : '...'}
                    </div>
                    {priceChange !== 0 && (
                      <div className={`text-xs font-medium ${
                        isPositive ? 'text-success' : 'text-error'
                      }`}>
                        {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {selectedMarket && (
        <div className="mt-4 pt-4 border-t border-border dark:border-darkborder">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted dark:text-darklink">Mark Price</span>
              <span className="font-semibold text-dark dark:text-white">
                ${selectedMarket.markPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: selectedMarket.markPrice < 1 ? 6 : 2
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted dark:text-darklink">Index Price</span>
              <span className="font-semibold text-dark dark:text-white">
                ${selectedMarket.indexPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: selectedMarket.indexPrice < 1 ? 6 : 2
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted dark:text-darklink">24h Volume</span>
              <span className="font-semibold text-dark dark:text-white">
                ${selectedMarket.volume24h.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
