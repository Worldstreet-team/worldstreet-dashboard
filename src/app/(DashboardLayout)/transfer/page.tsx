"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";

interface Balance {
  asset: string;
  available_balance: string;
  locked_balance: string;
}

interface SpotWallet {
  asset: string;
  public_address: string;
}

const ASSET_ICONS: Record<string, string> = {
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  SOL: "https://cryptologos.cc/logos/solana-sol-logo.png",
};

export default function TransferPage() {
  const [direction, setDirection] = useState<'main-to-spot' | 'spot-to-main'>('main-to-spot');
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [mainBalances, setMainBalances] = useState<Balance[]>([]);
  const [spotBalances, setSpotBalances] = useState<Balance[]>([]);
  const [spotWallets, setSpotWallets] = useState<SpotWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingWallet, setGeneratingWallet] = useState(false);

  const userId = 'user123'; // Replace with actual user ID from auth
  const assets = ['USDT', 'USDC', 'ETH', 'SOL'];

  useEffect(() => {
    fetchBalances();
    fetchSpotWallets();
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/balances`);
      if (response.ok) {
        const data = await response.json();
        setMainBalances(data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const fetchSpotWallets = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/spot-wallets`);
      if (response.ok) {
        const data = await response.json();
        setSpotWallets(data.wallets || []);
        setSpotBalances(data.balances || []);
      }
    } catch (err) {
      console.error('Failed to fetch spot wallets:', err);
    }
  };

  const handleGenerateWallets = async () => {
    setGeneratingWallet(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${userId}/spot-wallets`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Spot wallets generated successfully!');
        await fetchSpotWallets();
      } else {
        setError(data.error || 'Failed to generate wallets');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setGeneratingWallet(false);
    }
  };

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          asset: selectedAsset,
          amount: parseFloat(amount),
          direction,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully transferred ${amount} ${selectedAsset}`);
        setAmount('');
        await fetchBalances();
        await fetchSpotWallets();
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    setDirection(direction === 'main-to-spot' ? 'spot-to-main' : 'main-to-spot');
    setAmount('');
    setError('');
    setSuccess('');
  };

  const getBalance = (asset: string, isSpot: boolean) => {
    const balances = isSpot ? spotBalances : mainBalances;
    const balance = balances.find(b => b.asset === asset);
    return balance ? parseFloat(balance.available_balance) : 0;
  };

  const getSpotWallet = (asset: string) => {
    return spotWallets.find(w => w.asset === asset);
  };

  const currentBalance = direction === 'main-to-spot' 
    ? getBalance(selectedAsset, false)
    : getBalance(selectedAsset, true);

  const hasSpotWallets = spotWallets.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Transfer Funds</h1>
        <p className="text-muted text-sm mt-1">
          Move funds between your main wallet and spot trading wallet
        </p>
      </div>

      {/* Wallet Setup Alert */}
      {!hasSpotWallets && (
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="ph:wallet" className="text-primary" width={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-dark dark:text-white mb-1">Setup Spot Wallets</h3>
              <p className="text-sm text-muted mb-4">
                Generate dedicated spot trading wallets to start transferring funds
              </p>
              <button
                onClick={handleGenerateWallets}
                disabled={generatingWallet}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingWallet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="ph:plus-circle" width={18} />
                    Generate Spot Wallets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Direction Toggle */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Transfer Direction</h3>
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-4 bg-muted/30 dark:bg-white/5 p-3 rounded-xl">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  direction === 'main-to-spot' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted'
                }`}>
                  <Icon icon="ph:wallet" width={18} />
                  <span className="font-medium">Main Wallet</span>
                </div>
                <button
                  onClick={toggleDirection}
                  className="p-2 rounded-lg bg-white dark:bg-black hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon icon="ph:arrows-left-right" width={20} className="text-primary" />
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  direction === 'spot-to-main' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted'
                }`}>
                  <Icon icon="ph:chart-line" width={18} />
                  <span className="font-medium">Spot Wallet</span>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Select Asset</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAsset === asset
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 dark:border-darkborder hover:border-primary/50'
                  }`}
                >
                  <img src={ASSET_ICONS[asset]} alt={asset} className="w-8 h-8 rounded-full" />
                  <span className="font-semibold text-dark dark:text-white">{asset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Transfer Amount</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={ASSET_ICONS[selectedAsset]} alt={selectedAsset} className="w-5 h-5 rounded-full" />
                    <span className="font-semibold text-dark dark:text-white">{selectedAsset}</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-2">
                  Available: {currentBalance.toFixed(6)} {selectedAsset}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAmount((currentBalance * 0.25).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setAmount((currentBalance * 0.5).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmount((currentBalance * 0.75).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  75%
                </button>
                <button
                  onClick={() => setAmount(currentBalance.toString())}
                  className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <Icon icon="ph:warning-circle" className="text-red-500 shrink-0" width={20} />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
                <Icon icon="ph:check-circle" className="text-green-500 shrink-0" width={20} />
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={loading || !hasSpotWallets || !amount}
              className="w-full mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon icon="ph:arrow-right" width={20} />
                  Transfer {direction === 'main-to-spot' ? 'to Spot' : 'to Main'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="space-y-6">
          {/* Main Wallet Balance */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Icon icon="ph:wallet" className="text-blue-500" width={20} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">Main Wallet</h3>
                <p className="text-xs text-muted">Available Balance</p>
              </div>
            </div>
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={ASSET_ICONS[asset]} alt={asset} className="w-6 h-6 rounded-full" />
                    <span className="text-sm font-medium text-dark dark:text-white">{asset}</span>
                  </div>
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    {getBalance(asset, false).toFixed(6)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spot Wallet Balance */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon icon="ph:chart-line" className="text-purple-500" width={20} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">Spot Wallet</h3>
                <p className="text-xs text-muted">Trading Balance</p>
              </div>
            </div>
            {hasSpotWallets ? (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <img src={ASSET_ICONS[asset]} alt={asset} className="w-6 h-6 rounded-full" />
                        <span className="text-sm font-medium text-dark dark:text-white">{asset}</span>
                      </div>
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        {getBalance(asset, true).toFixed(6)}
                      </span>
                    </div>
                    {getSpotWallet(asset) && (
                      <p className="text-[10px] text-muted truncate ml-8">
                        {getSpotWallet(asset)?.public_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">No spot wallets generated</p>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="ph:info" className="text-primary" width={18} />
              <h3 className="font-semibold text-dark dark:text-white text-sm">Transfer Info</h3>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p>• Transfers are instant and free</p>
              <p>• Spot wallets are used for trading only</p>
              <p>• Main wallet is for general storage</p>
              <p>• You can transfer back anytime</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
