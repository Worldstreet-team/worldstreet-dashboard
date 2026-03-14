"use client";

import { useHyperliquid } from '@/app/context/hyperliquidContext';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { useUser } from '@clerk/nextjs';

interface BalanceDebuggerProps {
  selectedPair: string;
}

export function BalanceDebugger({ selectedPair }: BalanceDebuggerProps) {
  const { user } = useUser();
  const { summary, isInitialized, isLoading } = useHyperliquid();
  const { balances, accountValue, loading: balanceLoading } = useHyperliquidBalance(user?.id, !!user?.id);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md text-xs font-mono z-50 overflow-y-auto max-h-[400px]">
      <h3 className="font-bold mb-2 text-sm text-[#fcd535]">🔍 Trading Session Balance Debugger</h3>

      <div className="space-y-3">
        <div className="border-b border-gray-700 pb-2">
          <div className="text-[#fcd535]">Account Status:</div>
          <div>Initialized: {isInitialized ? '✅' : '❌'}</div>
          <div>Loading: {isLoading ? '⏳' : '✅'}</div>
          <div>Account Value: ${summary?.totalCollateral.toFixed(2) ?? '0.00'}</div>
          <div>Withdrawable: ${summary?.withdrawable.toFixed(2) ?? '0.00'}</div>
        </div>

        <div className="border-b border-gray-700 pb-2">
          <div className="text-[#fcd535]">Token Balances:</div>
          {balanceLoading ? (
            <div>Loading balances...</div>
          ) : balances.length > 0 ? (
            <div className="space-y-1 mt-1">
              {balances.map((b, i) => (
                <div key={i} className="flex justify-between">
                  <span>{b.coin}:</span>
                  <span className="text-green-400">{parseFloat(b.total).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-400">No balances found</div>
          )}
        </div>

        <div className="pt-1">
          <div className="text-[#fcd535]">Diagnostics:</div>
          {!user && <div className="text-red-400">⚠️ No user authenticated</div>}
          {!isInitialized && <div className="text-red-400">⚠️ Account needs initialization</div>}
          {balances.length === 0 && !balanceLoading && <div className="text-red-400">⚠️ No token holdings</div>}
          {isInitialized && balances.length > 0 && <div className="text-green-400">✅ Systems active</div>}
        </div>
      </div>
    </div>
  );
}
