'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { usePathname } from 'next/navigation';
import BinanceOrderBook from '@/components/spot/BinanceOrderBook';
import BinanceMarketList from '@/components/spot/BinanceMarketList';
import BinanceOrderForm from '@/components/spot/BinanceOrderForm';
import BinanceBottomPanel from '@/components/spot/BinanceBottomPanel';
import LiveChart from '@/components/spot/LiveChart';
import MarketTrades from '@/components/spot/MarketTrades';

const AVAILABLE_PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

const PAIR_DATA: Record<string, { name: string; basePrice: number }> = {
  'BTC-USDT': { name: 'Bitcoin', basePrice: 69201.46 },
  'ETH-USDT': { name: 'Ethereum', basePrice: 3842.15 },
  'SOL-USDT': { name: 'Solana', basePrice: 198.73 }
};

export default function BinanceSpotPage() {
  const pathname = usePathname();
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [currentPrice, setCurrentPrice] = useState(PAIR_DATA['BTC-USDT'].basePrice);
  const [priceChange, setPriceChange] = useState(3.34);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [activePositionTPSL, setActivePositionTPSL] = useState<{
    symbol: string;
    takeProfit: string | null;
    stopLoss: string | null;
  } | null>(null);

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Update price when pair changes
  useEffect(() => {
    const pairData = PAIR_DATA[selectedPair];
    if (pairData) {
      setCurrentPrice(pairData.basePrice);
      const interval = setInterval(() => {
        const variation = (Math.random() - 0.5) * pairData.basePrice * 0.001;
        const newPrice = pairData.basePrice + variation;
        setCurrentPrice(newPrice);
        setPriceChange(((newPrice - pairData.basePrice) / pairData.basePrice) * 100);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedPair]);

  const handleUpdateLevels = (sl: string, tp: string) => {
    setStopLoss(sl);
    setTakeProfit(tp);
  };

  const handleTradeExecuted = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handlePositionTPSLUpdate = useCallback((symbol: string, tp: string | null, sl: string | null) => {
    const normalizedSymbol = symbol.replace('/', '-');
    setActivePositionTPSL({ symbol: normalizedSymbol, takeProfit: tp, stopLoss: sl });
  }, []);

  const handleSelectPair = (pair: string) => {
    setSelectedPair(pair);
  };

  const chartStopLoss = activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  const currentPairData = PAIR_DATA[selectedPair];
  const isPositive = priceChange >= 0;

  // Check if we're on the spot page
  const isSpotPage = pathname === '/spot';

  return (
    <div className="flex flex-col bg-[#181a20] w-full min-h-screen">
      {/* Top Header Bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#2b3139] bg-[#181a20] shrink-0">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <Icon icon="cryptocurrency:btc" width={20} className="text-[#fcd535]" />
            <span className="text-base font-semibold text-white">WorldStreet</span>
          </div>
          <nav className="flex items-center gap-5">
            <button className="text-[13px] text-[#848e9c] hover:text-white transition-colors">Markets</button>
            <button className="text-[13px] text-[#fcd535] font-medium">Trade</button>
            <button className="text-[13px] text-[#848e9c] hover:text-white transition-colors">Futures</button>
            <button className="text-[13px] text-[#848e9c] hover:text-white transition-colors">Earn</button>
          </nav>
        </div>

        {/* Right: Search + Account */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon icon="ph:magnifying-glass" width={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#848e9c]" />
            <input
              type="text"
              placeholder="Search"
              className="pl-8 pr-3 py-1.5 bg-[#2b3139] border-none rounded text-[13px] text-white placeholder:text-[#5e6673] focus:outline-none focus:bg-[#2b3139] w-52"
            />
          </div>
          <button className="px-3.5 py-1.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-[13px] font-semibold transition-colors">
            Log In
          </button>
          <button className="px-3.5 py-1.5 bg-transparent hover:bg-[#2b3139] text-[#fcd535] rounded text-[13px] font-semibold transition-colors">
            Sign Up
          </button>
        </div>
      </div>

      {/* Main Trading Grid */}
      <div className="flex-1 flex flex-col">
        {/* Top Section: 3 Columns */}
        <div className="grid grid-cols-[280px_1fr_340px] flex-1">
          {/* LEFT: Order Book */}
          <div className="border-r border-[#2b3139] overflow-hidden">
            <BinanceOrderBook selectedPair={selectedPair} />
          </div>

          {/* CENTER: Chart + Order Form */}
          <div className="border-r border-[#2b3139] flex flex-col">
            {/* Pair Header */}
            <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold text-white">{selectedPair.replace('-', '/')}</span>
                  <Icon icon="ph:caret-down" width={14} className="text-[#848e9c]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-semibold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {currentPrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-[#848e9c]">
                    ${currentPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[11px]">
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Change</span>
                  <span className={`font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h High</span>
                  <span className="text-white">{(currentPrice * 1.02).toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Low</span>
                  <span className="text-white">{(currentPrice * 0.98).toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Volume({tokenIn})</span>
                  <span className="text-white">28,500.00</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[400px]">
              <LiveChart 
                symbol={selectedPair}
                stopLoss={chartStopLoss}
                takeProfit={chartTakeProfit}
                onUpdateLevels={handleUpdateLevels}
              />
            </div>

            {/* Order Form */}
            <div className="border-t border-[#2b3139] shrink-0">
              <BinanceOrderForm 
                selectedPair={selectedPair}
                onTradeExecuted={handleTradeExecuted}
              />
            </div>
          </div>

          {/* RIGHT: Market List + Market Trades */}
          <div className="flex flex-col">
            {/* Market List */}
            <div className="flex-1 min-h-[400px] overflow-hidden">
              <BinanceMarketList 
                selectedPair={selectedPair}
                onSelectPair={handleSelectPair}
              />
            </div>

            {/* Market Trades */}
            <div className="h-[280px] border-t border-[#2b3139] bg-[#181a20] shrink-0">
              <div className="flex flex-col h-full">
                <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between shrink-0">
                  <span className="text-xs font-medium text-[#848e9c]">Market Trades</span>
                </div>
                <div className="flex-1 min-h-0">
                  <MarketTrades selectedPair={selectedPair} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
