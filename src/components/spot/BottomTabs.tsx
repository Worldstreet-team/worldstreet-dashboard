'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import OrderHistory from './OrderHistory';
import PositionsList from './PositionsList';
import BalanceDisplay from './BalanceDisplay';

type TabType = 'orders' | 'history' | 'positions' | 'balances';

interface BottomTabsProps {
  refreshKey?: number;
  selectedChartSymbol?: string;
  onPositionTPSLUpdate?: (symbol: string, tp: string | null, sl: string | null) => void;
  showTPSLLines?: boolean;
  onToggleTPSLLines?: () => void;
}

export default function BottomTabs({
  refreshKey = 0,
  selectedChartSymbol,
  onPositionTPSLUpdate,
  showTPSLLines,
  onToggleTPSLLines
}: BottomTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  const tabs = [
    { id: 'orders' as TabType, label: 'Open Orders', count: 0 },
    { id: 'positions' as TabType, label: 'Holdings', count: undefined },
  ];

  return (
    <div className="bg-[#0B0E11] md:bg-white md:dark:bg-darkgray h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex items-center px-4 md:px-0 md:border-b md:border-border md:dark:border-darkborder flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-0 md:px-2 py-3 md:py-1 text-sm md:text-[10px] font-medium transition-colors flex items-center gap-1 md:gap-1 border-b-2 md:border-b-2 mr-6 md:mr-0 ${
              activeTab === tab.id
                ? 'border-[#FCD535] text-white md:text-primary md:border-primary'
                : 'border-transparent text-gray-400 md:text-muted hover:text-white md:hover:text-dark md:dark:hover:text-white'
            }`}
          >
            <Icon icon={tab.id === 'orders' ? 'ph:list-bullets' : 'ph:wallet'} width={14} className="hidden md:inline" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-xs">({tab.count})</span>
            )}
          </button>
        ))}
        
        {/* Mobile: Additional actions */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-transparent" />
            <span>Hide Other Pairs</span>
          </label>
          <button className="text-xs text-gray-400 hover:text-white">Cancel All</button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto min-h-[120px] md:min-h-0">
        {activeTab === 'orders' && (
          <div className="p-4 text-center">
            <div className="w-16 h-16 md:w-10 md:h-10 rounded-full bg-gray-800 md:bg-muted/30 md:dark:bg-white/5 flex items-center justify-center mx-auto mb-3 md:mb-2">
              <Icon icon="ph:file-text" className="text-gray-600 md:text-muted" width={32} />
            </div>
            <p className="text-sm md:text-[10px] text-gray-400 md:text-muted">No records</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-0">
            <OrderHistory key={`history-${refreshKey}`} />
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="p-0">
            <PositionsList
              key={`positions-${refreshKey}`}
              selectedChartSymbol={selectedChartSymbol}
              onPositionTPSLUpdate={onPositionTPSLUpdate}
              showTPSLLines={showTPSLLines}
              onToggleTPSLLines={onToggleTPSLLines}
            />
          </div>
        )}

        {activeTab === 'balances' && (
          <div className="p-2">
            <BalanceDisplay key={`balance-${refreshKey}`} />
          </div>
        )}
      </div>
    </div>
  );
}
