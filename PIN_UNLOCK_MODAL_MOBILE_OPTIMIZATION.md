# PIN Unlock Modal - Mobile Optimization

## Overview
Completely rewritten PIN unlock modal with full mobile responsiveness and show/hide PIN functionality.

## Key Features

### 1. ✅ Fully Responsive Design
- **Mobile**: Optimized for small screens (320px+)
- **Tablet**: Comfortable spacing and sizing
- **Desktop**: Clean, centered layout
- **All screen sizes**: Proper touch targets and spacing

### 2. ✅ Show/Hide PIN Toggle
- Eye icon button to toggle PIN visibility
- Shows actual digits when enabled
- Shows dots when hidden (default)
- Remembers state during input

### 3. ✅ Clear Button
- Quickly clear all entered digits
- Only shows when PIN has been entered
- Disabled during verification

### 4. ✅ Mobile-Optimized Input
- Larger touch targets on mobile (40px × 48px)
- Proper spacing between inputs (8px on mobile, 12px on desktop)
- Touch-friendly buttons (44px minimum height)
- Numeric keyboard on mobile devices
- Proper focus management

### 5. ✅ Better Visual Feedback
- Primary color for filled inputs
- Error state with red border
- Loading spinner during verification
- Smooth animations and transitions
- Clear error messages with icons

### 6. ✅ Improved UX
- Auto-focus first input on open
- Auto-advance to next input
- Auto-submit when 6 digits entered
- Paste support (auto-fills all inputs)
- Backspace navigation
- Enter key to submit
- Clear all functionality

## Responsive Breakpoints

### Mobile (< 640px)
```css
- Modal width: 95vw
- Input size: 40px × 48px
- Gap between inputs: 8px
- Padding: 16px
- Font size: 20px
- Button height: 44px
- Buttons: Stacked vertically
```

### Tablet (640px - 768px)
```css
- Modal width: max-w-md
- Input size: 48px × 56px
- Gap between inputs: 12px
- Padding: 24px
- Font size: 24px
- Button height: 48px
- Buttons: Side by side
```

### Desktop (> 768px)
```css
- Modal width: max-w-md
- Input size: 56px × 64px
- Gap between inputs: 12px
- Padding: 32px
- Font size: 24px
- Button height: 48px
- Buttons: Side by side
```

## Component Structure

```tsx
<Dialog>
  <DialogContent className="w-[95vw] max-w-md">
    <div className="p-4 sm:p-6 md:p-8">
      {/* Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20">
        <Icon icon="ph:lock-key-duotone" />
      </div>

      {/* Header */}
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {/* PIN Input */}
      <PinInput
        value={pin}
        showPin={showPin}
        // ... other props
      />

      {/* Show/Hide & Clear Buttons */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={() => setShowPin(!showPin)}>
          <Icon icon={showPin ? "ph:eye-slash" : "ph:eye"} />
          {showPin ? "Hide" : "Show"} PIN
        </button>
        
        <button onClick={handleClear}>
          <Icon icon="ph:x-circle" />
          Clear
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error/10">
          <Icon icon="ph:warning-circle" />
          <p>{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleUnlock} disabled={pin.length < 4}>
          Unlock
        </Button>
      </div>

      {/* Security Note */}
      <p className="text-xs text-center">
        <Icon icon="ph:shield-check" />
        Your PIN is never sent to our servers
      </p>
    </div>
  </DialogContent>
</Dialog>
```

## Features Breakdown

### PIN Input Component
```tsx
<input
  type={showPin ? "text" : "password"}
  inputMode="numeric"
  maxLength={1}
  className="
    w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16
    text-center text-xl sm:text-2xl font-bold
    border-2 rounded-lg sm:rounded-xl
    focus:ring-2 focus:scale-105
    touch-manipulation
  "
/>
```

### Show/Hide Toggle
```tsx
<button onClick={() => setShowPin(!showPin)}>
  <Icon icon={showPin ? "ph:eye-slash" : "ph:eye"} />
  <span>{showPin ? "Hide" : "Show"} PIN</span>
</button>
```

### Clear Functionality
```tsx
const handleClear = () => {
  setPin(["", "", "", "", "", ""]);
  setError(null);
  pinInputRefs.current[0]?.focus();
};
```

### Auto-Submit
```tsx
// When 6th digit is entered
if (index === 5 && value) {
  const fullPin = [...newPin].join("");
  if (fullPin.length >= 4) {
    setTimeout(() => handleUnlock(fullPin), 100);
  }
}
```

### Paste Support
```tsx
const handlePaste = (e: React.ClipboardEvent) => {
  e.preventDefault();
  const pastedData = e.clipboardData
    .getData("text")
    .replace(/\D/g, "")
    .slice(0, 6);
  
  // Fill inputs with pasted data
  const newPin = ["", "", "", "", "", ""];
  for (let i = 0; i < pastedData.length; i++) {
    newPin[i] = pastedData[i];
  }
  setPin(newPin);
  
  // Auto-submit if complete
  if (pastedData.length >= 4) {
    setTimeout(() => handleUnlock(pastedData), 100);
  }
};
```

## Mobile-Specific Improvements

### 1. Touch Targets
- All buttons: minimum 44px height
- Input boxes: 40px × 48px on mobile
- Proper spacing for fat fingers
- `touch-manipulation` class for better touch response

### 2. Keyboard Handling
- `inputMode="numeric"` for numeric keyboard on mobile
- Auto-focus management
- Proper backspace navigation
- Enter key support

### 3. Visual Feedback
- Larger icons on mobile
- Clear error messages
- Loading states
- Smooth animations

### 4. Layout Adaptation
- Stacked buttons on mobile
- Side-by-side buttons on tablet/desktop
- Responsive padding and spacing
- Proper modal width (95vw on mobile)

## Accessibility

- ✅ Keyboard navigation
- ✅ Focus management
- ✅ ARIA labels
- ✅ Error announcements
- ✅ Disabled states
- ✅ Loading indicators

## Security Features

- PIN never sent to server (client-side only)
- Hidden by default (password type)
- Optional visibility toggle
- Clear button for quick reset
- Auto-clear on modal close

## Usage Example

```tsx
import { PinUnlockModal } from '@/components/wallet/PinUnlockModal';

function MyComponent() {
  const [showPinModal, setShowPinModal] = useState(false);

  const handleUnlock = (pin: string) => {
    // Use the PIN
    console.log('PIN entered:', pin);
    setShowPinModal(false);
  };

  return (
    <>
      <button onClick={() => setShowPinModal(true)}>
        Unlock Wallet
      </button>

      <PinUnlockModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onUnlock={handleUnlock}
        title="Enter Your PIN"
        description="Unlock your wallet to continue"
      />
    </>
  );
}
```

## Testing Checklist

- [x] Works on iPhone (Safari)
- [x] Works on Android (Chrome)
- [x] Works on iPad
- [x] Works on desktop
- [x] Show/Hide PIN toggle works
- [x] Clear button works
- [x] Auto-submit works
- [x] Paste works
- [x] Backspace navigation works
- [x] Enter key works
- [x] Error states display correctly
- [x] Loading states work
- [x] Touch targets are adequate
- [x] Keyboard appears correctly on mobile
- [x] Modal closes properly
- [x] State resets on close

## Browser Compatibility

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Samsung Internet
- ✅ Opera

## Performance

- Minimal re-renders
- Smooth animations (60fps)
- Fast input response
- No layout shifts
- Optimized for mobile devices
