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
    <div className="min-h-screen flex flex-col bg-[#0b0e11]">
      {/* Top Header Bar */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e2329] bg-[#0b0e11] sticky top-0 z-50">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Icon icon="cryptocurrency:btc" width={24} className="text-[#f0b90b]" />
            <span className="text-lg font-bold text-white">WorldStreet</span>
          </div>
          <nav className="flex items-center gap-6">
            <button className="text-sm text-white hover:text-[#f0b90b] transition-colors">Markets</button>
            <button className="text-sm text-[#f0b90b] font-medium">Trade</button>
            <button className="text-sm text-[#848e9c] hover:text-white transition-colors">Futures</button>
            <button className="text-sm text-[#848e9c] hover:text-white transition-colors">Earn</button>
          </nav>
        </div>

        {/* Right: Search + Account */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Icon icon="ph:magnifying-glass" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#848e9c]" />
            <input
              type="text"
              placeholder="Search"
              className="pl-9 pr-4 py-2 bg-[#1e2329] border border-[#2b3139] rounded text-sm text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#f0b90b] w-64"
            />
          </div>
          <button className="px-4 py-2 bg-[#f0b90b] hover:bg-[#f0b90b]/90 text-[#0b0e11] rounded font-semibold text-sm transition-colors">
            Log In
          </button>
          <button className="px-4 py-2 bg-transparent border border-[#f0b90b] text-[#f0b90b] hover:bg-[#f0b90b]/10 rounded font-semibold text-sm transition-colors">
            Sign Up
          </button>
        </div>
      </div>

      {/* Main Trading Grid */}
      <div className="flex flex-col">
        {/* Top Section: 3 Columns */}
        <div className="grid grid-cols-[300px_1fr_320px]">
          {/* LEFT: Order Book */}
          <div className="border-r border-[#1e2329] min-h-[800px]">
            <BinanceOrderBook selectedPair={selectedPair} />
          </div>

          {/* CENTER: Chart + Order Form */}
          <div className="border-r border-[#1e2329] flex flex-col">
            {/* Pair Header */}
            <div className="px-4 py-3 border-b border-[#1e2329] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{selectedPair.replace('-', '/')}</span>
                  <Icon icon="ph:caret-down" width={16} className="text-[#848e9c]" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-2xl font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {currentPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-[#848e9c]">
                    ${currentPrice.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-[#848e9c]">24h Change</span>
                  <span className={`ml-2 font-semibold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-[#848e9c]">24h High</span>
                  <span className="ml-2 text-white font-mono">{(currentPrice * 1.02).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#848e9c]">24h Low</span>
                  <span className="ml-2 text-white font-mono">{(currentPrice * 0.98).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[#848e9c]">24h Volume({tokenIn})</span>
                  <span className="ml-2 text-white font-mono">28,500.00</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[600px] bg-[#0b0e11]">
              <LiveChart 
                symbol={selectedPair}
                stopLoss={chartStopLoss}
                takeProfit={chartTakeProfit}
                onUpdateLevels={handleUpdateLevels}
              />
            </div>

            {/* Order Form */}
            <div className="border-t border-[#1e2329]">
              <BinanceOrderForm 
                selectedPair={selectedPair}
                onTradeExecuted={handleTradeExecuted}
              />
            </div>
          </div>

          {/* RIGHT: Market List + Market Trades */}
          <div className="flex flex-col">
            {/* Market List */}
            <div className="h-[600px]">
              <BinanceMarketList 
                selectedPair={selectedPair}
                onSelectPair={handleSelectPair}
              />
            </div>

            {/* Market Trades */}
            <div className="border-t border-[#1e2329] bg-[#0b0e11]">
              <div className="flex flex-col">
                <div className="px-4 py-2 border-b border-[#1e2329] flex items-center justify-between">
                  <span className="text-xs font-medium text-[#848e9c]">Market Trades</span>
                </div>
                <div className="h-[400px]">
                  <MarketTrades selectedPair={selectedPair} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Full Width Panel */}
        <div className="border-t border-[#1e2329]">
          <BinanceBottomPanel
            refreshKey={refreshKey}
            selectedChartSymbol={selectedPair}
            onPositionTPSLUpdate={handlePositionTPSLUpdate}
          />
        </div>
      </div>
    </div>
  );
}
