'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import OrderHistory from './OrderHistory';
import PositionsList from './PositionsList';

type TabType = 'open-orders' | 'order-history' | 'trade-history' | 'holdings';

interface BinanceBottomPanelProps {
  refreshKey?: number;
  selectedChartSymbol?: string;
  onPositionTPSLUpdate?: (symbol: string, tp: string | null, sl: string | null) => void;
}

export default function BinanceBottomPanel({
  refreshKey = 0,
  selectedChartSymbol,
  onPositionTPSLUpdate
}: BinanceBottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('open-orders');

  const tabs = [
    { id: 'open-orders' as TabType, label: 'Open Orders', count: 0 },
    { id: 'order-history' as TabType, label: 'Order History' },
    { id: 'trade-history' as TabType, label: 'Trade History' },
    { id: 'holdings' as TabType, label: 'Holdings' },
  ];

  return (
    <div className="flex flex-col bg-[#0b0e11] text-white min-h-[25vh]">
      {/* Tab Headers */}
      <div className="flex items-center px-4 border-b border-[#1e2329] flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === tab.id
                ? 'border-[#f0b90b] text-white'
                : 'border-transparent text-[#848e9c] hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] text-[#848e9c]">({tab.count})</span>
            )}
          </button>
        ))}
        
        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#848e9c] cursor-pointer hover:text-white">
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded border-[#2b3139] bg-[#1e2329] checked:bg-[#f0b90b]" 
            />
            <span>Hide Other Pairs</span>
          </label>
          <button className="text-xs text-[#848e9c] hover:text-white transition-colors">
            Cancel All
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-h-[20vh] overflow-auto scrollbar-hide">
        {activeTab === 'open-orders' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mx-auto mb-4">
              <Icon icon="ph:file-text" className="text-[#848e9c]" width={32} />
            </div>
            <p className="text-sm text-[#848e9c]">You have no open orders</p>
          </div>
        )}

        {activeTab === 'order-history' && (
          <div className="bg-[#0b0e11]">
            <OrderHistory key={`history-${refreshKey}`} />
          </div>
        )}

        {activeTab === 'trade-history' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mx-auto mb-4">
              <Icon icon="ph:clock-clockwise" className="text-[#848e9c]" width={32} />
            </div>
            <p className="text-sm text-[#848e9c]">No trade history</p>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="bg-[#0b0e11]">
            <PositionsList
              key={`positions-${refreshKey}`}
              selectedChartSymbol={selectedChartSymbol}
              onPositionTPSLUpdate={onPositionTPSLUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
