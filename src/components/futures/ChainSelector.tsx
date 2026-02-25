"use client";

import React from 'react';
import { useFuturesStore, Chain } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

const chains: { value: Chain; label: string; icon: string }[] = [
  { value: 'solana', label: 'Solana', icon: 'cryptocurrency:sol' },
  { value: 'arbitrum', label: 'Arbitrum', icon: 'cryptocurrency:arb' },
  { value: 'ethereum', label: 'Ethereum', icon: 'cryptocurrency:eth' },
];

export const ChainSelector: React.FC = () => {
  const { selectedChain, setSelectedChain } = useFuturesStore();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-dark dark:text-white">Chain:</label>
      <select
        value={selectedChain}
        onChange={(e) => setSelectedChain(e.target.value as Chain)}
        className="px-3 py-2 rounded-lg border border-border dark:border-darkborder bg-white dark:bg-darkgray text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {chains.map((chain) => (
          <option key={chain.value} value={chain.value}>
            {chain.label}
          </option>
        ))}
      </select>
    </div>
  );
};
