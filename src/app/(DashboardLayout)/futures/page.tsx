"use client";

import React, { useEffect, useState } from 'react';
import { ChainSelector } from '@/components/futures/ChainSelector';
import { MarketSelector } from '@/components/futures/MarketSelector';
import { OrderPanel } from '@/components/futures/OrderPanel';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { useFuturesData } from '@/hooks/useFuturesData';
import { useFuturesStore } from '@/store/futuresStore';
import { Icon } from '@iconify/react';

const FuturesPage: React.FC = () => {
  const { selectedChain, selectedMarket, markets, walletAddresses, isLoading, setSelectedMarket } = useFuturesStore();
  const { fetchWallet } = useFuturesData();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  useEffect(() => {
    const checkWallet = async () => {
      const result = await fetchWallet();
      if (!result.exists) {
        setShowWalletModal(true);
      }
      setWalletChecked(true);
    };

    checkWallet();
  }, [selectedChain, fetchWallet]);

  const handleWalletCreated = (address: string) => {
    console.log('Wallet created:', address);
  };

  if (!walletChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-4 text-primary" height={48} />
          <p className="text-muted dark:text-darklink">Loading futures trading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-darkgray rounded-lg border border-border dark:border-darkborder p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white mb-1">Futures Trading</h1>
            <p className="text-sm text-muted dark:text-darklink">
              Trade perpetual futures with up to 20x leverage
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <ChainSelector />
            <MarketSelector />
          </div>
        </div>

        {/* Wallet Address Display */}
        {walletAddresses[selectedChain] && (
          <div className="mt-4 pt-4 border-t border-border dark:border-darkborder">
            <div className="flex items-center gap-2">
              <Icon icon="ph:wallet-duotone" className="text-primary" height={20} />
              <span className="text-sm text-muted dark:text-darklink">Futures Wallet:</span>
              <code className="text-sm font-mono text-dark dark:text-white bg-gray-100 dark:bg-dark px-2 py-1 rounded">
                {walletAddresses[selectedChain]}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Chart & Positions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trading Chart */}
          <div className="h-[600px]">
            <FuturesChart 
              symbol={selectedMarket?.symbol || 'BTC-USDT'}
              isDarkMode={true}
            />
          </div>

          {/* Positions */}
          <PositionPanel />
        </div>

        {/* Right Column - Order & Risk */}
        <div className="space-y-4">
          <OrderPanel />
          <RiskPanel />
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletCreated={handleWalletCreated}
      />
    </div>
  );
};

export default FuturesPage;
