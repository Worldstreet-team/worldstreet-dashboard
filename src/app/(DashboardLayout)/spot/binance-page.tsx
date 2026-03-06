'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BinanceOrderBook from '@/components/spot/BinanceOrderBook';
import BinanceMarketList from '@/components/spot/BinanceMarketList';
import BinanceOrderForm from '@/components/spot/BinanceOrderForm';
import BinanceBottomPanel from '@/components/spot/BinanceBottomPanel';
import LiveChart from '@/components/spot/LiveChart';
import MarketTrades from '@/components/spot/MarketTrades';
import MobileTradingModal from '@/components/spot/MobileTradingModal';
import PositionsPanel from '@/components/spot/PositionsPanel';

const AVAILABLE_PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

interface PairData {
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export default function BinanceSpotPage() {
  const pathname = usePathname();
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [selectedChain, setSelectedChain] = useState<string>('evm'); // Track the chain for selected pair
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(); // Track token address
  const [pairData, setPairData] = useState<Record<string, PairData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [activePositionTPSL, setActivePositionTPSL] = useState<{
    symbol: string;
    takeProfit: string | null;
    stopLoss: string | null;
  } | null>(null);
  
  // Mobile state
  const [mobileTab, setMobileTab] = useState<'chart' | 'orderbook' | 'trades' | 'info' | 'data'>('chart');
  const [mobileBottomTab, setMobileBottomTab] = useState<'orders' | 'holdings'>('orders');
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [tradingSide, setTradingSide] = useState<'buy' | 'sell'>('buy');
  const [showPairSelector, setShowPairSelector] = useState(false);

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Close pair selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPairSelector) {
        const target = event.target as HTMLElement;
        if (!target.closest('.pair-selector-container')) {
          setShowPairSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPairSelector]);

  // Fetch real-time data from KuCoin - only fetch selected pair
  useEffect(() => {
    const fetchPairData = async () => {
      try {
        // Always fetch the currently selected pair
        const response = await fetch(`/api/kucoin/ticker?symbol=${selectedPair}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${selectedPair}`);
        }

        const result = await response.json();
        
        if (result.code !== '200000' || !result.data) {
          throw new Error(`Invalid response for ${selectedPair}`);
        }

        const data = result.data;
        const pairName = selectedPair.split('-')[0];
        const fullName = pairName === 'BTC' ? 'Bitcoin' : 
                        pairName === 'ETH' ? 'Ethereum' : 
                        pairName === 'SOL' ? 'Solana' : pairName;

        setPairData(prev => ({
          ...prev,
          [selectedPair]: {
            name: fullName,
            price: parseFloat(data.last) || 0,
            change24h: parseFloat(data.changeRate) * 100 || 0,
            high24h: parseFloat(data.high) || 0,
            low24h: parseFloat(data.low) || 0,
            volume24h: parseFloat(data.vol) || 0
          }
        }));
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching pair data:', error);
        setLoading(false);
      }
    };

    fetchPairData();
    const interval = setInterval(fetchPairData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [selectedPair]); // Re-fetch when selectedPair changes

  // Removed duplicate fetch effect - now handled by main effect above

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

  const handleSelectPair = useCallback((pair: string, chain?: 'solana' | 'ethereum' | 'bitcoin', tokenAddress?: string) => {
    console.log('[BinanceSpotPage] Pair selected:', pair, 'Chain:', chain, 'Token Address:', tokenAddress);
    
    setSelectedPair(pair);
    setShowPairSelector(false);
    setSelectedTokenAddress(tokenAddress);
    
    // Map chain to the format expected by trading components
    let newChain = 'evm'; // Default
    
    if (chain === 'solana') {
      newChain = 'sol';
    } else if (chain === 'ethereum') {
      newChain = 'evm';
    } else if (chain === 'bitcoin') {
      newChain = 'evm'; // Bitcoin uses EVM chain (wrapped BTC on Ethereum)
    } else {
      // Fallback: determine chain from pair name
      const [baseAsset] = pair.split('-');
      const asset = baseAsset.toUpperCase();
      
      if (asset === 'SOL' || asset === 'SOLANA') {
        newChain = 'sol';
      } else if (asset === 'ETH' || asset === 'BTC' || asset === 'ETHEREUM' || asset === 'BITCOIN') {
        newChain = 'evm';
      }
    }
    
    console.log('[BinanceSpotPage] Setting chain to:', newChain);
    setSelectedChain(newChain);
    
    // Immediately fetch the new pair's data
    const fetchNewPairData = async () => {
      try {
        const response = await fetch(`/api/kucoin/ticker?symbol=${pair}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${pair}`);
        }

        const result = await response.json();
        
        if (result.code !== '200000' || !result.data) {
          throw new Error(`Invalid response for ${pair}`);
        }

        const data = result.data;
        const pairName = pair.split('-')[0];
        const fullName = pairName === 'BTC' ? 'Bitcoin' : 
                        pairName === 'ETH' ? 'Ethereum' : 
                        pairName === 'SOL' ? 'Solana' : pairName;

        setPairData(prev => ({
          ...prev,
          [pair]: {
            name: fullName,
            price: parseFloat(data.last) || 0,
            change24h: parseFloat(data.changeRate) * 100 || 0,
            high24h: parseFloat(data.high) || 0,
            low24h: parseFloat(data.low) || 0,
            volume24h: parseFloat(data.vol) || 0
          }
        }));
      } catch (error) {
        console.error('Error fetching new pair data:', error);
      }
    };
    
    fetchNewPairData();
  }, []);

  const handleBuyClick = () => {
    setTradingSide('buy');
    setShowTradingModal(true);
  };

  const handleSellClick = () => {
    setTradingSide('sell');
    setShowTradingModal(true);
  };

  const chartStopLoss = activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.stopLoss || stopLoss 
    : stopLoss;
  
  const chartTakeProfit = activePositionTPSL?.symbol === selectedPair 
    ? activePositionTPSL.takeProfit || takeProfit 
    : takeProfit;

  const currentPairData = pairData[selectedPair];
  const currentPrice = currentPairData?.price || 0;
  const priceChange = currentPairData?.change24h || 0;
  const isPositive = priceChange >= 0;

  // Check if we're on the spot page
  const isSpotPage = pathname === '/spot';

  // Show loading state while fetching initial data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#181a20]">
        <div className="text-center">
          <Icon icon="ph:spinner" className="mx-auto mb-4 text-[#fcd535] animate-spin" width={48} />
          <p className="text-white text-sm">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#181a20] w-full min-h-screen">
      {/* Top Header Bar - Desktop Only */}
      <div className="hidden md:flex h-12 items-center justify-between px-4 border-b border-[#2b3139] bg-[#181a20] shrink-0">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/worldstreet-logo/WorldStreet4x.png"
              alt="WorldStreet"
              width={28}
              height={28}
            />
            <span className="text-base font-semibold text-white">WorldStreet</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/assets" className="text-[13px] text-[#848e9c] hover:text-white transition-colors">
              Assets
            </Link>
            <Link href="/spot" className="text-[13px] text-[#fcd535] font-medium">
              Spot
            </Link>
            <Link href="/futures" className="text-[13px] text-[#848e9c] hover:text-white transition-colors">
              Futures
            </Link>
          </nav>
        </div>

        {/* Right: Account */}
        <div className="flex items-center gap-3">
          <Link href="/" className="px-3.5 py-1.5 bg-transparent hover:bg-[#2b3139] text-white rounded text-[13px] font-semibold transition-colors">
            Dashboard
          </Link>
          <Link href="/tron-swap" className="px-3.5 py-1.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded text-[13px] font-semibold transition-colors">
            Tron-swap
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#2b3139] bg-[#181a20]">
        <div className="flex items-center gap-2">
          <Image
            src="/worldstreet-logo/WorldStreet4x.png"
            alt="WorldStreet"
            width={24}
            height={24}
          />
          <span className="text-sm font-semibold text-white">WorldStreet</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/assets" className="p-2">
            <Icon icon="ph:wallet" width={20} className="text-[#848e9c] hover:text-white transition-colors" />
          </Link>
          <Link href="/futures" className="p-2">
            <Icon icon="ph:chart-line" width={20} className="text-[#848e9c] hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:flex-col flex-1 min-h-0">
          {/* Top Section - 3 columns */}
          <div className="flex-1 grid grid-cols-[280px_1fr_340px] min-h-0">
          {/* LEFT: Order Book */}
          <div className="border-r border-[#2b3139] overflow-hidden">
            <BinanceOrderBook selectedPair={selectedPair} />
          </div>

          {/* CENTER: Chart + Order Form */}
          <div className="border-r border-[#2b3139] flex flex-col min-h-0">
            {/* Pair Header */}
            <div className="px-3 py-2 border-b border-[#2b3139] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative pair-selector-container">
                  <button
                    onClick={() => setShowPairSelector(!showPairSelector)}
                    className="flex items-center gap-1.5 hover:bg-[#2b3139] px-2 py-1 rounded transition-colors"
                  >
                    <span className="text-base font-semibold text-white">{selectedPair.replace('-', '/')}</span>
                    <Icon icon="ph:caret-down" width={14} className="text-[#848e9c]" />
                  </button>
                  
                  {/* Desktop Pair Selector Dropdown */}
                  {showPairSelector && (
                    <div className="absolute left-0 top-full mt-1 bg-[#2b3139] rounded-lg shadow-lg z-50 min-w-[200px]">
                      {AVAILABLE_PAIRS.map((pair) => {
                        // Determine chain for each pair
                        const [baseAsset] = pair.split('-');
                        const chain = baseAsset === 'SOL' ? 'solana' : 
                                     baseAsset === 'ETH' ? 'ethereum' : 
                                     baseAsset === 'BTC' ? 'bitcoin' : 'ethereum';
                        
                        return (
                          <button
                            key={pair}
                            onClick={() => handleSelectPair(pair, chain as 'solana' | 'ethereum' | 'bitcoin')}
                            className={`w-full px-4 py-3 text-left hover:bg-[#1e2329] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              selectedPair === pair ? 'bg-[#1e2329]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium text-sm">{pair.replace('-', '/')}</span>
                              <span className="text-[#848e9c] text-xs">${pairData[pair]?.price.toFixed(2) || '0.00'}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                  <span className="text-white">{currentPairData?.high24h.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Low</span>
                  <span className="text-white">{currentPairData?.low24h.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#848e9c]">24h Volume({tokenIn})</span>
                  <span className="text-white">{currentPairData?.volume24h.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
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
                chain={selectedChain}
                tokenAddress={selectedTokenAddress}
                onTradeExecuted={handleTradeExecuted}
              />
            </div>
          </div>

          {/* RIGHT: Market List + Market Trades */}
          <div className="flex flex-col min-h-0">
            {/* Market List */}
            <div className="flex-1 min-h-0 overflow-hidden">
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
          
          {/* Bottom Section - Positions Panel */}
          <div className="h-[240px] border-t border-[#2b3139] shrink-0">
            <PositionsPanel 
              selectedPair={selectedPair}
              onRefresh={handleTradeExecuted}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-[calc(100vh-60px)] min-h-0">
          {/* Pair Info Header */}
          <div className="px-4 py-3 border-b border-[#2b3139] bg-[#181a20] shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="relative pair-selector-container">
                <button 
                  onClick={() => setShowPairSelector(!showPairSelector)}
                  className="flex items-center gap-2 hover:bg-[#2b3139] px-2 py-1 rounded transition-colors"
                >
                  <Icon icon="cryptocurrency:btc" width={24} className="text-[#fcd535]" />
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-white">{selectedPair.replace('-', '/')}</span>
                    <Icon icon="ph:caret-down" width={12} className="text-[#848e9c]" />
                  </div>
                </button>
                
                {/* Pair Selector Dropdown */}
                {showPairSelector && (
                  <div className="absolute left-0 top-full mt-2 bg-[#2b3139] rounded-lg shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto scrollbar-hide">
                    {AVAILABLE_PAIRS.map((pair) => {
                      // Determine chain for each pair
                      const [baseAsset] = pair.split('-');
                      const chain = baseAsset === 'SOL' ? 'solana' : 
                                   baseAsset === 'ETH' ? 'ethereum' : 
                                   baseAsset === 'BTC' ? 'bitcoin' : 'ethereum';
                      
                      return (
                        <button
                          key={pair}
                          onClick={() => handleSelectPair(pair, chain as 'solana' | 'ethereum' | 'bitcoin')}
                          className={`w-full px-4 py-3 text-left hover:bg-[#181a20] transition-colors ${
                            selectedPair === pair ? 'bg-[#181a20]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{pair.replace('-', '/')}</span>
                            <span className="text-[#848e9c] text-sm">${pairData[pair]?.price.toFixed(2) || '0.00'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Icon icon="ph:star" width={18} className="text-[#848e9c]" />
            </div>
            
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-2xl font-bold ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {currentPrice.toFixed(2)}
              </span>
              <span className="text-sm text-[#848e9c]">
                ${currentPrice.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-[#848e9c]">24h Change </span>
                <span className={`font-medium ${isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-[#848e9c]">24h High </span>
                <span className="text-white">{currentPairData?.high24h.toFixed(2) || '0.00'}</span>
              </div>
              <div>
                <span className="text-[#848e9c]">24h Low </span>
                <span className="text-white">{currentPairData?.low24h.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="mt-2 text-xs">
              <span className="text-[#848e9c]">24h Vol({tokenIn}) </span>
              <span className="text-white">{currentPairData?.volume24h.toFixed(2) || '0.00'}</span>
              <span className="text-[#848e9c] ml-3">24h Vol(USDT) </span>
              <span className="text-white">
                {currentPairData ? (currentPairData.volume24h * currentPairData.price / 1000000).toFixed(2) + 'M' : '0.00'}
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#2b3139] bg-[#181a20] overflow-x-auto scrollbar-hide shrink-0">
            {(['chart', 'orderbook', 'trades', 'info', 'data'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  mobileTab === tab
                    ? 'border-[#fcd535] text-white'
                    : 'border-transparent text-[#848e9c]'
                }`}
              >
                {tab === 'chart' && 'Chart'}
                {tab === 'orderbook' && 'Order Book'}
                {tab === 'trades' && 'Trades'}
                {tab === 'info' && 'Info'}
                {tab === 'data' && 'Trading Data'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 relative">
            {mobileTab === 'chart' && (
              <div className="absolute inset-0">
                <LiveChart 
                  symbol={selectedPair}
                  stopLoss={chartStopLoss}
                  takeProfit={chartTakeProfit}
                  onUpdateLevels={handleUpdateLevels}
                />
              </div>
            )}
            
            {mobileTab === 'orderbook' && (
              <div className="absolute inset-0">
                <BinanceOrderBook selectedPair={selectedPair} />
              </div>
            )}
            
            {mobileTab === 'trades' && (
              <div className="absolute inset-0">
                <MarketTrades selectedPair={selectedPair} />
              </div>
            )}
            
            {mobileTab === 'info' && (
              <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4">
                <div className="text-white space-y-4">
                  <h3 className="text-lg font-semibold">About Bitcoin (BTC)</h3>
                  <p className="text-sm text-[#848e9c] leading-relaxed">
                    Bitcoin (BTC) is a cryptocurrency, a virtual currency designed to act as money and a form of payment outside the control of any one person, group, or entity, removing the need for third-party involvement in financial transactions. It is rewarded to blockchain miners for verifying transactions and can be purchased on several exchanges.
                  </p>
                  <p className="text-sm text-[#848e9c] leading-relaxed">
                    Bitcoin was introduced to the public in 2009 by an anonymous developer or group of developers using the name Satoshi Nakamoto. It has since become the most well-known cryptocurrency in the world. Its popularity has inspired the development of many other cryptocurrencies.
                  </p>
                  <button className="text-[#fcd535] text-sm font-medium">Unfold</button>
                  
                  <div className="pt-4 border-t border-[#2b3139] text-xs text-[#848e9c]">
                    * Underlying data is sourced and provided by CMC and is for reference only. This information is presented on an 'as is' basis and does not serve as any form of representation or guarantee by Binance.
                  </div>
                  
                  <div className="pt-4">
                    <span className="text-[#848e9c] text-sm">Found an issue? </span>
                    <button className="text-[#fcd535] text-sm font-medium">Submit FeedBack</button>
                  </div>
                </div>
              </div>
            )}
            
            {mobileTab === 'data' && (
              <div className="absolute inset-0 overflow-y-auto scrollbar-hide p-4">
                <div className="text-white space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Market Cap</span>
                    <span>$1.42T</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Circulating Supply</span>
                    <span>19.5M BTC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Max Supply</span>
                    <span>21M BTC</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section - Positions */}
          <div className="border-t border-[#2b3139] bg-[#181a20] h-[200px] shrink-0">
            <PositionsPanel 
              selectedPair={selectedPair}
              onRefresh={handleTradeExecuted}
            />
          </div>

          {/* Buy/Sell Buttons - Fixed at bottom */}
          <div className="grid grid-cols-2 gap-0 border-t border-[#2b3139] bg-[#181a20] safe-area-bottom shrink-0">
            <button 
              onClick={handleBuyClick}
              className="py-4 bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white font-semibold text-base transition-colors"
            >
              Buy
            </button>
            <button 
              onClick={handleSellClick}
              className="py-4 bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-semibold text-base transition-colors"
            >
              Sell
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Trading Modal */}
      <MobileTradingModal
        isOpen={showTradingModal}
        onClose={() => setShowTradingModal(false)}
        side={tradingSide}
        selectedPair={selectedPair}
        chain={selectedChain}
        tokenAddress={selectedTokenAddress}
      />
    </div>
  );
}
