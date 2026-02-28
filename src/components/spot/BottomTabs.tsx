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
  const [activeTab, setActiveTab] = useState<TabType>('positions');

  const tabs = [
    { id: 'orders' as TabType, label: 'Open Orders', icon: 'ph:list-bullets', count: 0 },
    { id: 'history' as TabType, label: 'Order History', icon: 'ph:clock-clockwise' },
    { id: 'positions' as TabType, label: 'Positions', icon: 'ph:chart-line-up' },
    { id: 'balances' as TabType, label: 'Balances', icon: 'ph:wallet' },
  ];

  return (
    <div className="bg-white dark:bg-darkgray h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-border dark:border-darkborder flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-medium transition-colors flex items-center gap-1 border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-dark dark:hover:text-white'
            }`}
          >
            <Icon icon={tab.icon} width={12} className="md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-semibold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'orders' && (
          <div className="p-4 md:p-8 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-2 md:mb-3">
              <Icon icon="ph:list-bullets" className="text-muted" width={24} />
            </div>
            <p className="text-muted text-xs md:text-sm">No open orders</p>
            <p className="text-muted text-[10px] md:text-xs mt-1">Your active orders will appear here</p>
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
          <div className="p-2 md:p-4">
            <BalanceDisplay key={`balance-${refreshKey}`} />
          </div>
        )}
      </div>
    </div>
  );
}
