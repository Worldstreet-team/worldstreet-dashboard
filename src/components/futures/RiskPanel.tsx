"use client";

import React from 'react';
import { useFuturesStore } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

export const RiskPanel: React.FC = () => {
  const { collateral } = useFuturesStore();

  if (!collateral) {
    return (
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted dark:text-darklink">Loading collateral data...</p>
        </div>
      </div>
    );
  }

  const isHighRisk = collateral.marginRatio < 0.2;

  return (
    <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
      <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">Risk Summary</h3>
      
      <div className="space-y-3">
        {/* Total Collateral */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Total Collateral</span>
          <span className="text-sm font-semibold text-dark dark:text-white">
            ${collateral.total.toFixed(2)}
          </span>
        </div>

        {/* Used Margin */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Used Margin</span>
          <span className="text-sm font-semibold text-dark dark:text-white">
            ${collateral.used.toFixed(2)}
          </span>
        </div>

        {/* Free Margin */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Free Margin</span>
          <span className="text-sm font-semibold text-success">
            ${collateral.free.toFixed(2)}
          </span>
        </div>

        <div className="border-t border-border dark:border-darkborder my-2"></div>

        {/* Margin Ratio */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Margin Ratio</span>
          <span className={`text-sm font-semibold ${
            isHighRisk ? 'text-error' : 'text-dark dark:text-white'
          }`}>
            {(collateral.marginRatio * 100).toFixed(2)}%
          </span>
        </div>

        {/* Unrealized PnL */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Total Unrealized PnL</span>
          <span className={`text-sm font-semibold ${
            collateral.totalUnrealizedPnL >= 0 ? 'text-success' : 'text-error'
          }`}>
            {collateral.totalUnrealizedPnL >= 0 ? '+' : ''}${collateral.totalUnrealizedPnL.toFixed(2)}
          </span>
        </div>

        {/* Funding Accrued */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted dark:text-darklink">Funding Accrued</span>
          <span className={`text-sm font-semibold ${
            collateral.fundingAccrued >= 0 ? 'text-success' : 'text-error'
          }`}>
            {collateral.fundingAccrued >= 0 ? '+' : ''}${collateral.fundingAccrued.toFixed(4)}
          </span>
        </div>

        {/* Risk Warning */}
        {isHighRisk && (
          <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-start gap-2">
            <Icon icon="ph:warning-duotone" className="text-error flex-shrink-0 mt-0.5" height={20} />
            <div>
              <p className="text-sm font-semibold text-error">High Liquidation Risk</p>
              <p className="text-xs text-error/80 mt-1">
                Your margin ratio is below 20%. Consider adding margin or closing positions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
