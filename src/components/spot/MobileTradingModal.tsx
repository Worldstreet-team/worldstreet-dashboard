'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';

interface MobileTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'buy' | 'sell';
  selectedPair: string;
  chain?: string;
}

export default function MobileTradingModal({ isOpen, onClose, side, selectedPair, chain }: MobileTradingModalProps) {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market'); // Changed default to 'market'
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);

  const [tokenIn, tokenOut] = selectedPair.split('-');

  // Determine chain based on the base asset if not explicitly provided
  const getChainForPair = (pair: string): string => {
    const [baseAsset] = pair.split('-');
    const asset = baseAsset.toUpperCase();
    
    if (asset === 'ETH' || asset === 'BTC') {
      return 'evm'; // Ethereum chain for ETH and BTC
    } else if (asset === 'SOL') {
      return 'sol'; // Solana chain for SOL
    }
    
    return 'tron'; // Default to Tron
  };

  const effectiveChain = chain || getChainForPair(selectedPair);

  // Use the custom hook to fetch pair balances
  const { 
    tokenIn: sellBalance, 
    tokenOut: buyBalance, 
    loading: loadingBalances,
    error: balanceError,
    refetch: refetchBalances 
  } = usePairBalances(user?.userId, selectedPair, effectiveChain);

  // Current balance based on buy/sell side
  const currentBalance = side === 'buy' ? buyBalance : sellBalance;
  const currentToken = side === 'buy' ? tokenOut : tokenIn;

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('[MobileTradingModal] Balance Debug:', {
        userId: user?.userId,
        selectedPair,
        side,
        chain: effectiveChain,
        sellBalance,
        buyBalance,
        currentBalance,
        loadingBalances,
        balanceError
      });
    }
  }, [isOpen, user?.userId, selectedPair, side, effectiveChain, sellBalance, buyBalance, currentBalance, loadingBalances, balanceError]);

  const handlePercentage = (percent: number) => {
    const calculatedAmount = (currentBalance * percent) / 100;
    setAmount(calculatedAmount.toFixed(6));
    setSliderValue(percent);
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Handle order submission
    console.log('Order submitted:', { side, orderType, price, amount, total });
    
    // Simulate trade execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Refetch balances after trade
    await refetchBalances();
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full md:max-w-md bg-[#181a20] md:rounded-t-2xl rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-semibold text-white">
            {side === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2b3139] rounded-full transition-colors">
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
          {/* Order Type Tabs */}
          <div className="flex gap-2 p-1 bg-[#2b3139] rounded-lg">
            <button
              onClick={() => setOrderType('market')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                orderType === 'market'
                  ? 'bg-[#181a20] text-white'
                  : 'text-[#848e9c]'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                orderType === 'limit'
                  ? 'bg-[#181a20] text-white'
                  : 'text-[#848e9c]'
              }`}
            >
              Limit
            </button>
          </div>

          {/* Available Balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#848e9c]">Available</span>
            <span className="text-white font-mono">
              {loadingBalances ? (
                <span className="text-[#848e9c]">Loading...</span>
              ) : balanceError ? (
                <span className="text-[#f6465d]">Error</span>
              ) : (
                `${currentBalance.toFixed(6)} ${currentToken}`
              )}
            </span>
          </div>

          {/* Balance Error Alert */}
          {balanceError && (
            <div className="p-3 bg-[rgba(246,70,93,0.12)] border border-[#f6465d] rounded-lg text-xs text-[#f6465d]">
              {balanceError}
            </div>
          )}

          {/* Price Input (for limit orders) */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Price</label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                  {tokenOut}
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm text-[#848e9c] mb-2">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                {tokenIn}
              </span>
            </div>
          </div>

          {/* Percentage Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                onClick={() => handlePercentage(percent)}
                className="py-2 bg-[#2b3139] hover:bg-[#2b3139]/80 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {percent}%
              </button>
            ))}
          </div>

          {/* Total (for limit orders) */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm text-[#848e9c] mb-2">Total</label>
              <div className="relative">
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#848e9c]">
                  {tokenOut}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2b3139] safe-area-bottom">
          <button
            onClick={handleSubmit}
            className={`w-full py-4 rounded-lg font-semibold text-base transition-colors ${
              side === 'buy'
                ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
            }`}
          >
            {side === 'buy' ? 'Buy' : 'Sell'} {tokenIn}
          </button>
        </div>
      </div>
    </div>
  );
}
