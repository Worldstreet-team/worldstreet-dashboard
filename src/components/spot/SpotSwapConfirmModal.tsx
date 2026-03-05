/**
 * Spot Swap Confirmation Modal (Desktop)
 * Shows quote details and PIN input for trade execution
 */

'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { SpotSwapQuote } from '@/hooks/useSpotSwap';
import SpotQuoteDetails from './SpotQuoteDetails';

interface SpotSwapConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: SpotSwapQuote | null;
  pair: string;
  side: 'buy' | 'sell';
  onConfirm: (pin: string) => Promise<void>;
  executing: boolean;
}

export default function SpotSwapConfirmModal({
  isOpen,
  onClose,
  quote,
  pair,
  side,
  onConfirm,
  executing,
}: SpotSwapConfirmModalProps) {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);

  if (!isOpen || !quote) return null;

  const handleConfirm = async () => {
    setPinError('');

    if (!pin || pin.length < 4) {
      setPinError('Please enter your PIN');
      return;
    }

    try {
      await onConfirm(pin);
      setPin('');
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Invalid PIN');
    }
  };

  const handleClose = () => {
    if (!executing) {
      setPin('');
      setPinError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#181a20] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-semibold text-white">
            Confirm {side === 'buy' ? 'Buy' : 'Sell'} Order
          </h3>
          <button 
            onClick={handleClose}
            disabled={executing}
            className="p-2 hover:bg-[#2b3139] rounded-full transition-colors disabled:opacity-50"
          >
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
          <SpotQuoteDetails quote={quote} pair={pair} side={side} />

          {/* PIN Input */}
          <div className="mt-6 space-y-3">
            <label className="block text-sm text-[#848e9c] font-medium">
              Enter PIN to confirm
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError('');
                }}
                placeholder="Enter your PIN"
                maxLength={6}
                disabled={executing}
                className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-base text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848e9c] hover:text-white transition-colors"
              >
                <Icon icon={showPin ? 'ph:eye-slash' : 'ph:eye'} width={20} />
              </button>
            </div>
            {pinError && (
              <p className="text-xs text-[#f6465d]">{pinError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2b3139] space-y-3">
          <button
            onClick={handleConfirm}
            disabled={executing || !pin}
            className={`w-full py-3 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              side === 'buy'
                ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-white'
                : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
            }`}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                Processing...
              </span>
            ) : (
              `Confirm ${side === 'buy' ? 'Buy' : 'Sell'}`
            )}
          </button>
          
          <button
            onClick={handleClose}
            disabled={executing}
            className="w-full py-3 rounded-lg font-semibold text-base bg-[#2b3139] hover:bg-[#2b3139]/80 text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
