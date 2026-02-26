# Drift Context - Real-World Usage Examples

## Example 1: Order Panel with Account Checks

```typescript
// src/components/futures/OrderPanel.tsx
import { useDrift } from '@/app/context/driftContext';

export const OrderPanel = () => {
  const { 
    isInitialized, 
    canTrade, 
    summary, 
    needsInitialization 
  } = useDrift();

  const [orderSize, setOrderSize] = useState(0);

  const maxOrderSize = summary?.freeCollateral 
    ? summary.freeCollateral / (summary.leverage || 1) 
    : 0;

  const handlePlaceOrder = async () => {
    if (!canTrade) {
      alert('Cannot trade - insufficient margin');
      return;
    }

    if (orderSize > maxOrderSize) {
      alert(`Max order size: $${maxOrderSize.toFixed(2)}`);
      return;
    }

    // Place order...
  };

  if (needsInitialization) {
    return (
      <div className="p-4 bg-warning/10 rounded-lg">
        <p>Initialize your Drift account to start trading</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3>Place Order</h3>
      
      <div className="mb-4">
        <label>Order Size</label>
        <input
          type="number"
          value={orderSize}
          onChange={(e) => setOrderSize(Number(e.target.value))}
          max={maxOrderSize}
        />
        <p className="text-xs text-muted">
          Max: ${maxOrderSize.toFixed(2)}
        </p>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={!canTrade || orderSize <= 0}
      >
        Place Order
      </button>

      {!canTrade && (
        <p className="text-xs text-error mt-2">
          Trading disabled - add collateral
        </p>
      )}
    </div>
  );
};
```

---

## Example 2: Position Panel with Auto-Refresh

```typescript
// src/components/futures/PositionPanel.tsx
import { useDrift } from '@/app/context/driftContext';
import { useEffect } from 'react';

export const PositionPanel = () => {
  const { 
    summary, 
    refreshSummary, 
    startAutoRefresh, 
    stopAutoRefresh 
  } = useDrift();

  // Auto-refresh positions every 10 seconds
  useEffect(() => {
    startAutoRefresh(10000);
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  const handleClosePosition = async (positionId: string) => {
    // Close position via API
    await fetch(`/api/drift/position/close`, {
      method: 'POST',
      body: JSON.stringify({ positionId })
    });

    // Refresh account data
    await refreshSummary();
  };

  return (
    <div>
      <h3>Open Positions ({summary?.openPositions || 0})</h3>
      
      <div className="space-y-2">
        {/* Position list */}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm">
          Total PnL: 
          <span className={summary?.unrealizedPnl >= 0 ? 'text-success' : 'text-error'}>
            ${summary?.unrealizedPnl.toFixed(2)}
          </span>
        </p>
      </div>
    </div>
  );
};
```

---

## Example 3: Risk Warning Component

```typescript
// src/components/futures/RiskWarning.tsx
import { useDrift } from '@/app/context/driftContext';

export const RiskWarning = () => {
  const { summary } = useDrift();

  if (!summary) return null;

  const marginRatio = summary.marginRatio;
  const leverage = summary.leverage;

  // Show warning if margin ratio is low or leverage is high
  if (marginRatio > 0.3 && leverage < 10) {
    return null; // All good
  }

  const severity = marginRatio < 0.15 ? 'critical' 
    : marginRatio < 0.25 ? 'high' 
    : 'medium';

  return (
    <div className={`p-4 rounded-lg border-2 ${
      severity === 'critical' ? 'bg-error/10 border-error' :
      severity === 'high' ? 'bg-warning/10 border-warning' :
      'bg-info/10 border-info'
    }`}>
      <h4 className="font-semibold mb-2">
        {severity === 'critical' ? '⚠️ Critical Risk' :
         severity === 'high' ? '⚠️ High Risk' :
         'ℹ️ Risk Notice'}
      </h4>
      
      <div className="text-sm space-y-1">
        <p>Margin Ratio: {(marginRatio * 100).toFixed(1)}%</p>
        <p>Current Leverage: {leverage.toFixed(2)}x</p>
        
        {marginRatio < 0.15 && (
          <p className="text-error font-medium mt-2">
            Your account is at risk of liquidation. 
            Please add collateral or close positions immediately.
          </p>
        )}
        
        {leverage > 15 && (
          <p className="text-warning mt-2">
            High leverage increases liquidation risk.
          </p>
        )}
      </div>
    </div>
  );
};
```

---

## Example 4: Collateral Deposit with Refresh

```typescript
// src/components/futures/CollateralDeposit.tsx
import { useDrift } from '@/app/context/driftContext';
import { useState } from 'react';

export const CollateralDeposit = () => {
  const { summary, refreshSummary } = useDrift();
  const [amount, setAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  const handleDeposit = async () => {
    setDepositing(true);
    
    try {
      const response = await fetch('/api/drift/collateral/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) })
      });

      if (response.ok) {
        // Refresh account data to show new balance
        await refreshSummary();
        setAmount('');
        alert('Deposit successful!');
      } else {
        alert('Deposit failed');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-4">Deposit Collateral</h3>
      
      <div className="mb-4">
        <p className="text-sm text-muted mb-2">
          Current Balance: ${summary?.totalCollateral.toFixed(2) || '0.00'}
        </p>
        
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USDC)"
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handleDeposit}
        disabled={!amount || depositing}
        className="w-full py-2 bg-primary text-white rounded disabled:opacity-50"
      >
        {depositing ? 'Depositing...' : 'Deposit'}
      </button>
    </div>
  );
};
```

---

## Example 5: Account Health Dashboard

```typescript
// src/components/futures/AccountHealthDashboard.tsx
import { useDrift } from '@/app/context/driftContext';

export const AccountHealthDashboard = () => {
  const { summary, isInitialized, canTrade } = useDrift();

  if (!isInitialized) {
    return <div>Account not initialized</div>;
  }

  const healthScore = summary?.marginRatio || 0;
  const healthColor = healthScore > 0.5 ? 'text-success' 
    : healthScore > 0.2 ? 'text-warning' 
    : 'text-error';

  const healthLabel = healthScore > 0.5 ? 'Healthy' 
    : healthScore > 0.2 ? 'At Risk' 
    : 'Critical';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Health Score */}
      <div className="p-4 bg-white rounded-lg">
        <p className="text-sm text-muted mb-1">Account Health</p>
        <p className={`text-2xl font-bold ${healthColor}`}>
          {healthLabel}
        </p>
        <p className="text-xs text-muted mt-1">
          {(healthScore * 100).toFixed(1)}% margin ratio
        </p>
      </div>

      {/* Collateral */}
      <div className="p-4 bg-white rounded-lg">
        <p className="text-sm text-muted mb-1">Available Collateral</p>
        <p className="text-2xl font-bold">
          ${summary?.freeCollateral.toFixed(2)}
        </p>
        <p className="text-xs text-muted mt-1">
          of ${summary?.totalCollateral.toFixed(2)} total
        </p>
      </div>

      {/* Trading Status */}
      <div className="p-4 bg-white rounded-lg">
        <p className="text-sm text-muted mb-1">Trading Status</p>
        <p className={`text-2xl font-bold ${canTrade ? 'text-success' : 'text-error'}`}>
          {canTrade ? 'Active' : 'Disabled'}
        </p>
        <p className="text-xs text-muted mt-1">
          {summary?.openPositions} open positions
        </p>
      </div>
    </div>
  );
};
```

---

## Example 6: Initialization Flow

```typescript
// src/components/futures/InitializationFlow.tsx
import { useDrift } from '@/app/context/driftContext';
import { useState } from 'react';

export const InitializationFlow = () => {
  const { 
    needsInitialization, 
    status, 
    initializeAccount 
  } = useDrift();
  
  const [step, setStep] = useState<'info' | 'confirm' | 'processing' | 'success'>('info');

  if (!needsInitialization) {
    return null;
  }

  const handleInitialize = async () => {
    setStep('processing');
    
    const result = await initializeAccount();
    
    if (result.success) {
      setStep('success');
      setTimeout(() => {
        // Close modal or redirect
      }, 2000);
    } else {
      alert(`Initialization failed: ${result.error}`);
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        {step === 'info' && (
          <>
            <h2 className="text-xl font-bold mb-4">Initialize Drift Account</h2>
            <p className="text-sm text-muted mb-4">
              To start trading futures, you need to initialize your Drift subaccount. 
              This is a one-time setup.
            </p>
            <div className="bg-gray-50 p-4 rounded mb-4">
              <p className="text-sm font-medium">Cost Breakdown:</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Rent Deposit:</span>
                  <span>{status?.initializationCost.sol} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>USD Value:</span>
                  <span>~${status?.initializationCost.usd}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep('confirm')}
              className="w-full py-2 bg-primary text-white rounded"
            >
              Continue
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h2 className="text-xl font-bold mb-4">Confirm Initialization</h2>
            <p className="text-sm text-muted mb-4">
              This will deduct {status?.initializationCost.sol} SOL from your futures wallet.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('info')}
                className="flex-1 py-2 border rounded"
              >
                Back
              </button>
              <button
                onClick={handleInitialize}
                className="flex-1 py-2 bg-primary text-white rounded"
              >
                Initialize
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <p className="text-sm text-muted">Initializing your account...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="text-success text-5xl mb-4">✓</div>
            <h3 className="text-lg font-bold mb-2">Success!</h3>
            <p className="text-sm text-muted">Your Drift account is ready to trade</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Example 7: Trading Button with Context

```typescript
// src/components/futures/TradingButton.tsx
import { useDrift } from '@/app/context/driftContext';

interface TradingButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export const TradingButton: React.FC<TradingButtonProps> = ({ 
  onClick, 
  children 
}) => {
  const { canTrade, summary, needsInitialization } = useDrift();

  const getDisabledReason = () => {
    if (needsInitialization) return 'Initialize account first';
    if (!summary?.initialized) return 'Account not ready';
    if (summary.freeCollateral <= 0) return 'Insufficient collateral';
    if (summary.marginRatio < 0.1) return 'Margin too low';
    return null;
  };

  const disabledReason = getDisabledReason();

  return (
    <button
      onClick={onClick}
      disabled={!canTrade}
      title={disabledReason || undefined}
      className={`px-4 py-2 rounded font-medium transition-colors ${
        canTrade 
          ? 'bg-primary text-white hover:bg-primary/90' 
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {children}
      {disabledReason && (
        <span className="block text-xs mt-1">{disabledReason}</span>
      )}
    </button>
  );
};
```

---

## Example 8: Multiple Components Using Context

```typescript
// src/app/(DashboardLayout)/futures/page.tsx
import { useDrift } from '@/app/context/driftContext';
import { useEffect } from 'react';

export default function FuturesPage() {
  const { 
    isInitialized, 
    startAutoRefresh, 
    stopAutoRefresh 
  } = useDrift();

  // Start auto-refresh when initialized
  useEffect(() => {
    if (isInitialized) {
      startAutoRefresh(30000); // 30 seconds
      return () => stopAutoRefresh();
    }
  }, [isInitialized, startAutoRefresh, stopAutoRefresh]);

  return (
    <div className="space-y-4">
      <DriftAccountStatus />
      <AccountHealthDashboard />
      <RiskWarning />
      
      <div className="grid grid-cols-2 gap-4">
        <OrderPanel />
        <PositionPanel />
      </div>
      
      <CollateralDeposit />
      <InitializationFlow />
    </div>
  );
}
```

---

## Key Takeaways

1. **Always check `isInitialized`** before showing trading features
2. **Use `canTrade`** to enable/disable order buttons
3. **Call `refreshSummary()`** after deposits, withdrawals, or trades
4. **Use `startAutoRefresh()`** for real-time updates
5. **Show `needsInitialization`** prompt when account not set up
6. **Display `summary` data** for account stats
7. **Handle `error` state** gracefully
8. **Check `isLoading`** for loading indicators

The context makes it easy to build a consistent, reliable trading interface!
