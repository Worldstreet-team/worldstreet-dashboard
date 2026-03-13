'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useWallet } from '@/app/context/walletContext';
import { useEvm } from '@/app/context/evmContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ethers } from 'ethers';

const CHAINS = [
  { id: 1, name: 'Ethereum', icon: 'logos:ethereum', color: '#627EEA' },
  { id: 42161, name: 'Arbitrum', icon: 'logos:arbitrum', color: '#28A0F0' },
  { id: 137, name: 'Polygon', icon: 'logos:polygon', color: '#8247E5' },
  { id: 10, name: 'Optimism', icon: 'logos:optimism', color: '#FF0420' },
  { id: 56, name: 'BSC', icon: 'logos:binance', color: '#F3BA2F' },
  { id: 8453, name: 'Base', icon: 'logos:base', color: '#0052FF' },
];

const POPULAR_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, icon: 'logos:ethereum' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, icon: 'cryptocurrency-color:usdc' },
  { symbol: 'USDT', name: 'Tether', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, icon: 'cryptocurrency-color:usdt' },
];

// Token address mapping for common chains
const CHAIN_TOKEN_MAP: Record<number, Record<string, string>> = {
  1: { // Ethereum
    'USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
    'ETH': '0x0000000000000000000000000000000000000000'
  },
  42161: { // Arbitrum
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'USDT': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    'ETH': '0x0000000000000000000000000000000000000000'
  },
  137: { // Polygon
    'USDC': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    'USDT': '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    'ETH': '0x7ceb23fd6bc0ad59e62c25392b3204ee7007f3dd'
  }
};

export default function BridgePage() {
  const { addresses } = useWallet();
  const { balance, tokenBalances, loading: evmLoading, fetchBalance } = useEvm();

  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain, setToChain] = useState(CHAINS[1]);
  const [fromTokenSymbol, setFromTokenSymbol] = useState('ETH');
  const [toTokenSymbol, setToTokenSymbol] = useState('ETH');
  
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'quoting' | 'executing' | 'success' | 'failed'>('idle');

  // Helper to get token object with correct address for current chain
  const getTokenForChain = (symbol: string, chainId: number) => {
    const baseToken = POPULAR_TOKENS.find(t => t.symbol === symbol) || POPULAR_TOKENS[0];
    const mappedAddress = CHAIN_TOKEN_MAP[chainId]?.[symbol] || baseToken.address;
    return { ...baseToken, address: mappedAddress };
  };

  const fromToken = getTokenForChain(fromTokenSymbol, fromChain.id);
  const toToken = getTokenForChain(toTokenSymbol, toChain.id);

  // Fetch quote from Li.Fi
  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !addresses?.ethereum) {
      setQuote(null);
      return;
    }

    setIsLoadingQuote(true);
    setError(null);
    try {
      const fromAmountRaw = ethers.parseUnits(amount, fromToken.decimals).toString();
      
      const params = new URLSearchParams({
        fromChain: fromChain.id.toString(),
        toChain: toChain.id.toString(),
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: fromAmountRaw,
        fromAddress: addresses.ethereum,
        integrator: 'worldstreet',
      });

      const response = await fetch(`https://li.quest/v1/quote?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch quote');
      }

      setQuote(data);
    } catch (err: any) {
      console.error('Bridge Quote Error:', err);
      setError(err.message || 'Failed to get bridge quote');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [amount, fromChain, toChain, fromToken, toToken, addresses]);

  // Debounce quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 1000);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleBridge = async () => {
    if (!quote || !addresses?.ethereum) return;

    setIsExecuting(true);
    setStatus('executing');
    setError(null);

    try {
      // 1. Check if approval is needed (if Li.Fi suggests it)
      // For simplicity, we assume native ETH or pre-approved for now, 
      // but a full implementation should handle ERC20 approvals.
      
      // 2. Execute the bridge transaction
      const txRequest = quote.transactionRequest;
      
      const response = await fetch('/api/privy/wallet/ethereum/execute-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: txRequest.to,
          data: txRequest.data,
          value: txRequest.value,
          chainId: txRequest.chainId,
          gasLimit: txRequest.gasLimit
        })
      });

      const result = await response.json();
      if (result.success) {
        setTxHash(result.transactionHash);
        setStatus('success');
        // Refresh balance after some time
        setTimeout(() => fetchBalance(), 5000);
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } catch (err: any) {
      console.error('Execution Error:', err);
      setError(err.message || 'Bridge execution failed');
      setStatus('failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const swapChains = () => {
    const temp = fromChain;
    setFromChain(toChain);
    setToChain(temp);
  };

  return (
    <div className="min-h-full bg-[#0b0e11] text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-[#fcd535]/10 rounded-2xl">
            <Icon icon="ph:bridge-bold" className="text-[#fcd535]" width={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cross-Chain Bridge</h1>
            <p className="text-slate-400 text-sm">Powered by LI.FI Protocol</p>
          </div>
        </div>

        <Card className="bg-[#161a1e] border-[#2b3139] shadow-2xl overflow-hidden p-0">
          <div className="bg-[#fcd535] h-1 w-full" />
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* FROM SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-400">From</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Balance:</span>
                    <span className="text-white">
                      {fromToken.symbol === 'ETH' ? balance.toFixed(4) : (tokenBalances.find(t => t.symbol === fromToken.symbol)?.amount || 0).toFixed(2)} {fromToken.symbol}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select 
                    onValueChange={(val) => setFromChain(CHAINS.find(c => c.name === val)!)}
                    defaultValue={fromChain.name}
                  >
                    <SelectTrigger className="bg-[#0b0e11] border-[#2b3139] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161a1e] border-[#2b3139] text-white">
                      {CHAINS.map(chain => (
                        <SelectItem key={chain.id} value={chain.name}>
                          <div className="flex items-center gap-2">
                            <Icon icon={chain.icon} />
                            {chain.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    onValueChange={(val) => setFromTokenSymbol(val)}
                    defaultValue={fromTokenSymbol}
                  >
                    <SelectTrigger className="bg-[#0b0e11] border-[#2b3139] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161a1e] border-[#2b3139] text-white">
                      {POPULAR_TOKENS.map(token => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <Icon icon={token.icon} />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-[#0b0e11] border-[#2b3139] h-20 text-3xl font-bold focus:border-[#fcd535] transition-all pr-20"
                  />
                  <button 
                    onClick={() => setAmount(balance.toString())}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#fcd535] font-bold text-sm hover:text-[#fcd535]/80"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* SWAP ICON */}
              <div className="flex justify-center -my-3 relative z-10">
                <button 
                  onClick={swapChains}
                  className="bg-[#2b3139] p-3 rounded-xl hover:bg-[#fcd535] hover:text-[#0b0e11] transition-all shadow-lg group"
                >
                  <Icon icon="ph:arrows-down-up-bold" className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>

              {/* TO SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-400">To</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select 
                    onValueChange={(val) => setToChain(CHAINS.find(c => c.name === val)!)}
                    defaultValue={toChain.name}
                  >
                    <SelectTrigger className="bg-[#0b0e11] border-[#2b3139] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161a1e] border-[#2b3139] text-white">
                      {CHAINS.map(chain => (
                        <SelectItem key={chain.id} value={chain.name}>
                          <div className="flex items-center gap-2">
                            <Icon icon={chain.icon} />
                            {chain.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    onValueChange={(val) => setToTokenSymbol(val)}
                    defaultValue={toTokenSymbol}
                  >
                    <SelectTrigger className="bg-[#0b0e11] border-[#2b3139] h-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161a1e] border-[#2b3139] text-white">
                      {POPULAR_TOKENS.map(token => (
                        <SelectItem key={token.symbol} value={token.symbol}>
                          <div className="flex items-center gap-2">
                            <Icon icon={token.icon} />
                            {token.symbol}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-[#0b0e11] border border-[#2b3139] rounded-xl h-20 px-4 flex items-center justify-between">
                  <span className={`text-3xl font-bold ${isLoadingQuote ? 'animate-pulse text-slate-700' : 'text-white'}`}>
                    {quote ? parseFloat(quote.estimate.toAmount).toFixed(6) : '0.00'}
                  </span>
                  <span className="text-slate-500 font-bold">{toToken.symbol}</span>
                </div>
              </div>

              {/* ESTIMATES & FEES */}
              {quote && (
                <div className="p-4 bg-[#0b0e11]/50 rounded-xl border border-[#2b3139] space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Estimated Arrival</span>
                    <span className="text-slate-300 font-medium">{Math.floor(quote.estimate.executionDuration / 60)} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Bridge Fee</span>
                    <span className="text-slate-300 font-medium">${parseFloat(quote.estimate.feeCosts?.[0]?.amountUSD || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gas Cost</span>
                    <span className="text-slate-300 font-medium">${parseFloat(quote.estimate.gasCosts?.[0]?.amountUSD || '0').toFixed(2)}</span>
                  </div>
                </div>
              )}

              {error && (
                <Alert className="bg-[#f6465d]/10 border-[#f6465d]/20 text-[#f6465d]">
                  <Icon icon="ph:warning-circle-fill" className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {status === 'success' && txHash && (
                <Alert className="bg-[#0ecb81]/10 border-[#0ecb81]/20 text-[#0ecb81]">
                  <Icon icon="ph:check-circle-fill" className="h-4 w-4" />
                  <AlertDescription>
                    Bridge transaction initiated! 
                    <a 
                      href={`${fromChain.id === 1 ? 'https://etherscan.io' : 'https://arbiscan.io'}/tx/${txHash}`} 
                      target="_blank" 
                      className="ml-2 underline font-bold"
                    >
                      View Receipt
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleBridge}
                disabled={!quote || isLoadingQuote || isExecuting || status === 'success'}
                className={`w-full h-16 rounded-2xl font-bold text-lg transition-all shadow-xl ${
                  status === 'success' ? 'bg-[#0ecb81] hover:bg-[#0ecb81]' : 'bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#0b0e11]'
                }`}
              >
                {isLoadingQuote ? (
                  <Icon icon="ph:spinner" className="animate-spin mr-2" />
                ) : isExecuting ? (
                  <Icon icon="ph:spinner" className="animate-spin mr-2" />
                ) : null}
                {status === 'success' ? 'Transaction Initiated' : isExecuting ? 'Confirming...' : 'Bridge Assets'}
              </Button>
              
              <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Secured by Privy Custody & Li.Fi Engine
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
