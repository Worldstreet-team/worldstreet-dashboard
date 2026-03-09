"use client";

import React from 'react';
import { Icon } from '@iconify/react';

interface InsufficientSolModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredSol: number;
  currentSol: number;
  walletAddress: string;
}

export const InsufficientSolModal: React.FC<InsufficientSolModalProps> = ({
  isOpen,
  onClose,
  requiredSol,
  currentSol,
  walletAddress,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortfall = requiredSol - currentSol;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#2b3139] rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[#3a4149]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#3a4149] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#f6465d]/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="ph:warning" className="text-[#f6465d]" width={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Insufficient SOL Balance
                </h3>
                <p className="text-xs sm:text-sm text-[#848e9c] mt-1">
                  You need more SOL to initialize your Drift account
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#848e9c] hover:text-white transition-colors p-1 flex-shrink-0"
            >
              <Icon icon="ph:x" width={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Balance Comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1e2329] p-3 sm:p-4 rounded-lg border border-[#3a4149]">
              <p className="text-[10px] sm:text-xs text-[#848e9c] mb-1 uppercase tracking-wider">
                Current
              </p>
              <p className="text-lg sm:text-xl font-bold text-[#f6465d]">
                {currentSol.toFixed(4)}
              </p>
              <p className="text-[10px] sm:text-xs text-[#848e9c] mt-0.5">SOL</p>
            </div>

            <div className="bg-[#1e2329] p-3 sm:p-4 rounded-lg border border-[#3a4149]">
              <p className="text-[10px] sm:text-xs text-[#848e9c] mb-1 uppercase tracking-wider">
                Required
              </p>
              <p className="text-lg sm:text-xl font-bold text-[#0ecb81]">
                {requiredSol.toFixed(2)}
              </p>
              <p className="text-[10px] sm:text-xs text-[#848e9c] mt-0.5">SOL</p>
            </div>
          </div>

          {/* Shortage Amount */}
          <div className="bg-[#fcd535]/10 p-3 sm:p-4 rounded-lg border border-[#fcd535]/20">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[#fcd535]">
                You need to add:
              </span>
              <div className="text-right">
                <span className="text-base sm:text-lg font-bold text-[#fcd535]">
                  {shortfall.toFixed(4)} SOL
                </span>
                <span className="text-[10px] sm:text-xs text-[#fcd535]/70 block">
                  ≈ ${(shortfall * 150).toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[#1e2329] p-3 sm:p-4 rounded-lg border border-[#3a4149]">
            <div className="flex items-start gap-2">
              <Icon icon="ph:info" className="text-[#fcd535] flex-shrink-0 mt-0.5" width={16} />
              <div className="text-xs sm:text-sm text-white">
                <p className="font-semibold mb-1">Why do I need SOL?</p>
                <p className="text-[#848e9c] leading-relaxed">
                  This one-time fee covers Solana network rent and transaction costs for initializing your Drift account.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1">
              <Icon icon="ph:wallet" width={16} />
              Your Futures Wallet Address
            </label>
            
            <div className="bg-[#1e2329] p-3 rounded-lg border border-[#3a4149]">
              <div className="flex items-start gap-2">
                <code className="text-[10px] sm:text-xs font-mono text-white break-all leading-relaxed flex-1">
                  {walletAddress}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="flex-shrink-0 p-2 hover:bg-[#2b3139] rounded transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Icon icon="ph:check-circle" className="text-[#0ecb81]" width={18} />
                  ) : (
                    <Icon icon="ph:copy" className="text-[#fcd535]" width={18} />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-[10px] text-[#0ecb81] mt-2 flex items-center gap-1">
                  <Icon icon="ph:check" width={12} />
                  Copied to clipboard!
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-semibold text-white">
              How to send SOL:
            </p>
            <ol className="space-y-2 text-xs sm:text-sm text-[#848e9c]">
              {[
                'Copy the wallet address above',
                'Open Phantom, Solflare, or any Solana wallet',
                `Send at least ${shortfall.toFixed(4)} SOL`,
                'Wait for confirmation (1-2 seconds)',
                'Click "Try Again" to initialize'
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#fcd535]/20 text-[#fcd535] text-xs flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-[#fcd535]/10 border border-[#fcd535]/20 rounded-lg p-2.5 sm:p-3 flex items-start gap-2">
            <Icon icon="ph:info" className="text-[#fcd535] flex-shrink-0 mt-0.5" width={14} />
            <p className="text-[10px] sm:text-xs text-[#fcd535] leading-relaxed">
              One-time fee. You won't need to pay this again after initialization.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-[#3a4149]">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-6 py-2.5 bg-[#2b3139] hover:bg-[#3a4149] text-white rounded transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-6 py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded transition-colors text-sm font-semibold"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
