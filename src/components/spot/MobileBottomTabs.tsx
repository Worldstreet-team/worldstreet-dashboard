'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function MobileBottomTabs() {
  const [activeTab, setActiveTab] = useState<'orders' | 'holdings' | 'bots'>('orders');

  const tabs = [
    { id: 'orders' as const, label: 'Open Orders', count: 0 },
    { id: 'holdings' as const, label: 'Holdings', count: 0 },
    { id: 'bots' as const, label: 'Bots', count: undefined },
  ];

  return (
    <div className="border-t border-border dark:border-darkborder bg-white dark:bg-darkgray">
      {/* Tab Headers */}
      <div className="flex justify-around py-3 border-b border-border dark:border-darkborder">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-dark dark:text-white'
                : 'text-muted'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 text-xs">({tab.count})</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-warning" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'orders' && (
          <div className="flex flex-col items-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 dark:bg-white/5 flex items-center justify-center mb-3">
              <Icon icon="ph:wallet" className="text-muted" width={32} />
            </div>
            <p className="text-base font-semibold text-dark dark:text-white mb-1">
              Available Funds: 0.00 USDT
            </p>
            <p className="text-sm text-muted mb-4">
              Transfer funds to your Spot wallet to trade
            </p>
            <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors">
              Add Funds
            </button>
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="flex flex-col items-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 dark:bg-white/5 flex items-center justify-center mb-3">
              <Icon icon="ph:coins" className="text-muted" width={32} />
            </div>
            <p className="text-base font-semibold text-dark dark:text-white mb-1">
              No Holdings
            </p>
            <p className="text-sm text-muted">
              Your holdings will appear here
            </p>
          </div>
        )}

        {activeTab === 'bots' && (
          <div className="flex flex-col items-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 dark:bg-white/5 flex items-center justify-center mb-3">
              <Icon icon="ph:robot" className="text-muted" width={32} />
            </div>
            <p className="text-base font-semibold text-dark dark:text-white mb-1">
              No Active Bots
            </p>
            <p className="text-sm text-muted">
              Set up trading bots to automate your strategy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
