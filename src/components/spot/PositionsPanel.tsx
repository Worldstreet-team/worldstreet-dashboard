'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';

interface PositionsPanelProps {
  selectedPair?: string;
  onRefresh?: () => void;
}

export default function PositionsPanel({ selectedPair, onRefresh }: PositionsPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);

  const handleRefresh = () => {
    setLoading(true);
    // Placeholder for refresh logic
    setTimeout(() => {
      setLoading(false);
      onRefresh?.();
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-darkgray">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-dark dark:text-white">Positions</h3>
          <div className="flex bg-muted/20 dark:bg-white/5 rounded p-0.5">
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'open'
                  ? 'bg-white dark:bg-darkgray text-dark dark:text-white shadow-sm'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-darkgray text-dark dark:text-white shadow-sm'
                  : 'text-muted hover:text-dark dark:hover:text-white'
              }`}
            >
              History
            </button>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors"
        >
          <Icon 
            icon="ph:arrow-clockwise" 
            className={`text-muted ${loading ? 'animate-spin' : ''}`} 
            width={16} 
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Icon icon="ph:chart-line" className="text-muted mb-3" width={48} />
            <h4 className="text-sm font-medium text-dark dark:text-white mb-1">
              No {activeTab} positions
            </h4>
            <p className="text-xs text-muted">
              {activeTab === 'open' 
                ? 'Start trading to see your open positions here'
                : 'Your closed positions will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {positions.map((position, index) => (
              <div
                key={index}
                className="p-3 bg-muted/10 dark:bg-white/5 rounded-lg border border-border dark:border-darkborder"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    {position.symbol || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted">
                    {position.status || 'Open'}
                  </span>
                </div>
                <div className="text-xs text-muted">
                  No position data available
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}