"use client";

import React from 'react';
import { useFuturesStore } from '@/store/futuresStore';

export const MarketSelector: React.FC = () => {
  const { markets, selectedMarket, setSelectedMarket } = useFuturesStore();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-dark dark:text-white">Market:</label>
      <select
        value={selectedMarket?.id || ''}
        onChange={(e) => {
          const market = markets.find(m => m.id === e.target.value);
          setSelectedMarket(market || null);
        }}
        className="px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-darkgray text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        disabled={markets.length === 0}
      >
        <option value="">Select Market</option>
        {markets.map((market) => (
          <option key={market.id} value={market.id}>
            {market.symbol}
          </option>
        ))}
      </select>
      {selectedMarket && (
        <div className="flex items-center gap-4 ml-4">
          <div className="text-sm">
            <span className="text-muted dark:text-darklink">Mark:</span>
            <span className="ml-1 font-semibold text-dark dark:text-white">
              ${selectedMarket.markPrice.toFixed(2) || 0}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted dark:text-darklink">24h:</span>
            <span className={`ml-1 font-semibold ${selectedMarket.priceChange24h >= 0 ? 'text-success' : 'text-error'}`}>
              {selectedMarket.priceChange24h >= 0 ? '+' : ''}{selectedMarket.priceChange24h.toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
