'use client';

import { useDrift } from '@/app/context/driftContext';
import { useSpotBalances } from '@/hooks/useSpotBalances';

/**
 * Debug component to help troubleshoot spot balance issues
 * 
 * Usage: Add this component to your spot trading page temporarily
 * <BalanceDebugger selectedPair="SOL-USDC" />
 */

interface BalanceDebuggerProps {
  selectedPair: string;
}

export function BalanceDebugger({ selectedPair }: BalanceDebuggerProps) {
  const {
    isClientReady,
    isInitialized,
    spotPositions,
    spotMarkets,
    getSpotMarketIndexBySymbol,
    getSpotMarketName,
    summary
  } = useDrift();

  const [baseAsset, quoteAsset] = selectedPair.split('-');
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

  const {
    baseBalance,
    quoteBalance,
    isBorrowed,
    loading,
    error
  } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md text-xs font-mono z-50 max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2 text-sm">🔍 Balance Debugger</h3>
      
      <div className="space-y-2">
        {/* Pair Info */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400">Pair: {selectedPair}</div>
          <div>Base: {baseAsset} (index: {baseMarketIndex ?? 'undefined'})</div>
          <div>Quote: {quoteAsset} (index: {quoteMarketIndex ?? 'undefined'})</div>
        </div>

        {/* Drift Status */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400">Drift Status:</div>
          <div>Client Ready: {isClientReady ? '✅' : '❌'}</div>
          <div>Account Initialized: {isInitialized ? '✅' : '❌'}</div>
          <div>Total Collateral: {summary?.totalCollateral?.toFixed(2) ?? '0'} USDC</div>
        </div>

        {/* Market Mappings */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400">Market Mappings:</div>
          <div>Spot Markets Loaded: {spotMarkets.size}</div>
          {spotMarkets.size > 0 && (
            <div className="text-gray-400 text-[10px]">
              {Array.from(spotMarkets.entries()).map(([idx, info]) => (
                <div key={idx}>{idx}: {info.symbol}</div>
              ))}
            </div>
          )}
        </div>

        {/* Spot Positions */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400">Spot Positions:</div>
          <div>Count: {spotPositions?.length ?? 0}</div>
          {spotPositions && spotPositions.length > 0 ? (
            <div className="text-gray-400 text-[10px] max-h-32 overflow-y-auto">
              {spotPositions.map((pos, i) => (
                <div key={i} className={pos.amount > 0 ? 'text-green-400' : ''}>
                  {pos.marketIndex}: {pos.marketName} = {pos.amount.toFixed(6)} ({pos.balanceType})
                </div>
              ))}
            </div>
          ) : (
            <div className="text-red-400">No positions found!</div>
          )}
        </div>

        {/* Hook Results */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-yellow-400">Hook Results:</div>
          <div>Loading: {loading ? '⏳' : '✅'}</div>
          <div>Error: {error ? `❌ ${error}` : '✅ None'}</div>
          <div className={baseBalance > 0 ? 'text-green-400' : 'text-gray-400'}>
            Base Balance: {baseBalance.toFixed(6)} {baseAsset}
            {isBorrowed.base && ' (borrowed)'}
          </div>
          <div className={quoteBalance > 0 ? 'text-green-400' : 'text-gray-400'}>
            Quote Balance: {quoteBalance.toFixed(6)} {quoteAsset}
            {isBorrowed.quote && ' (borrowed)'}
          </div>
        </div>

        {/* Diagnostics */}
        <div>
          <div className="text-yellow-400">Diagnostics:</div>
          {!isClientReady && <div className="text-red-400">⚠️ Client not ready</div>}
          {!isInitialized && <div className="text-red-400">⚠️ Account not initialized</div>}
          {baseMarketIndex === undefined && <div className="text-red-400">⚠️ Base market index not found</div>}
          {quoteMarketIndex === undefined && <div className="text-red-400">⚠️ Quote market index not found</div>}
          {spotPositions?.length === 0 && <div className="text-red-400">⚠️ No spot positions loaded</div>}
          {isClientReady && isInitialized && spotPositions && spotPositions.length > 0 && (
            <div className="text-green-400">✅ All systems operational</div>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          console.log('=== BALANCE DEBUG INFO ===');
          console.log('Pair:', selectedPair);
          console.log('Base Market Index:', baseMarketIndex);
          console.log('Quote Market Index:', quoteMarketIndex);
          console.log('Client Ready:', isClientReady);
          console.log('Initialized:', isInitialized);
          console.log('Spot Markets:', spotMarkets);
          console.log('Spot Positions:', spotPositions);
          console.log('Base Balance:', baseBalance);
          console.log('Quote Balance:', quoteBalance);
          console.log('Summary:', summary);
        }}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
      >
        Log Full Debug Info
      </button>
    </div>
  );
}
