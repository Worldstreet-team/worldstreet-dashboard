"use client";

import React, { useEffect, useState } from 'react';
import { ChainSelector } from '@/components/futures/ChainSelector';
import { MarketSelector } from '@/components/futures/MarketSelector';
import { OrderPanel } from '@/components/futures/OrderPanel';
import { PositionPanel } from '@/components/futures/PositionPanel';
import { RiskPanel } from '@/components/futures/RiskPanel';
import { WalletModal } from '@/components/futures/WalletModal';
import { SolRequirementModal } from '@/components/futures/SolRequirementModal';
import { FuturesChart } from '@/components/futures/FuturesChart';
import { FuturesWalletBalance } from '@/components/futures/FuturesWalletBalance';
import { CollateralPanel } from '@/components/futures/CollateralPanel';
import { DriftAccountStatus } from '@/components/futures/DriftAccountStatus';
import { useFuturesData } from '@/hooks/useFuturesData';
import { useFuturesStore } from '@/store/futuresStore';
import { useDrift } from '@/app/context/driftContext';
import { Icon } from '@iconify/react';

interface SolBalanceCheck {
  hasWallet: boolean;
  hasSufficientSol: boolean;
  isDriftInitialized: boolean;
  requiredSol: number;
  currentSol: number;
  shortfall: number;
  walletAddress?: string;
  message: string;
}

const FuturesPage: React.FC = () => {
  const { selectedChain, selectedMarket, markets, walletAddresses, isLoading, setSelectedMarket } = useFuturesStore();
  const { fetchWallet } = useFuturesData();
  const { isInitialized, needsInitialization, startAutoRefresh, stopAutoRefresh } = useDrift();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSolRequirementModal, setShowSolRequirementModal] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [solBalanceCheck, setSolBalanceCheck] = useState<SolBalanceCheck | null>(null);

  // Auto-select first market when markets load
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket, setSelectedMarket]);

  // Start auto-refresh when account is initialized
  useEffect(() => {
    if (isInitialized) {
      startAutoRefresh(30000); // Refresh every 30 seconds
      return () => stopAutoRefresh();
    }
  }, [isInitialized, startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    const checkWallet = async () => {
      try {
        const result = await fetchWallet();
        if (!result.exists) {
          setShowWalletModal(true);
          setWalletChecked(true);
          return;
        }

        // Wallet exists, now check SOL balance and Drift initialization
        const solCheckResponse = await fetch('/api/futures/check-sol-balance');
        if (solCheckResponse.ok) {
          const solCheck: SolBalanceCheck = await solCheckResponse.json();
          setSolBalanceCheck(solCheck);

          // Only show modal if Drift is not initialized AND SOL is insufficient
          if (!solCheck.isDriftInitialized && !solCheck.hasSufficientSol) {
            setShowSolRequirementModal(true);
          }
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      } finally {
        setWalletChecked(true);
      }
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
      {/* Drift Account Status */}
      <DriftAccountStatus />

      {/* SOL Requirement Warning Banner */}
      {solBalanceCheck && !solBalanceCheck.isDriftInitialized && !solBalanceCheck.hasSufficientSol && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon icon="ph:warning-duotone" className="text-warning flex-shrink-0 mt-0.5" height={24} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-warning mb-1">SOL Required for Initialization</h4>
              <p className="text-xs text-warning/80 mb-3">
                You need at least {solBalanceCheck.requiredSol ?? 0} SOL in your futures wallet to initialize your Drift account. 
                Current balance: {(solBalanceCheck.currentSol ?? 0).toFixed(4)} SOL
              </p>
              <button
                onClick={() => setShowSolRequirementModal(true)}
                className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning/90 transition-colors"
              >
                <Icon icon="ph:wallet" className="inline mr-2" height={16} />
                Add SOL to Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
              symbol={selectedMarket?.symbol}
              isDarkMode={true}
            />
          </div>

          {/* Positions */}
          <PositionPanel />
        </div>

        {/* Right Column - Order & Risk */}
        <div className="space-y-4">
          <FuturesWalletBalance />
          <CollateralPanel />
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

      {/* SOL Requirement Modal */}
      {solBalanceCheck && !solBalanceCheck.isDriftInitialized && !solBalanceCheck.hasSufficientSol && (
        <SolRequirementModal
          isOpen={showSolRequirementModal}
          onClose={() => setShowSolRequirementModal(false)}
          requiredSol={solBalanceCheck.requiredSol}
          currentSol={solBalanceCheck.currentSol}
          shortfall={solBalanceCheck.shortfall}
          walletAddress={solBalanceCheck.walletAddress || ''}
        />
      )}
    </div>
  );
};

export default FuturesPage;
