# USDT Balance Display - UI Examples

## Desktop Trading Interface

### BTC-USDT Pair
```
┌─────────────────────────────────────────────────────────┐
│ Order Form                                              │
├─────────────────────────────────────────────────────────┤
│ [Buy] [Sell]                                            │
├─────────────────────────────────────────────────────────┤
│ Market | Limit | Stop-Limit                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Avbl                          1,234.567890 USDT ← EVM   │
│                                                         │
│ Amount                                                  │
│ ┌─────────────────────────────────────────┐            │
│ │ 0.00                                BTC │            │
│ └─────────────────────────────────────────┘            │
│                                                         │
│ [25%] [50%] [75%] [100%]                               │
│                                                         │
│ ┌─────────────────────────────────────────┐            │
│ │          Buy BTC                        │            │
│ └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### SOL-USDT Pair
```
┌─────────────────────────────────────────────────────────┐
│ Order Form                                              │
├─────────────────────────────────────────────────────────┤
│ [Buy] [Sell]                                            │
├─────────────────────────────────────────────────────────┤
│ Market | Limit | Stop-Limit                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Avbl                            567.890123 USDT ← SOL   │
│                                                         │
│ Amount                                                  │
│ ┌─────────────────────────────────────────┐            │
│ │ 0.00                                SOL │            │
│ └─────────────────────────────────────────┘            │
│                                                         │
│ [25%] [50%] [75%] [100%]                               │
│                                                         │
│ ┌─────────────────────────────────────────┐            │
│ │          Buy SOL                        │            │
│ └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Mobile Trading Interface

### Buy Modal - BTC-USDT
```
┌─────────────────────────────────────┐
│  Buy BTC                        [X] │
├─────────────────────────────────────┤
│                                     │
│  [Market] [Limit]                   │
│                                     │
│  Available    1,234.567890 USDT ←EVM│
│                                     │
│  Price                              │
│  ┌───────────────────────────────┐  │
│  │ 0.00                     USDT │  │
│  └───────────────────────────────┘  │
│                                     │
│  Amount                             │
│  ┌───────────────────────────────┐  │
│  │ 0.00                      BTC │  │
│  └───────────────────────────────┘  │
│                                     │
│  [25%] [50%] [75%] [100%]          │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │         Buy BTC               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Sell Modal - SOL-USDT
```
┌─────────────────────────────────────┐
│  Sell SOL                       [X] │
├─────────────────────────────────────┤
│                                     │
│  [Market] [Limit]                   │
│                                     │
│  Available        45.123456 SOL     │
│                                     │
│  Price                              │
│  ┌───────────────────────────────┐  │
│  │ 0.00                     USDT │  │
│  └───────────────────────────────┘  │
│                                     │
│  Amount                             │
│  ┌───────────────────────────────┐  │
│  │ 0.00                      SOL │  │
│  └───────────────────────────────┘  │
│                                     │
│  [25%] [50%] [75%] [100%]          │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │         Sell SOL              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Balance Display States

### Loading State
```
Avbl                          Loading...
```

### Error State
```
Avbl                          Error loading balance
```

### Success State (with chain indicator in logs)
```
Avbl                          1,234.567890 USDT
```
Console: `[usePairBalances] Using USDT from evm chain: 1234.56789`

### Fallback State (Tron used as backup)
```
Avbl                          750.000000 USDT
```
Console: `[usePairBalances] Using USDT from Tron wallet (fallback): 750.00`

### Zero Balance
```
Avbl                          0.000000 USDT
```

## Balance Precision

The system displays balances with 6 decimal places for accuracy:
- `1234.567890 USDT` - Full precision
- `0.000001 USDT` - Minimum displayable amount
- `0.000000 USDT` - Zero balance

## Color Coding (in actual UI)

- **White text**: Normal balance display
- **Gray text**: "Avbl" label and loading state
- **Red text**: Error state
- **Green text**: Success messages after trade

## Responsive Behavior

### Desktop (>768px)
- Balance shown in compact form in order form sidebar
- Full precision (6 decimals) always visible
- Inline with "Avbl" label

### Mobile (<768px)
- Balance shown in modal header
- Full precision maintained
- Larger touch targets for percentage buttons

## User Experience Flow

1. **User selects pair** → System determines chain automatically
2. **Balance loads** → Shows "Loading..." briefly
3. **Balance displays** → Shows actual USDT from correct chain
4. **User adjusts amount** → Percentage buttons use correct balance
5. **User submits trade** → Balance refreshes after execution

## Edge Cases Handled

### Multiple USDT Sources
If user has USDT on multiple chains:
- System uses the most relevant chain for the pair
- Falls back to Tron if preferred chain has 0 balance
- Logs show which chain was used

### No USDT Available
```
Avbl                          0.000000 USDT
```
User can still view the interface but cannot execute buy orders.

### Network Error
```
Avbl                          Error loading balance
```
Red error message appears, user can retry by refreshing.

## Developer Notes

### Adding Chain Indicator to UI (Future Enhancement)
Could add a small badge showing which chain:
```
Avbl                    1,234.567890 USDT [ETH]
```

### Multi-Currency Support (Future Enhancement)
Could support other stablecoins:
```
Avbl                    1,234.567890 USDT
                          500.000000 USDC
```

### Balance Refresh Button (Future Enhancement)
Add manual refresh option:
```
Avbl                    1,234.567890 USDT [↻]
```
