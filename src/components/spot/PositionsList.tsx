"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useUser } from '@clerk/nextjs';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';

export default function PositionsList() {
  const { user, isLoaded } = useUser();
  const { balances, loading, error, refetch } = useHyperliquidBalance(user?.id, !!user?.id);
  const [sellingCoin, setSellingCoin] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);

  const handleSell = async (coin: string, amount: number) => {
    if (sellingCoin) return;
    setSellingCoin(coin);
    setSellError(null);
    setSellSuccess(null);

    try {
      const res = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: coin,
          side: 'sell',
          amount,
          orderType: 'market',
          isSpot: true,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setSellError(data.error || 'Sell failed');
      } else {
        // Check if filled
        const status = data.response?.data?.statuses?.[0];
        if (status?.filled) {
          setSellSuccess(`Sold ${status.filled.totalSz} ${coin} @ $${Number(status.filled.avgPx).toFixed(4)}`);
        } else {
          setSellSuccess(`Sell order placed for ${coin}`);
        }
        setTimeout(() => refetch(), 1500);
      }
    } catch (err: any) {
      setSellError(err.message || 'Sell failed');
    } finally {
      setSellingCoin(null);
    }
  };

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:wallet" className="mx-auto mb-2 text-[#848e9c]" width={32} />
          <p className="text-sm text-[#848e9c]">Wallet not connected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon icon="ph:spinner" className="animate-spin text-[#848e9c]" width={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:warning-circle" className="mx-auto mb-2 text-[#f6465d]" width={32} />
          <p className="text-sm text-[#f6465d]">{error}</p>
          <button onClick={() => refetch()} className="text-xs text-[#848e9c] underline mt-2 hover:text-white">Retry</button>
        </div>
      </div>
    );
  }

  // Non-USDC tokens with meaningful balances
  const tokenHoldings = balances.filter(b => b.coin !== 'USDC' && b.total > 0.0001);

  if (tokenHoldings.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Icon icon="ph:coins" className="mx-auto mb-2 text-[#848e9c]" width={32} />
          <p className="text-sm text-[#848e9c]">No open positions</p>
          <p className="text-[10px] text-[#848e9c]/60 mt-1">Buy a token to open a position</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e11] text-white">
      {/* Feedback messages */}
      {sellSuccess && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded bg-[#0ecb81]/10 text-[#0ecb81] text-xs">
          {sellSuccess}
        </div>
      )}
      {sellError && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded bg-[#f6465d]/10 text-[#f6465d] text-xs">
          {sellError}
        </div>
      )}

      {/* Table header */}
      <div className="px-4 py-2 bg-[#161a1e] border-b border-[#1e2329] grid grid-cols-6 text-[10px] text-[#848e9c] font-medium uppercase tracking-wider">
        <span>Asset</span>
        <span className="text-right">Size</span>
        <span className="text-right">Entry Price</span>
        <span className="text-right">Mark Price</span>
        <span className="text-right">PnL</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-[#1e2329]">
        {tokenHoldings.map((pos) => {
          const pnlPositive = pos.unrealizedPnl >= 0;
          return (
            <div
              key={pos.coin}
              className="px-4 py-3 grid grid-cols-6 items-center hover:bg-[#1e2329] transition-colors"
            >
              {/* Asset */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2b3139] flex items-center justify-center text-[10px] font-bold text-white">
                  {pos.coin.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#eaecef]">{pos.coin}</span>
                  <span className="text-[10px] text-[#848e9c] ml-1">/USDC</span>
                </div>
              </div>

              {/* Size */}
              <div className="text-right">
                <span className="text-sm font-mono text-white">
                  {pos.total.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </span>
                {pos.hold > 0 && (
                  <div className="text-[9px] text-[#848e9c]">{pos.hold.toFixed(4)} in orders</div>
                )}
              </div>

              {/* Entry Price */}
              <div className="text-right">
                <span className="text-sm font-mono text-[#eaecef]">
                  {pos.entryPrice > 0 ? `$${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
                </span>
              </div>

              {/* Mark (Current) Price */}
              <div className="text-right">
                <span className="text-sm font-mono text-[#eaecef]">
                  {pos.currentPrice > 0 ? `$${pos.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
                </span>
              </div>

              {/* PnL */}
              <div className="text-right">
                <span className={`text-sm font-mono font-semibold ${pnlPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {pnlPositive ? '+' : ''}{pos.unrealizedPnl.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <div className={`text-[10px] ${pnlPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {pnlPositive ? '+' : ''}{pos.unrealizedPnlPercent.toFixed(2)}%
                </div>
              </div>

              {/* Sell Button */}
              <div className="text-right">
                <button
                  onClick={() => handleSell(pos.coin, pos.total)}
                  disabled={!!sellingCoin}
                  className="px-3 py-1 text-xs font-semibold rounded bg-[#f6465d] hover:bg-[#ff5c6e] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {sellingCoin === pos.coin ? (
                    <Icon icon="ph:spinner" className="animate-spin inline" width={14} />
                  ) : (
                    'Close'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}