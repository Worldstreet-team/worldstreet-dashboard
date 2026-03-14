"use client";

import React from 'react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { Icon } from '@iconify/react';

export const RiskPanel: React.FC = () => {
  const { summary, isInitialized, isLoading } = useHyperliquid();

  if (isLoading && !isInitialized) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <Icon icon="svg-spinners:ring-resize" className="mx-auto text-[#fcd535]" height={24} />
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
        <h3 className="text-xs font-medium text-[#848e9c] mb-2 uppercase">Risk Analysis</h3>
        <p className="text-[10px] text-[#848e9c]">Initialize your Hyperliquid account to view risk metrics.</p>
      </div>
    );
  }

  const marginRatio = summary?.marginRatio || 0;
  const healthPercent = Math.max(0, 100 - (marginRatio * 100));

  return (
    <div className="bg-[#181a20] border border-[#2b3139] rounded p-4">
      <h3 className="text-xs font-medium text-[#848e9c] mb-4 uppercase">Risk Analysis</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1 text-[10px]">
            <span className="text-[#848e9c]">Account Health</span>
            <span className={healthPercent > 50 ? 'text-[#0ecb81]' : healthPercent > 20 ? 'text-[#f0b90b]' : 'text-[#f6465d]'}>
              {healthPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1 bg-[#2b3139] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${healthPercent > 50 ? 'bg-[#0ecb81]' : healthPercent > 20 ? 'bg-[#f0b90b]' : 'bg-[#f6465d]'}`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#848e9c] mb-0.5">Margin Ratio</p>
            <p className="text-xs font-bold text-white">{(marginRatio * 100).toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-[#848e9c] mb-0.5">Max Leverage</p>
            <p className="text-xs font-bold text-white">50.0x</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#2b3139]">
          <div className="flex items-center gap-2 text-[9px] text-[#848e9c]">
            <Icon icon="ph:info" width={12} />
            <span>Liquidation occurs when Margin Ratio reaches 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
