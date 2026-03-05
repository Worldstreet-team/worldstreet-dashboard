# Blockchain Explorer Transaction Polling

## Overview
Updated the swap context to poll transaction status directly from blockchain explorers instead of relying on RPC connection confirmations. This provides more reliable transaction tracking and avoids timeout issues.

## Problem with Previous Approach
The previous implementation used RPC connection methods:
- **Solana**: `connection.confirmTransaction()` with blockhash strategy
- **Ethereum**: `tx.wait()` for receipt confirmation

Issues:
- Timeout errors when network is congested
- False negatives when transactions succeed but confirmation times out
- Dependency on RPC endpoint reliability
- No fallback mechanism

## New Approach: Explorer-Based Polling

### Solana Transactions
Uses **Solscan API** to poll transaction status:
- Endpoint: `https://api.solscan.io/transaction?tx={txHash}`
- Checks `status` field: "Success" or "Fail"
- Also checks `confirmationStatus`: "finalized"
- Polls every 2 seconds for up to 60 seconds (30 attempts)

### Ethereum Transactions
Uses **Etherscan API** to poll transaction receipt:
- Endpoint: `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash={txHash}`
- Checks `result.status`: "1" (success) or "0" (failed)
- Polls every 2 seconds for up to 60 seconds (30 attempts)
- Requires `NEXT_PUBLIC_ETHERSCAN_API_KEY` environment variable (optional, works without)

## Implementation Details

### New Function: `pollTransactionStatus`
```typescript
const pollTransactionStatus = useCallback(
  async (txHash: string, chain: ChainKey): Promise<boolean> => {
    const maxAttempts = 30; // 30 attempts
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Poll explorer API
      // Return true if confirmed
      // Throw error if failed
      // Continue polling if pending
    }

    // Return false if exhausted attempts (transaction may still succeed)
    return false;
  },
  []
);
```

### Updated Transaction Flow

#### Solana Swap
1. Create ATA if needed
2. Send ATA creation transaction
3. **Poll ATA transaction via Solscan**
4. Deserialize and sign swap transaction
5. Send swap transaction
6. **Poll swap transaction via Solscan**
7. Return transaction hash

#### Ethereum Swap
1. Check token allowance
2. If needed, send approval transaction
3. **Poll approval transaction via Etherscan**
4. Send swap transaction
5. **Poll swap transaction via Etherscan**
6. Return transaction hash

## Benefits

### Reliability
- ✅ No more timeout errors from RPC confirmations
- ✅ Works even when RPC is slow or congested
- ✅ Independent verification from blockchain explorers
- ✅ Consistent behavior across different RPC providers

### User Experience
- ✅ More accurate transaction status
- ✅ Faster feedback on transaction success/failure
- ✅ Better error messages when transactions fail
- ✅ No false negatives from timeout issues

### Robustness
- ✅ Graceful degradation if polling fails (returns false but doesn't throw)
- ✅ Li.Fi can still track the transaction if explorer polling times out
- ✅ Immediate failure detection if transaction reverts
- ✅ Works with or without API keys (Etherscan)

## Configuration

### Environment Variables
Add to `.env.local` (optional):
```bash
# Etherscan API key for Ethereum transaction polling
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

Note: Etherscan API works without a key but has rate limits. With a key, you get higher rate limits.

### Polling Parameters
Configurable in `pollTransactionStatus`:
- `maxAttempts`: 30 (60 seconds total)
- `pollInterval`: 2000ms (2 seconds between attempts)

Adjust these based on your needs:
- Increase for slower networks
- Decrease for faster feedback

## Error Handling

### Transaction Failures
If explorer reports transaction failed:
```typescript
if (data.status === "Fail") {
  throw new Error("Transaction failed on-chain");
}
```

### Polling Timeout
If all attempts exhausted without confirmation:
```typescript
console.warn(
  `[Swap] Could not confirm transaction via explorer after ${maxAttempts} attempts. TX: ${txHash}`
);
return false; // Don't throw, let Li.Fi track it
```

### Network Errors
Caught and logged, polling continues:
```typescript
catch (error) {
  console.error(`[Swap] Error polling transaction status (attempt ${attempt + 1}):`, error);
  // Continue polling unless it's a failure error
}
```

## API Endpoints Used

### Solscan (Solana)
- **URL**: `https://api.solscan.io/transaction?tx={txHash}`
- **Method**: GET
- **Headers**: `Accept: application/json`
- **Response**:
  ```json
  {
    "status": "Success" | "Fail",
    "confirmationStatus": "finalized" | "confirmed" | "processed"
  }
  ```

### Etherscan (Ethereum)
- **URL**: `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash={txHash}&apikey={key}`
- **Method**: GET
- **Response**:
  ```json
  {
    "status": "1",
    "result": {
      "status": "1" // "1" = success, "0" = failed
    }
  }
  ```

## Testing

### Test Scenarios
1. **Successful Swap**: Transaction confirms within 30 attempts
2. **Failed Transaction**: Explorer reports failure, error thrown
3. **Slow Network**: Transaction takes longer but eventually confirms
4. **Timeout**: All attempts exhausted, returns false but doesn't fail
5. **Network Error**: Temporary API error, continues polling

### Manual Testing
```typescript
// Test Solana transaction
const solTxHash = "your_solana_tx_hash";
const confirmed = await pollTransactionStatus(solTxHash, "solana");
console.log("Solana TX confirmed:", confirmed);

// Test Ethereum transaction
const ethTxHash = "your_ethereum_tx_hash";
const confirmed = await pollTransactionStatus(ethTxHash, "ethereum");
console.log("Ethereum TX confirmed:", confirmed);
```

## Migration Notes

### Breaking Changes
None - this is a drop-in replacement for the previous confirmation logic.

### Backward Compatibility
- All existing swap functionality works the same
- Transaction hashes are still returned
- Li.Fi polling still works as fallback
- Error messages remain consistent

## Future Improvements

### Potential Enhancements
1. Add support for more explorers (Blockscout, etc.)
2. Implement exponential backoff for polling
3. Add transaction status caching
4. Support custom polling parameters per chain
5. Add metrics/analytics for confirmation times

### Alternative Explorers
- **Solana**: Solana Beach, Solana Explorer
- **Ethereum**: Blockscout, Ethplorer
- Could implement fallback chain if primary explorer fails

## Troubleshooting

### Transaction Not Confirming
- Check explorer manually with transaction hash
- Verify network is not congested
- Increase `maxAttempts` if needed
- Check RPC endpoint is working

### API Rate Limits
- Add Etherscan API key to `.env.local`
- Implement request caching
- Add delay between requests if needed

### False Negatives
- If polling returns false but transaction succeeded, Li.Fi will still track it
- Check Li.Fi status endpoint for final confirmation
- Transaction hash is always returned for manual verification
