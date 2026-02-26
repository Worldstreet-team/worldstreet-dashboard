# Clear Cache and Rebuild Instructions

The error you're seeing is due to cached build files. Follow these steps to fix it:

## Option 1: Delete .next folder and rebuild (Recommended)

```bash
# Stop the dev server (Ctrl+C)

# Delete the .next build folder
rm -rf .next

# Clear npm cache (optional but recommended)
npm cache clean --force

# Restart the dev server
npm run dev
```

## Option 2: Hard refresh in browser

1. Open the futures page
2. Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
3. Or open DevTools (F12) → Right-click the refresh button → "Empty Cache and Hard Reload"

## Option 3: Clear browser data

1. Open browser settings
2. Clear browsing data
3. Select "Cached images and files"
4. Clear data for the last hour
5. Refresh the page

## Why this happened

The old compiled JavaScript still references the `markPrice` property from the old Position interface. After updating the code to use Drift API, the build cache wasn't cleared, so the browser is still loading the old code.

## Verify the fix

After clearing cache and rebuilding:
1. Navigate to `/futures` page
2. Check browser console - the error should be gone
3. The PositionPanel should now fetch data from Drift API
4. No more references to `markPrice.toFixed()`

## If error persists

If you still see the error after clearing cache:
1. Check if there are any other browser tabs with the app open - close them
2. Make sure the dev server restarted after deleting .next
3. Try incognito/private browsing mode
4. Check if there's a service worker caching the old code (DevTools → Application → Service Workers → Unregister)
