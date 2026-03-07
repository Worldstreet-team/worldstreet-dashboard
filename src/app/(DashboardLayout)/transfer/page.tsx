"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";
import { useDrift } from "@/app/context/driftContext";
import { useAuth } from "@/app/context/authContext";
import { useSolana } from "@/app/context/solanaContext";
import CryptoJS from "crypto-js";

const USDC_ICON = "https://cryptologos.cc/logos/usd-coin-usdc-logo.png";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export default function TransferPage() {
  const { user } = useAuth();
  const { 
    summary, 
    walletBalance,
    isClientReady,
    refreshSummary,
  } = useDrift();
  
  const { 
    tokenBalances: solTokens,
    sendTokenTransaction: sendSolTokenTransaction,
  } = useSolana();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const userId = user?.userId || '';
  const driftAddress = summary?.publicAddress || '';
  
  // Get USDC balance from main wallet
  const usdcToken = solTokens.find(t => 
    t.address.toLowerCase() === USDC_MINT.toLowerCase()
  );
  const mainUsdcBalance = usdcToken?.amount || 0;
  
  // Get USDC balance from Drift (collateral)
  const driftUsdcBalance = summary?.totalCollateral || 0;

  const handleCopyAddress = () => {
    if (driftAddress) {
      navigator.clipboard.writeText(driftAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleTransfer = async () => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!driftAddress) {
      setError('Drift wallet not initialized');
      return;
    }

    setError('');
    setSuccess('');
    setShowPinModal(true);
  };

  const executeTransfer = async () => {
    const pinString = pin.join('');
    if (pinString.length !== 6) return;

    setLoading(true);
    setPinError('');

    try {
      // Fetch encrypted keys
      const response = await fetch('/api/wallet/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinString })
      });

      const data = await response.json();

      if (!data.success || !data.wallets?.solana?.encryptedPrivateKey) {
        setPinError('Invalid PIN or wallet not found');
        setLoading(false);
        return;
      }

      const encryptedPrivateKey = data.wallets.solana.encryptedPrivateKey;
      const amountNum = parseFloat(amount);

      // Send USDC to Drift wallet
      const txHash = await sendSolTokenTransaction(
        encryptedPrivateKey,
        pinString,
        driftAddress,
        amountNum,
        USDC_MINT,
        6 // USDC decimals
      );

      setSuccess(`Successfully transferred ${amount} USDC to Trading Wallet. TX: ${txHash.slice(0, 8)}...`);
      setAmount('');
      setShowPinModal(false);
      setPin(['', '', '', '', '', '']);
      
      // Refresh Drift summary to show updated balance
      await refreshSummary();
    } catch (err) {
      console.error('Transfer error:', err);
      setPinError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // PIN handlers
  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) pinRefs.current[index + 1]?.focus();
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Transfer to Trading Wallet</h1>
        <p className="text-muted text-sm mt-1">
          Deposit USDC to your unified trading wallet for Spot and Futures trading
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon icon="ph:info" className="text-primary" width={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-dark dark:text-white mb-1">Unified Trading Wallet</h3>
            <p className="text-sm text-muted mb-2">
              Your Spot and Futures trading share the same wallet powered by Drift Protocol on Solana.
            </p>
            <ul className="text-xs text-muted space-y-1">
              <li>• Only USDC deposits are supported</li>
              <li>• Funds are available for both Spot and Futures trading</li>
              <li>• Transfers are processed on Solana network</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet Address Card */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Trading Wallet Address</h3>
            
            {isClientReady && driftAddress ? (
              <div className="space-y-3">
                <div className="p-4 bg-muted/20 dark:bg-white/5 rounded-xl border border-border/50 dark:border-darkborder">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted font-medium">Solana Address</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-dark dark:text-white break-all">
                      {driftAddress}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 hover:bg-muted/30 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy address"
                    >
                      <Icon 
                        icon={copiedAddress ? "ph:check" : "ph:copy"} 
                        className={copiedAddress ? "text-green-500" : "text-muted"} 
                        width={18} 
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <Icon icon="ph:warning" className="text-blue-500 shrink-0 mt-0.5" width={16} />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Send only USDC (SPL token) on Solana network to this address. Sending other tokens may result in permanent loss.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">Initializing wallet...</p>
                </div>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Transfer Amount</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-2 block">Amount (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={USDC_ICON} alt="USDC" className="w-5 h-5 rounded-full" />
                    <span className="font-semibold text-dark dark:text-white">USDC</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-2">
                  Available in Main Wallet: {mainUsdcBalance.toFixed(6)} USDC
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAmount((mainUsdcBalance * 0.25).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setAmount((mainUsdcBalance * 0.5).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmount((mainUsdcBalance * 0.75).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  75%
                </button>
                <button
                  onClick={() => setAmount((mainUsdcBalance * 0.99).toString())}
                  className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Max
                </button>
              </div>
              
              {/* Gas Fee Info */}
              <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <Icon icon="ph:info" className="text-amber-500 shrink-0 mt-0.5" width={16} />
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  <p className="font-semibold mb-1">Transaction Fee Notice</p>
                  <p>A small amount of SOL (~0.00001 SOL) is required for transaction fees. Make sure you have SOL in your main wallet.</p>
                </div>
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
              disabled={loading || !amount || !isClientReady || !driftAddress}
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
                  Transfer to Trading Wallet
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
                <p className="text-xs text-muted">Solana Network</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={USDC_ICON} alt="USDC" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium text-dark dark:text-white">USDC</span>
                </div>
                <span className="text-sm font-semibold text-dark dark:text-white">
                  {mainUsdcBalance.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-medium text-dark dark:text-white">SOL</span>
                  <span className="text-xs text-muted">(Gas)</span>
                </div>
                <span className="text-sm font-semibold text-dark dark:text-white">
                  {walletBalance.toFixed(6)}
                </span>
              </div>
            </div>
          </div>

          {/* Trading Wallet Balance */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon icon="ph:chart-line" className="text-purple-500" width={20} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">Trading Wallet</h3>
                <p className="text-xs text-muted">Spot & Futures</p>
              </div>
            </div>
            {isClientReady ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={USDC_ICON} alt="USDC" className="w-6 h-6 rounded-full" />
                    <span className="text-sm font-medium text-dark dark:text-white">USDC</span>
                  </div>
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    {driftUsdcBalance.toFixed(6)}
                  </span>
                </div>
                <div className="p-3 bg-muted/20 dark:bg-white/5 rounded-lg">
                  <p className="text-xs text-muted">
                    This balance is shared between Spot and Futures trading
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="ph:lightbulb" className="text-primary" width={18} />
              <h3 className="font-semibold text-dark dark:text-white text-sm">How it Works</h3>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p>• Transfer USDC from your main wallet to trading wallet</p>
              <p>• Use the same balance for both Spot and Futures</p>
              <p>• Powered by Drift Protocol on Solana</p>
              <p>• Instant transfers with low fees</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !loading && setShowPinModal(false)} 
          />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2 text-center">
              Confirm Transfer
            </h3>
            <p className="text-sm text-muted text-center mb-1">
              Transferring <span className="font-semibold text-dark dark:text-white">{amount} USDC</span>
            </p>
            <p className="text-sm text-muted text-center mb-1">
              From <span className="font-semibold text-dark dark:text-white">Main Wallet</span> to{' '}
              <span className="font-semibold text-dark dark:text-white">Trading Wallet</span>
            </p>
            <p className="text-xs text-muted text-center mb-6">
              Enter your 6-digit PIN to authorize this transfer.
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-sm text-red-500 text-center mb-4">{pinError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setShowPinModal(false); 
                  setPin(['', '', '', '', '', '']); 
                  setPinError(''); 
                }}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeTransfer}
                disabled={pin.some((d) => !d) || loading}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
