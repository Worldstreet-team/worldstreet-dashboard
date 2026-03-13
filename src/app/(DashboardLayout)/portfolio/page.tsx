'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import Link from 'next/link';
import { useWallet } from '@/app/context/walletContext';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { useEvm } from '@/app/context/evmContext';
import Watchlist from '@/components/trading/Watchlist';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PortfolioPage() {
  const { addresses, tradingWallet, privyUserId, walletsGenerated } = useWallet();
  const { 
    usdcBalance: hlUsdc, 
    accountValue: hlValue, 
    loading: hlLoading, 
    error: hlError,
    refetch: refetchHl 
  } = useHyperliquidBalance(privyUserId || '', !!privyUserId);
  
  const { 
    balance: ethBalance,
    tokenBalances: evmTokenBalances,
    arbitrumBalance: arbBalance,
    arbitrumTokenBalances: arbTokenBalances,
    loading: evmLoading,
    fetchBalance: refetchEvm 
  } = useEvm();

  // Combine ETH and tokens for display
  const mainBalances = React.useMemo(() => {
    const list = [];
    
    // Add Ethereum ETH
    if (ethBalance > 0) {
      list.push({
        asset: 'ETH',
        chain: 'ethereum',
        balance: ethBalance,
        usdValue: ethBalance * 2500, // Mock price for UI
      });
    }
    
    // Add Ethereum tokens
    evmTokenBalances.forEach(token => {
      list.push({
        asset: token.symbol,
        chain: 'ethereum',
        balance: token.amount,
        usdValue: token.amount * (token.symbol === 'USDC' || token.symbol === 'USDT' ? 1 : 0), // Mock price
      });
    });

    // Add Arbitrum ETH
    if (arbBalance > 0) {
      list.push({
        asset: 'ETH',
        chain: 'arbitrum',
        balance: arbBalance,
        usdValue: arbBalance * 2500, // Mock price
      });
    }

    // Add Arbitrum tokens
    arbTokenBalances.forEach(token => {
      list.push({
        asset: token.symbol,
        chain: 'arbitrum',
        balance: token.amount,
        usdValue: token.amount * (token.symbol === 'USDC' || token.symbol === 'USDT' ? 1 : 0), // Mock price
      });
    });
    
    return list;
  }, [ethBalance, evmTokenBalances, arbBalance, arbTokenBalances]);

  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'fund'>('overview');
  const [transferAmount, setTransferAmount] = useState('');
  
  // Find Arbitrum USDC specifically for funding
  const arbUsdc = React.useMemo(() => {
    return arbTokenBalances.find(t => t.symbol === 'USDC') || { symbol: 'USDC', amount: 0, decimals: 6 };
  }, [arbTokenBalances]);

  const [selectedAsset, setSelectedAsset] = useState(mainBalances[0] || { asset: 'ETH', chain: 'ethereum', balance: 0, usdValue: 0 });
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [quote, setQuote] = useState<{ toAmount: number; fee: number } | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  // Bridge logic (placeholder for Li.Fi quote)
  const fetchBridgeQuote = useCallback(async (amount: string, fromToken: string, fromChain: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    
    setIsQuoting(true);
    try {
      // Mock quote logic - in real app, call /api/spot/quote
      const amountNum = parseFloat(amount);
      const fee = fromChain === 'ethereum' ? 5 : 1; // Arbitrary bridge fees
      const rate = 1.0; // Assume 1:1 for now
      
      setQuote({
        toAmount: Math.max(0, (amountNum * rate) - fee),
        fee
      });
    } catch (err) {
      console.error('Quote error:', err);
    } finally {
      setIsQuoting(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'fund' && transferAmount && selectedAsset.asset !== 'USDC') {
      const timer = setTimeout(() => {
        fetchBridgeQuote(transferAmount, selectedAsset.asset, selectedAsset.chain);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setQuote(null);
    }
  }, [transferAmount, selectedAsset, activeTab, fetchBridgeQuote]);

  // Bybit-style transfer logic
  const handleInternalTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) return;
    
    setIsTransferring(true);
    setTransferStatus(null);
    
    try {
      const isBridge = selectedAsset.chain !== 'arbitrum' || selectedAsset.asset !== 'USDC';
      
      const response = await fetch('/api/privy/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(transferAmount),
          asset: selectedAsset.asset,
          fromChain: selectedAsset.chain,
          isBridge
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setTransferStatus({ success: true });
        setTransferAmount('');
        // Refresh balances
        setTimeout(() => {
          if (refetchHl) refetchHl();
          if (refetchEvm) refetchEvm();
        }, 2000);
      } else {
        // If 404, it might mean we need setup
        if (response.status === 404) {
          setTransferStatus({ 
            error: 'Account not initialized. Please click the button below to setup your trading account.' 
          });
        } else {
          setTransferStatus({ error: result.error || 'Transfer failed' });
        }
      }
    } catch (err: any) {
      setTransferStatus({ error: err.message });
    } finally {
      setIsTransferring(false);
    }
  };

  const { setupTradingWallet } = useWallet();
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      await setupTradingWallet();
      setTransferStatus({ success: true });
      // Refresh to see if trading wallet is now available
    } catch (err: any) {
      setTransferStatus({ error: err.message || 'Setup failed' });
    } finally {
      setIsSettingUp(false);
    }
  };

  const formatUSD = (num: number) => {
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const mainUsdc = evmTokenBalances.find(b => b.symbol === 'USDC')?.amount || 0;

  return (
    <div className="dark h-full bg-[#0b0e11] text-white overflow-y-auto scrollbar-hide overscroll-contain touch-manipulation">
      {/* Top Header Section */}
      <div className="sticky top-0 z-50 border-b border-[#2b3139] bg-[#161a1e]/80 backdrop-blur-md px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-white">Portfolio Account</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              Privy Account: <span className="text-white font-mono">{privyUserId?.slice(0, 8)}...{privyUserId?.slice(-4)}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Net Worth</p>
              <p className="text-3xl font-bold text-[#fcd535]">{formatUSD(hlValue + (mainBalances.reduce((acc, b) => acc + b.usdValue, 0)))}</p>
            </div>
            <div className="h-10 w-[1px] bg-[#2b3139] mx-2 hidden md:block"></div>
            <Button 
              onClick={() => { refetchHl(); refetchEvm(); }} 
              variant="outline" 
              className="border-[#2b3139] hover:bg-[#2b3139] text-white"
            >
              <Icon icon="ph:arrow-clockwise" className={`mr-2 ${(hlLoading || evmLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[108px] z-40 bg-[#0b0e11] max-w-7xl mx-auto px-6 mt-6">
        <div className="flex border-b border-[#2b3139] gap-8">
          {(['overview', 'wallets', 'fund'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab ? 'text-[#fcd535]' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'fund' ? 'Fund Trading Wallet' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fcd535]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats or Transfer */}
          <div className="lg:col-span-8 space-y-8">
            
            {activeTab === 'overview' && (
              <>
                {/* Hyperliquid Summary */}
                <Card className="bg-[#161a1e] border-[#2b3139] overflow-hidden text-white">
                  <div className="bg-[#fcd535] h-1 w-full"></div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#fcd535]/10 rounded-lg">
                          <Icon icon="logos:hyperliquid-icon" width={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">Hyperliquid Trading Account</h3>
                          <p className="text-xs text-slate-400">Isolated margin trading on Hyperliquid L1</p>
                        </div>
                      </div>
                      <Link href="/spot" className="text-sm text-[#fcd535] hover:underline flex items-center gap-1">
                        Go to Trade <Icon icon="ph:arrow-right" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">Account Value</p>
                        <p className="text-xl font-bold text-white">{formatUSD(hlValue)}</p>
                      </div>
                      <div className="p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">Available USDC</p>
                        <p className="text-xl font-bold text-[#0ecb81]">{formatUSD(hlUsdc.available)}</p>
                      </div>
                      <div className="p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                        <p className="text-slate-500 text-xs mb-1 uppercase tracking-wider">In Orders</p>
                        <p className="text-xl font-bold text-[#fcd535]">{formatUSD(hlUsdc.hold)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Main Asset List */}
                <div className="bg-[#161a1e] border border-[#2b3139] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#2b3139] flex justify-between items-center">
                    <h3 className="font-bold text-white">Funding Account (Main Wallet)</h3>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-[#161a1e]">
                        <tr className="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-[#2b3139]">
                          <th className="px-6 py-4 font-medium">Asset</th>
                          <th className="px-6 py-4 font-medium">Chain</th>
                          <th className="px-6 py-4 font-medium">Balance</th>
                          <th className="px-6 py-4 font-medium text-right">Value (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2b3139]">
                        {evmLoading ? (
                          [...Array(3)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td colSpan={4} className="px-6 py-4 bg-[#161a1e]/50 h-16"></td>
                            </tr>
                          ))
                        ) : mainBalances.length > 0 ? (
                          mainBalances.map((asset) => (
                            <tr key={`${asset.chain}-${asset.asset}`} className="hover:bg-[#2b3139]/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#0b0e11] flex items-center justify-center">
                                    <Icon icon={asset.asset === 'ETH' ? 'logos:ethereum' : `cryptocurrency-color:${asset.asset.toLowerCase()}`} />
                                  </div>
                                  <span className="font-medium text-white">{asset.asset}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-400 text-sm capitalize">
                                <div className="flex items-center gap-1.5">
                                  <Icon icon={asset.chain === 'arbitrum' ? 'logos:arbitrum' : 'logos:ethereum'} width={14} />
                                  {asset.chain}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-white">{asset.balance.toFixed(4)}</td>
                              <td className="px-6 py-4 text-right font-medium text-white">{formatUSD(asset.usdValue)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No assets found in main wallet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'wallets' && (
              <div className="space-y-6">
                {/* Main Wallet Card */}
                <Card className="bg-[#161a1e] border-[#2b3139]">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Icon icon="ph:shield-check-bold" className="text-[#0ecb81]" width={20} />
                        <h3 className="font-bold text-white">Main Ethereum Wallet</h3>
                      </div>
                      <span className="px-2 py-0.5 bg-[#0ecb81]/10 text-[#0ecb81] text-[10px] font-bold uppercase rounded">Managed</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                      <code className="text-[#fcd535] font-mono text-sm break-all">{addresses?.ethereum}</code>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(addresses?.ethereum || '')} className="text-white hover:bg-white/10">
                        <Icon icon="ph:copy" />
                      </Button>
                    </div>
                    <p className="mt-4 text-xs text-slate-400">This is your primary custodian wallet for external deposits and withdrawals.</p>
                  </CardContent>
                </Card>

                {/* Trading Wallet Card */}
                <Card className="bg-[#161a1e] border-[#2b3139]">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Icon icon="ph:lightning-bold" className="text-[#fcd535]" width={20} />
                        <h3 className="font-bold text-white">Dedicated Trading Wallet</h3>
                      </div>
                      <span className="px-2 py-0.5 bg-[#fcd535]/10 text-[#fcd535] text-[10px] font-bold uppercase rounded">Isolation Mode</span>
                    </div>
                    {tradingWallet?.address ? (
                      <div className="flex items-center justify-between p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                        <code className="text-[#fcd535] font-mono text-sm break-all">{tradingWallet.address}</code>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tradingWallet.address)} className="text-white hover:bg-white/10">
                          <Icon icon="ph:copy" />
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#1f2329]/50 rounded-xl border border-dashed border-[#2b3139] text-center">
                        <p className="text-slate-400 text-sm mb-3">No trading wallet detected</p>
                        <Button 
                          onClick={handleSetup} 
                          disabled={isSettingUp}
                          className="bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#0b0e11] font-bold"
                        >
                          {isSettingUp ? 'Initializing...' : 'Setup Trading Wallet'}
                        </Button>
                      </div>
                    )}
                    <p className="mt-4 text-xs text-slate-400">Used exclusively for high-speed DEX interactions. Keep funds here to enable zero-gas trading on Hyperliquid.</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'fund' && (
              <Card className="bg-[#161a1e] border-[#2b3139] border-t-4 border-t-[#fcd535]">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-6 text-white">Fund Trading Wallet</h3>
                  
                  <div className="space-y-6">
                    {/* Fixed Source Asset for HL Funding */}
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Deposit Asset</label>
                      <div className="p-4 bg-[#fcd535]/5 border border-[#fcd535] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#161a1e] flex items-center justify-center border border-[#fcd535]/20">
                            <Icon icon="cryptocurrency-color:usdc" width={24} />
                          </div>
                          <div>
                            <p className="font-bold text-white">USDC</p>
                            <p className="text-xs text-slate-400">Arbitrum Mainnet</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#0ecb81]">{arbUsdc.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500">Available</p>
                        </div>
                      </div>
                    </div>

                    {/* From/To visual */}
                    <div className="relative">
                      <div className="space-y-2">
                        <div className="p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                          <p className="text-slate-500 text-xs uppercase mb-2">From</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Main Wallet</span>
                            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                              <Icon icon="logos:arbitrum" width={14} />
                              Arbitrum
                            </div>
                          </div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <div className="bg-[#fcd535] p-2 rounded-full shadow-lg">
                            <Icon icon="ph:arrow-down-bold" className="text-[#0b0e11]" />
                          </div>
                        </div>
                        <div className="p-4 bg-[#0b0e11] rounded-xl border border-[#2b3139]">
                          <p className="text-slate-500 text-xs uppercase mb-2">To</p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Trading Account</span>
                            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                              <Icon icon="logos:arbitrum" width={14} />
                              Arbitrum
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                     {/* Amount Input */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm text-slate-400">Amount (USDC)</label>
                        <span className="text-xs text-slate-500">Available: {arbUsdc.amount.toFixed(2)} USDC</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full bg-[#0b0e11] border border-[#2b3139] rounded-xl px-4 py-4 text-xl font-bold text-white focus:outline-none focus:border-[#fcd535] transition-colors"
                        />
                        <button 
                          onClick={() => setTransferAmount(arbUsdc.amount.toString())}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#fcd535] font-bold text-sm"
                        >
                          MAX
                        </button>
                      </div>

                      </div>
                    {transferStatus?.success && (
                      <Alert className="bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]">
                        <Icon icon="ph:check-circle-fill" className="h-4 w-4 text-[#0ecb81]" />
                        <AlertDescription>Transfer successful! Your trading account will be updated shortly.</AlertDescription>
                      </Alert>
                    )}

                    {transferStatus?.error && (
                      <Alert className="bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]">
                        <Icon icon="ph:warning-circle-fill" className="h-4 w-4 text-[#f6465d]" />
                        <AlertDescription>{transferStatus.error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Submit Button or Setup Button */}
                    {!tradingWallet?.address || (transferStatus?.error && transferStatus.error.includes('initialized')) ? (
                      <Button 
                        onClick={handleSetup}
                        disabled={isSettingUp}
                        className="w-full h-14 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#0b0e11] font-bold text-lg rounded-xl transition-all"
                      >
                        {isSettingUp ? (
                          <>
                            <Icon icon="ph:spinner" className="mr-2 animate-spin" />
                            Initializing Account...
                          </>
                        ) : 'Setup Trading Account'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleInternalTransfer}
                        disabled={isTransferring || !transferAmount || parseFloat(transferAmount) <= 0}
                        className="w-full h-14 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#0b0e11] font-bold text-lg rounded-xl transition-all"
                      >
                        {isTransferring ? (
                          <>
                            <Icon icon="ph:spinner" className="mr-2 animate-spin" />
                            Processing Transaction...
                          </>
                        ) : 'Confirm Transfer'}
                      </Button>
                    )}
                    <p className="text-center text-[10px] text-[#848e9c]">Internal transfers are instant and secured by Privy.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Watchlist & Actions */}
          <div className="lg:col-span-4 space-y-8">
            {/* Action Cards */}
            <div className="grid grid-cols-2 gap-4">
               <button className="p-4 bg-[#161a1e] border border-[#2b3139] rounded-2xl hover:bg-[#2b3139]/50 transition-all flex flex-col items-center gap-2 group">
                  <div className="p-3 bg-[#0ecb81]/10 rounded-full group-hover:scale-110 transition-transform">
                    <Icon icon="ph:plus-bold" className="text-[#0ecb81]" width={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Deposit</span>
               </button>
               <button className="p-4 bg-[#161a1e] border border-[#2b3139] rounded-2xl hover:bg-[#2b3139]/50 transition-all flex flex-col items-center gap-2 group">
                  <div className="p-3 bg-[#848e9c]/10 rounded-full group-hover:scale-110 transition-transform">
                    <Icon icon="ph:minus-bold" className="text-slate-400 group-hover:text-white" width={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Withdraw</span>
               </button>
            </div>

            {/* Watchlist */}
            <Watchlist />
          </div>

        </div>
      </div>
    </div>
  );
}