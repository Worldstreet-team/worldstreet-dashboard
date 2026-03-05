# Trading UI Guide - Buy/Sell Flow

## Buy Flow (Spend USDT, Get Token)

### Desktop - Buy Tab
```
┌─────────────────────────────────────────┐
│ [Buy] Sell                              │
├─────────────────────────────────────────┤
│ Market | Limit | Stop-Limit             │
├─────────────────────────────────────────┤
│                                         │
│ Avbl              1.20638 USDT ← SOL    │
│                                         │
│ Amount (USDT)                           │
│ ┌─────────────────────────────────┐    │
│ │ 5.00                       USDT │    │
│ └─────────────────────────────────┘    │
│ ≈ 0.033333 SOL                         │
│                                         │
│ [25%] [50%] [75%] [100%]               │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │          Buy SOL                │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Mobile - Buy Modal
```
┌─────────────────────────────────────┐
│  Buy SOL                        [X] │
├─────────────────────────────────────┤
│                                     │
│  [Market] [Limit]                   │
│                                     │
│  Available        1.20638 USDT      │
│                                     │
│  Amount (USDT)                      │
│  ┌───────────────────────────────┐  │
│  │ 5.00                     USDT │  │
│  └───────────────────────────────┘  │
│  ≈ 0.033333 SOL                    │
│                                     │
│  [25%] [50%] [75%] [100%]          │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │         Buy SOL               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Sell Flow (Spend Token, Get USDT)

### Desktop - Sell Tab
```
┌─────────────────────────────────────────┐
│ Buy [Sell]                              │
├─────────────────────────────────────────┤
│ Market | Limit | Stop-Limit             │
├─────────────────────────────────────────┤
│                                         │
│ Avbl              0.001402508 SOL       │
│                                         │
│ Amount (SOL)                            │
│ ┌─────────────────────────────────┐    │
│ │ 0.01                        SOL │    │
│ └─────────────────────────────────┘    │
│ ≈ 1.50 USDT                            │
│                                         │
│ [25%] [50%] [75%] [100%]               │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │          Sell SOL               │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Mobile - Sell Modal
```
┌─────────────────────────────────────┐
│  Sell SOL                       [X] │
├─────────────────────────────────────┤
│                                     │
│  [Market] [Limit]                   │
│                                     │
│  Available        0.001402508 SOL   │
│                                     │
│  Amount (SOL)                       │
│  ┌───────────────────────────────┐  │
│  │ 0.01                      SOL │  │
│  └───────────────────────────────┘  │
│  ≈ 1.50 USDT                       │
│                                     │
│  [25%] [50%] [75%] [100%]          │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │         Sell SOL              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Balance Display Logic

### Buy Tab
```
Available Balance: USDT (quote asset)
Amount Input: USDT
Equivalent: Token (base asset)
Percentage Buttons: Use USDT balance

Example (SOL-USDT):
- Available: 1.20638 USDT
- Input: 5.00 USDT
- Get: ≈ 0.033333 SOL
- 100% button: Sets amount to 1.20638 USDT
```

### Sell Tab
```
Available Balance: Token (base asset)
Amount Input: Token
Equivalent: USDT (quote asset)
Percentage Buttons: Use token balance

Example (SOL-USDT):
- Available: 0.001402508 SOL
- Input: 0.01 SOL
- Get: ≈ 1.50 USDT
- 100% button: Sets amount to 0.001402508 SOL
```

## Calculation Examples

### Market Order - Buy
```
Market Price: $150.00 per SOL
User Input: 5 USDT

Calculation:
Token Amount = USDT Amount / Market Price
             = 5 / 150
             = 0.033333 SOL

Display: "≈ 0.033333 SOL"
```

### Market Order - Sell
```
Market Price: $150.00 per SOL
User Input: 0.01 SOL

Calculation:
USDT Amount = Token Amount × Market Price
            = 0.01 × 150
            = 1.50 USDT

Display: "≈ 1.50 USDT"
```

### Limit Order - Buy
```
Limit Price: $145.00 per SOL
User Input: 5 USDT

Calculation:
Token Amount = USDT Amount / Limit Price
             = 5 / 145
             = 0.034483 SOL

Display: "≈ 0.034483 SOL"
```

### Limit Order - Sell
```
Limit Price: $155.00 per SOL
User Input: 0.01 SOL

Calculation:
USDT Amount = Token Amount × Limit Price
            = 0.01 × 155
            = 1.55 USDT

Display: "≈ 1.55 USDT"
```

## Percentage Button Behavior

### Buy Tab (25% button clicked)
```
Available: 1.20638 USDT
Calculation: 1.20638 × 0.25 = 0.301595 USDT
Amount Input: 0.301595 USDT
Equivalent: ≈ 0.002011 SOL (at $150/SOL)
```

### Sell Tab (50% button clicked)
```
Available: 0.001402508 SOL
Calculation: 0.001402508 × 0.50 = 0.000701254 SOL
Amount Input: 0.000701254 SOL
Equivalent: ≈ 0.105188 USDT (at $150/SOL)
```

## Chain-Specific USDT Display

### BTC-USDT (EVM Chain)
```
Buy Tab:
  Avbl: 0.0 USDT (EVM) ← Ethereum USDT
  
Sell Tab:
  Avbl: 0.0 BTC
```

### ETH-USDT (EVM Chain)
```
Buy Tab:
  Avbl: 0.0 USDT (EVM) ← Ethereum USDT
  
Sell Tab:
  Avbl: 0.0 ETH
```

### SOL-USDT (SOL Chain)
```
Buy Tab:
  Avbl: 1.20638 USDT (SOL) ← Solana USDT
  
Sell Tab:
  Avbl: 0.001402508 SOL
```

## Real-Time Updates

### Market Price
- Fetches every 5 seconds from KuCoin API
- Updates equivalent amount automatically
- No manual refresh needed

### Balance
- Fetches on component mount
- Refetches after trade execution
- Can be manually refreshed

### Equivalent Amount
- Recalculates on every input change
- Updates when market price changes
- Shows 6 decimal precision

## Error States

### Insufficient Balance
```
Buy Tab:
  Available: 0.5 USDT
  Input: 10 USDT
  Error: "Insufficient USDT balance"
```

### Invalid Amount
```
Input: -5 USDT
Error: "Amount must be positive"
```

### Network Error
```
Available: Error loading balance
Message: "Failed to fetch balance"
```

## Success Flow

### Complete Buy Order
```
1. User enters: 5 USDT
2. System shows: ≈ 0.033333 SOL
3. User clicks: "Buy SOL"
4. System: Processing...
5. Success: "Buy order placed successfully!"
6. Balances refresh automatically
7. Form resets
```

### Complete Sell Order
```
1. User enters: 0.01 SOL
2. System shows: ≈ 1.50 USDT
3. User clicks: "Sell SOL"
4. System: Processing...
5. Success: "Sell order placed successfully!"
6. Balances refresh automatically
7. Form resets
```
