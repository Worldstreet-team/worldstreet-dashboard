/**
 * Spot Order Processing Modal
 * Shows immediate feedback when order is submitted
 * Displays real-time status updates during order execution
 */

'use client';

import { Icon } from '@iconify/react';

interface SpotOrderProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'processing' | 'success' | 'error';
  side: 'buy' | 'sell';
  pair: string;
  amount?: string;
  error?: string;
  txSignature?: string;
}

export default function SpotOrderProcessingModal({
  isOpen,
  onClose,
  status,
  side,
  pair,
  amount,
  error,
  txSignature,
}: SpotOrderProcessingModalProps) {
  if (!isOpen) return null;

  const [baseAsset] = pair.split('-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={status !== 'processing' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#181a20] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3139]">
          <h3 className="text-lg font-semibold text-white">
            {status === 'processing' && 'Processing Order'}
            {status === 'success' && 'Order Successful'}
            {status === 'error' && 'Order Failed'}
          </h3>
          {status !== 'processing' && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#2b3139] rounded-full transition-colors"
            >
              <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'processing' && (
              <div className="relative">
                <Icon 
                  icon="ph:circle-notch" 
                  className="animate-spin text-[#fcd535]" 
                  width={64} 
                />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-[#0ecb81]/20 flex items-center justify-center">
                <Icon 
                  icon="ph:check-circle" 
                  className="text-[#0ecb81]" 
                  width={48} 
                />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-[#f6465d]/20 flex items-center justify-center">
                <Icon 
                  icon="ph:x-circle" 
                  className="text-[#f6465d]" 
                  width={48} 
                />
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center space-y-3">
            {status === 'processing' && (
              <>
                <p className="text-white text-lg font-medium">
                  Submitting your order...
                </p>
                <p className="text-[#848e9c] text-sm">
                  {side === 'buy' ? 'Buying' : 'Selling'} {baseAsset}
                </p>
                <p className="text-[#848e9c] text-xs">
                  This may take a few seconds. Please don't close this window.
                </p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <p className="text-white text-lg font-medium">
                  Order executed successfully!
                </p>
                <p className="text-[#848e9c] text-sm">
                  {side === 'buy' ? 'Bought' : 'Sold'} {amount} {baseAsset}
                </p>
                {txSignature && (
                  <a
                    href={`https://solscan.io/tx/${txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#fcd535] text-xs hover:underline mt-2"
                  >
                    View on Solscan
                    <Icon icon="ph:arrow-square-out" width={14} />
                  </a>
                )}
              </>
            )}
            
            {status === 'error' && (
              <>
                <p className="text-white text-lg font-medium">
                  Order failed
                </p>
                <p className="text-[#f6465d] text-sm">
                  {error || 'An error occurred while processing your order'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {status !== 'processing' && (
          <div className="px-6 py-4 border-t border-[#2b3139]">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg font-semibold text-base bg-[#2b3139] hover:bg-[#2b3139]/80 text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
