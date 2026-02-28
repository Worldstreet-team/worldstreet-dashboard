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
    <div className="bg-white dark:bg-darkgray border-t border-border dark:border-darkborder">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-border dark:border-darkborder">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-dark dark:hover:text-white'
            }`}
          >
            <Icon icon={tab.icon} width={14} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px] max-h-[400px] overflow-auto">
        {activeTab === 'orders' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Icon icon="ph:list-bullets" className="text-muted" width={32} />
            </div>
            <p className="text-muted text-sm">No open orders</p>
            <p className="text-muted text-xs mt-1">Your active orders will appear here</p>
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
          <div className="p-4">
            <BalanceDisplay key={`balance-${refreshKey}`} />
          </div>
        )}
      </div>
    </div>
  );
}
