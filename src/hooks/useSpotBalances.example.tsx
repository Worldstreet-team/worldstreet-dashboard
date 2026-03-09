/**
 * Example: Using useSpotBalances Hook
 * 
 * This example shows how to properly fetch and display spot trading pair balances
 * using the Drift Protocol SDK.
 */

import { useSpotBalances } from '@/hooks/useSpotBalances';
import { useDrift } from '@/app/context/driftContext';

export function SpotTradingExample() {
  const { getSpotMarketIndexBySymbol } = useDrift();

  // Example 1: SOL/USDC Pair
  const selectedPair = 'SOL-USDC';
  const [baseAsset, quoteAsset] = selectedPair.split('-');

  // Get market indices
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);   // SOL = 1
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset); // USDC = 0

  // Fetch balances
  const {
    baseBalance,      // SOL balance (e.g., 10.5)
    quoteBalance,     // USDC balance (e.g., 1000.0)
    isBorrowed,       // { base: false, quote: false }
    loading,
    error,
    refetch
  } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  // Display logic for BUY form
  const buyFormBalance = quoteBalance; // Show USDC balance
  const buyFormToken = quoteAsset;     // "USDC"

  // Display logic for SELL form
  const sellFormBalance = baseBalance; // Show SOL balance
  const sellFormToken = baseAsset;     // "SOL"

  return (
    <div>
      <h2>SOL/USDC Trading</h2>

      {/* BUY Form */}
      <div>
        <h3>Buy SOL</h3>
        <p>
          Available: {buyFormBalance.toFixed(6)} {buyFormToken}
          {isBorrowed.quote && <span> (Borrowed)</span>}
        </p>
        <button onClick={() => {/* Buy logic */}}>
          Buy SOL
        </button>
      </div>

      {/* SELL Form */}
      <div>
        <h3>Sell SOL</h3>
        <p>
          Available: {sellFormBalance.toFixed(6)} {sellFormToken}
          {isBorrowed.base && <span> (Borrowed)</span>}
        </p>
        <button onClick={() => {/* Sell logic */}}>
          Sell SOL
        </button>
      </div>

      {/* Refresh button */}
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh Balances'}
      </button>

      {/* Error display */}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

// Example 2: Dynamic pair selection
export function DynamicPairExample({ selectedPair }: { selectedPair: string }) {
  const { getSpotMarketIndexBySymbol } = useDrift();

  const [baseAsset, quoteAsset] = selectedPair.split('-');
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

  const { baseBalance, quoteBalance, loading } = useSpotBalances(
    baseMarketIndex,
    quoteMarketIndex
  );

  if (loading) return <div>Loading balances...</div>;

  return (
    <div>
      <p>{baseAsset} Balance: {baseBalance.toFixed(6)}</p>
      <p>{quoteAsset} Balance: {quoteBalance.toFixed(6)}</p>
    </div>
  );
}

// Example 3: Max sell button
export function MaxSellButton({ selectedPair }: { selectedPair: string }) {
  const { getSpotMarketIndexBySymbol } = useDrift();

  const [baseAsset, quoteAsset] = selectedPair.split('-');
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

  const { baseBalance } = useSpotBalances(baseMarketIndex, quoteMarketIndex);

  const handleMaxSell = () => {
    // Set sell amount to max available
    console.log(`Max sell: ${baseBalance} ${baseAsset}`);
  };

  return (
    <button onClick={handleMaxSell}>
      MAX ({baseBalance.toFixed(4)} {baseAsset})
    </button>
  );
}

// Example 4: Handling borrowed balances
export function BorrowedBalanceDisplay({ selectedPair }: { selectedPair: string }) {
  const { getSpotMarketIndexBySymbol } = useDrift();

  const [baseAsset, quoteAsset] = selectedPair.split('-');
  const baseMarketIndex = getSpotMarketIndexBySymbol(baseAsset);
  const quoteMarketIndex = getSpotMarketIndexBySymbol(quoteAsset);

  const { baseBalance, quoteBalance, isBorrowed } = useSpotBalances(
    baseMarketIndex,
    quoteMarketIndex
  );

  return (
    <div>
      <div className={isBorrowed.base ? 'text-red-500' : 'text-white'}>
        {baseAsset}: {baseBalance.toFixed(6)}
        {isBorrowed.base && ' (Borrowed)'}
      </div>
      <div className={isBorrowed.quote ? 'text-red-500' : 'text-white'}>
        {quoteAsset}: {quoteBalance.toFixed(6)}
        {isBorrowed.quote && ' (Borrowed)'}
      </div>
    </div>
  );
}

// Example 5: Common market indices
export function MarketIndicesReference() {
  return (
    <table>
      <thead>
        <tr>
          <th>Token</th>
          <th>Market Index</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>USDC</td><td>0</td></tr>
        <tr><td>SOL</td><td>1</td></tr>
        <tr><td>BTC</td><td>2</td></tr>
        <tr><td>ETH</td><td>3</td></tr>
        <tr><td>USDT</td><td>4</td></tr>
        <tr><td>JitoSOL</td><td>5</td></tr>
      </tbody>
    </table>
  );
}
