# Futures Trading - Troubleshooting Guide

## Common Issues & Solutions

### Issue: "selectedMarket is not defined"

**Cause:** The `selectedMarket` state is `null` when the page first loads, before markets are fetched from the API.

**Solution:** 
1. Added proper null checks with optional chaining (`selectedMarket?.symbol`)
2. Provided fallback default symbol (`'BTC-USDT'`)
3. Auto-select first market when markets load

**Code Changes:**
```typescript
// In futures/page.tsx
const { selectedMarket, markets, setSelectedMarket } = useFuturesStore();

// Auto-select first market
useEffect(() => {
  if (markets.length > 0 && !selectedMarket) {
    setSelectedMarket(markets[0]);
  }
}, [markets, selectedMarket, setSelectedMarket]);

// Use with fallback
<FuturesChart 
  symbol={selectedMarket?.symbol || 'BTC-USDT'}
  isDarkMode={true}
/>
```

### Issue: Chart not loading

**Possible Causes:**
1. `lightweight-charts` not installed
2. Container has no height
3. API endpoint not responding
4. WebSocket connection failing

**Solutions:**
1. Install package: `npm install lightweight-charts`
2. Set explicit height: `<div className="h-[600px]">`
3. Check network tab for API errors
4. Verify WebSocket URL in console

### Issue: WebSocket not connecting

**Possible Causes:**
1. Backend WebSocket server not running
2. Incorrect WebSocket URL
3. CORS issues
4. Network firewall blocking WebSocket

**Solutions:**
1. Verify backend is running
2. Check WebSocket URL: `wss://trading.watchup.site/ws`
3. Check browser console for connection errors
4. Test WebSocket connection manually

### Issue: Historical data not loading

**Possible Causes:**
1. API endpoint returning wrong format
2. Symbol format mismatch
3. Network error
4. Backend not responding

**Solutions:**
1. Check API response format in network tab
2. Verify symbol format (e.g., 'BTC-USDT' not 'BTCUSDT')
3. Check for network errors
4. Verify backend API is accessible

### Issue: Live updates not working

**Possible Causes:**
1. WebSocket not connected
2. Not subscribed to symbol
3. Message format mismatch
4. Time format incorrect (ms vs seconds)

**Solutions:**
1. Check WebSocket status indicator
2. Verify subscription message sent
3. Check WebSocket message format in console
4. Ensure time is in seconds for chart

### Issue: Chart performance issues

**Possible Causes:**
1. Too many candles loaded
2. Memory leak from not destroying chart
3. Rapid updates causing re-renders
4. Multiple chart instances

**Solutions:**
1. Limit historical data to reasonable amount
2. Ensure `destroy()` called on unmount
3. Use debouncing for rapid updates
4. Check for duplicate chart instances

### Issue: Theme not updating

**Possible Causes:**
1. Chart not re-initialized
2. Theme prop not passed correctly
3. Chart instance is null

**Solutions:**
1. Call `updateTheme()` method
2. Verify `isDarkMode` prop
3. Check chart instance exists

## Debugging Steps

### 1. Check Console
```javascript
// Look for errors
console.error messages

// Check WebSocket status
WebSocket connection opened/closed

// Verify data loading
Historical data loaded: X candles
```

### 2. Check Network Tab
```
GET /api/market/BTC-USDT/klines?type=1m
- Status: 200
- Response: { data: [...] }

WebSocket wss://trading.watchup.site/ws
- Status: 101 Switching Protocols
- Messages: subscribe, kline, pong
```

### 3. Check State
```typescript
// In React DevTools
useFuturesStore:
  - selectedMarket: { symbol: 'BTC-USDT', ... }
  - markets: [...]
  - isLoading: false
  - error: null

useChartStore:
  - symbol: 'BTC-USDT'
  - interval: '1m'
  - currentPrice: 43000
  - isLoading: false
```

### 4. Check Chart Instance
```typescript
// In component
console.log('Chart engine:', chartEngineRef.current);
console.log('Data feed:', dataFeedRef.current);
console.log('WebSocket connected:', dataFeedRef.current?.isConnected());
```

## Error Messages

### "Failed to fetch historical data"
- Check API endpoint is accessible
- Verify symbol format
- Check network connectivity

### "WebSocket connection error"
- Verify WebSocket URL
- Check backend is running
- Check for CORS issues

### "Chart not initialized"
- Ensure container ref is set
- Check container has height
- Verify chart initialization called

### "Max reconnect attempts reached"
- Backend WebSocket server down
- Network issues
- Check backend logs

## Performance Monitoring

### Memory Usage
```javascript
// Check in Chrome DevTools > Memory
// Should be < 50MB for chart
// Look for memory leaks if growing
```

### Update Latency
```javascript
// Measure in console
const start = performance.now();
// ... update happens
const end = performance.now();
console.log('Update took:', end - start, 'ms');
// Should be < 50ms
```

### WebSocket Messages
```javascript
// Count messages per second
let messageCount = 0;
setInterval(() => {
  console.log('Messages/sec:', messageCount);
  messageCount = 0;
}, 1000);
```

## Best Practices

1. **Always check for null/undefined**
   ```typescript
   symbol={selectedMarket?.symbol || 'BTC-USDT'}
   ```

2. **Provide fallbacks**
   ```typescript
   const symbol = propSymbol || storeSymbol || 'BTC-USDT';
   ```

3. **Clean up on unmount**
   ```typescript
   useEffect(() => {
     // ... setup
     return () => {
       dataFeed?.disconnect();
       chart?.destroy();
     };
   }, []);
   ```

4. **Handle errors gracefully**
   ```typescript
   try {
     // ... operation
   } catch (error) {
     console.error('Error:', error);
     setError(error.message);
   }
   ```

5. **Show loading states**
   ```typescript
   {isLoading && <LoadingSpinner />}
   ```

6. **Log important events**
   ```typescript
   console.log('WebSocket connected');
   console.log('Historical data loaded:', data.length);
   console.log('Subscribed to:', symbol, interval);
   ```

## Testing Checklist

- [ ] Page loads without errors
- [ ] Markets load and display
- [ ] First market auto-selected
- [ ] Chart renders
- [ ] Historical data loads
- [ ] WebSocket connects
- [ ] Live updates work
- [ ] Symbol switching works
- [ ] Interval switching works
- [ ] Theme switching works
- [ ] Reconnection works
- [ ] Error handling works
- [ ] Loading states show
- [ ] No memory leaks

## Quick Fixes

### Reset Everything
```typescript
// Clear all state
useFuturesStore.getState().reset();
useChartStore.getState().reset();

// Reload page
window.location.reload();
```

### Force Reconnect
```typescript
// In browser console
dataFeedRef.current?.disconnect();
dataFeedRef.current?.connectWebSocket();
```

### Clear Chart
```typescript
// In browser console
chartEngineRef.current?.destroy();
// Then reload component
```

## Contact Support

If issues persist:
1. Check all documentation
2. Review error messages
3. Check network tab
4. Collect console logs
5. Contact development team with:
   - Error message
   - Steps to reproduce
   - Browser/OS info
   - Screenshots
   - Console logs

---

**Most issues are resolved by:**
1. Proper null checks
2. Fallback values
3. Clean error handling
4. Proper cleanup
5. Checking network connectivity
