'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface MobilePairHeaderProps {
  selectedPair: string;
  onSelectPair: (pair: string) => void;
}

const COINGECKO_IDS: Record<string, string> = {
  'BTC-USDT': 'bitcoin',
  'ETH-USDT': 'ethereum',
  'BNB-USDT': 'binancecoin',
  'SOL-USDT': 'solana',
  'XRP-USDT': 'ripple',
  'ADA-USDT': 'cardano'
};

export default function MobilePairHeader({ selectedPair, onSelectPair }: MobilePairHeaderProps) {
  const [price, setPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [showMarginToggle] = useState(false);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 20000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const fetchPrice = async () => {
    try {
      const coinId = COINGECKO_IDS[selectedPair];
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();
      setPrice(data[coinId]?.usd || 0);
      setChange24h(data[coinId]?.usd_24h_change || 0);
    } catch (err) {
      console.error('Error fetching price:', err);
    }
  };

  const isPositive = change24h >= 0;

  return (
    <div className="flex justify-between items-start px-4 py-3 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
      {/* Left Column */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-dark dark:text-white">
            {selectedPair.replace('-', '/')}
          </span>
          <Icon icon="ph:caret-down" width={14} className="text-muted" />
        </div>
        <span className={`text-xs font-semibold mt-0.5 ${
          isPositive ? 'text-error' : 'text-success'
        }`}>
          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
        </span>
      </div>

      {/* Right Column */}
      <div className="flex items-center gap-3">
        {showMarginToggle && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Margin</span>
            <div className="w-8 h-4 bg-muted/30 dark:bg-white/10 rounded-full relative">
              <div className="w-3 h-3 bg-white dark:bg-darkgray rounded-full absolute top-0.5 left-0.5 transition-transform" />
            </div>
          </div>
        )}
        
        <button className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors">
          <Icon icon="ph:chart-line" width={18} className="text-muted" />
        </button>
        
        <button className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors">
          <Icon icon="ph:dots-three" width={18} className="text-muted" />
        </button>
      </div>
    </div>
  );
}
