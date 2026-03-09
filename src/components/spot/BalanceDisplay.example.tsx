/**
 * Example component demonstrating usePairBalances hook usage
 * This file shows various integration patterns
 */

import { useState } from 'react';
import { useAuth } from '@/app/context/authContext';
import { usePairBalances } from '@/hooks/usePairBalances';
import { Icon } from '@iconify/react';

/**
 * Example 1: Basic Balance Display
 */
export function BasicBalanceDisplay() {
  const { user } = useAuth();
  const { tokenIn, tokenOut, loading, error } = usePairBalances(
    user?.userId,
    'BTC-USDT'
  );

  if (loading) {
    return <div className="text-gray-400">Loading balances...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-gray-400">BTC Balance:</span>
        <span className="font-mono text-white">{tokenIn.toFixed(8)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">USDT Balance:</span>
        <span className="font-mono text-white">{tokenOut.toFixed(2)}</span>
      </div>
    </div>
  );
}

/**
 * Example 2: Balance Display with Refresh Button
 */
export function RefreshableBalanceDisplay() {
  const { user } = useAuth();
  const { tokenIn, tokenOut, loading, error, refetch } = usePairBalances(
    user?.userId,
    'ETH-USDT',
    'ethereum'
  );

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Balances</h3>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
        >
          <Icon
            icon="ph:arrow-clockwise"
            className={`text-gray-400 ${loading ? 'animate-spin' : ''}`}
            width={16}
          />
        </button>
      </div>

      {error ? (
        <div className="text-xs text-red-500">{error}</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">ETH:</span>
            <span className="font-mono text-white">{tokenIn.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">USDT:</span>
            <span className="font-mono text-white">{tokenOut.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Trading Form with Dynamic Pair Selection
 */
export function DynamicPairTradingForm() {
  const { user } = useAuth();
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  const { tokenIn, tokenOut, loading } = usePairBalances(
    user?.userId,
    selectedPair
  );

  const [baseAsset, quoteAsset] = selectedPair.split('-');
  const currentBalance = side === 'buy' ? tokenOut : tokenIn;
  const currentAsset = side === 'buy' ? quoteAsset : baseAsset;

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      {/* Pair Selector */}
      <select
        value={selectedPair}
        onChange={(e) => setSelectedPair(e.target.value)}
        className="w-full px-3 py-2 bg-gray-700 text-white rounded"
      >
        <option value="BTC-USDT">BTC/USDT</option>
        <option value="ETH-USDT">ETH/USDT</option>
        <option value="SOL-USDT">SOL/USDT</option>
      </select>

      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide('buy')}
          className={`py-2 rounded font-semibold ${
            side === 'buy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`py-2 rounded font-semibold ${
            side === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Available Balance */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Available:</span>
        <span className="font-mono text-white">
          {loading ? '...' : currentBalance.toFixed(6)} {currentAsset}
        </span>
      </div>

      {/* Amount Input */}
      <input
        type="number"
        placeholder="Amount"
        className="w-full px-3 py-2 bg-gray-700 text-white rounded"
      />

      {/* Submit Button */}
      <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold">
        {side === 'buy' ? 'Buy' : 'Sell'} {baseAsset}
      </button>
    </div>
  );
}

/**
 * Example 4: Multi-Chain Balance Comparison
 */
export function MultiChainBalanceComparison() {
  const { user } = useAuth();
  const [selectedPair] = useState('ETH-USDT');

  const ethereumBalances = usePairBalances(user?.userId, selectedPair, 'ethereum');
  const solanaBalances = usePairBalances(user?.userId, selectedPair, 'solana');

  const chains = [
    { name: 'Ethereum', data: ethereumBalances, icon: 'cryptocurrency:eth' },
    { name: 'Solana', data: solanaBalances, icon: 'cryptocurrency:sol' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Multi-Chain Balances</h3>
      {chains.map((chain) => (
        <div
          key={chain.name}
          className="p-3 bg-gray-800 rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon icon={chain.icon} width={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-400">{chain.name}</span>
          </div>

          {chain.data.loading ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : chain.data.error ? (
            <div className="text-xs text-red-500">{chain.data.error}</div>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">ETH:</span>
                <span className="font-mono text-white">
                  {chain.data.tokenIn.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">USDT:</span>
                <span className="font-mono text-white">
                  {chain.data.tokenOut.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Example 5: Balance with Percentage Slider
 */
export function BalanceWithPercentageSlider() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState(0);

  const { tokenIn, loading } = usePairBalances(user?.userId, 'BTC-USDT');

  const handlePercentageChange = (percent: number) => {
    setPercentage(percent);
    const calculatedAmount = (tokenIn * percent) / 100;
    setAmount(calculatedAmount.toFixed(8));
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Available BTC:</span>
        <span className="font-mono text-white">
          {loading ? '...' : tokenIn.toFixed(8)}
        </span>
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00000000"
        className="w-full px-3 py-2 bg-gray-700 text-white rounded font-mono"
      />

      <input
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
        className="w-full"
      />

      <div className="flex justify-between">
        {[25, 50, 75, 100].map((val) => (
          <button
            key={val}
            onClick={() => handlePercentageChange(val)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
          >
            {val}%
          </button>
        ))}
      </div>
    </div>
  );
}
