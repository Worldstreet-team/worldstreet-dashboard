# TronWeb Debugging Guide

## Quick Browser Console Checks

After refreshing the page, run these commands in the browser console:

### 1. Check if TronWeb is loaded
```javascript
console.log('TronWeb exists:', typeof window.TronWeb);
console.log('TronWeb value:', window.TronWeb);
```

**Expected output:**
- `TronWeb exists: function` or `TronWeb exists: object`
- Should show the TronWeb object/function

### 2. Check TronWeb structure
```javascript
console.log('TronWeb keys:', Object.keys(window.TronWeb));
console.log('TronWeb.default:', window.TronWeb.default);
console.log('TronWeb.constructor:', window.TronWeb.constructor);
```

### 3. Try to instantiate TronWeb
```javascript
// Method 1: Direct instantiation
try {
  const tronWeb1 = new window.TronWeb({
    fullHost: 'https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT'
  });
  console.log('Method 1 SUCCESS:', tronWeb1);
} catch (e) {
  console.error('Method 1 FAILED:', e.message);
}

// Method 2: Using default export
try {
  const tronWeb2 = new window.TronWeb.default({
    fullHost: 'https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT'
  });
  console.log('Method 2 SUCCESS:', tronWeb2);
} catch (e) {
  console.error('Method 2 FAILED:', e.message);
}
```

### 4. Test account generation
```javascript
// After successful instantiation
const tronWeb = new window.TronWeb({
  fullHost: 'https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT'
});

try {
  const account = tronWeb.createAccount();
  console.log('Account generated:', account);
  console.log('Address:', account.address.base58);
  console.log('Private key:', account.privateKey);
} catch (e) {
  console.error('Account generation failed:', e);
}
```

## What the Logs Tell You

### Scenario 1: TronWeb is a function
```
TronWeb exists: function
```
✅ This is good! The code should work with `new window.TronWeb(...)`

### Scenario 2: TronWeb is an object
```
TronWeb exists: object
TronWeb.default: function
```
✅ This is also good! The code will use `new window.TronWeb.default(...)`

### Scenario 3: TronWeb not found
```
TronWeb exists: undefined
```
❌ TronWeb didn't load. Check:
- Network tab for script loading errors
- Ad blockers
- Internet connection
- CDN availability

### Scenario 4: Constructor error
```
Method 1 FAILED: (intermediate value) is not a constructor
```
❌ TronWeb loaded but wrong structure. The updated code should handle this.

## Changes Made to Fix

### 1. Changed CDN
- **Old:** `https://cdn.jsdelivr.net/npm/tronweb@latest/dist/TronWeb.js`
- **New:** `https://unpkg.com/tronweb@5.3.2/dist/TronWeb.js`
- **Why:** unpkg with specific version is more reliable

### 2. Improved Detection Logic
```typescript
// Now checks multiple possible structures:
if (typeof win.TronWeb === 'function') {
  return win.TronWeb;  // Direct constructor
}
if (win.TronWeb.default && typeof win.TronWeb.default === 'function') {
  return win.TronWeb.default;  // ES6 default export
}
if (win.TronWeb.constructor) {
  return win.TronWeb.constructor;  // Instance constructor
}
```

### 3. Added Debug Logging
The code now logs:
- `[TronWallet] TronWeb type: function`
- `[TronWallet] TronWeb instance created`
- `[TronWallet] Account generated`
- `[TronWallet] Address: T...`

## Testing Steps

1. **Clear cache and hard refresh**
   - Chrome: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or: DevTools → Network tab → Disable cache → Refresh

2. **Check console for logs**
   - Should see `[TronContext] TronWeb loaded, type: function`
   - Should see `[TronContext] TronWeb instance created`

3. **Try generating wallet**
   - Click "Generate Tron Wallet"
   - Enter PIN
   - Watch console for debug logs

4. **Check for errors**
   - Any errors should now be more descriptive
   - Logs will show exactly where it fails

## Alternative: Manual TronWeb Test

If you want to test TronWeb independently:

```html
<!DOCTYPE html>
<html>
<head>
  <title>TronWeb Test</title>
  <script src="https://unpkg.com/tronweb@5.3.2/dist/TronWeb.js"></script>
</head>
<body>
  <h1>TronWeb Test</h1>
  <button onclick="testTronWeb()">Test TronWeb</button>
  <pre id="output"></pre>

  <script>
    function testTronWeb() {
      const output = document.getElementById('output');
      
      try {
        output.textContent = 'Testing TronWeb...\n';
        
        // Check if loaded
        output.textContent += `TronWeb type: ${typeof window.TronWeb}\n`;
        
        // Create instance
        const tronWeb = new window.TronWeb({
          fullHost: 'https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITNT'
        });
        output.textContent += 'TronWeb instance created ✓\n';
        
        // Generate account
        const account = tronWeb.createAccount();
        output.textContent += `Account generated ✓\n`;
        output.textContent += `Address: ${account.address.base58}\n`;
        output.textContent += `Private key: ${account.privateKey.substring(0, 10)}...\n`;
        
        output.textContent += '\n✅ All tests passed!';
      } catch (error) {
        output.textContent += `\n❌ Error: ${error.message}\n`;
        output.textContent += error.stack;
      }
    }
  </script>
</body>
</html>
```

Save this as `test-tronweb.html` and open in browser to test TronWeb independently.

## If Still Not Working

### Option 1: Download TronWeb Locally
```bash
# Download TronWeb
curl -o public/TronWeb.js https://unpkg.com/tronweb@5.3.2/dist/TronWeb.js

# Update src/app/layout.tsx
<script src="/TronWeb.js"></script>
```

### Option 2: Use npm Package
```bash
npm install tronweb@5.3.2
```

Then import in components:
```typescript
import TronWeb from 'tronweb';

// Use directly
const tronWeb = new TronWeb({
  fullHost: TRON_RPC
});
```

### Option 3: Try Different Version
```html
<!-- Try older stable version -->
<script src="https://unpkg.com/tronweb@4.4.0/dist/TronWeb.js"></script>
```

## Success Indicators

When working correctly, you should see:
1. ✅ No console errors about TronWeb
2. ✅ `[TronContext] TronWeb instance created` in console
3. ✅ Wallet generation completes in ~1 second
4. ✅ Valid Tron address starting with 'T'
5. ✅ Address is 34 characters long

## Report Back

Please run the console checks above and share:
1. Output of `typeof window.TronWeb`
2. Any error messages
3. Which instantiation method works (if any)
4. Console logs from the debug statements

This will help identify the exact issue!
