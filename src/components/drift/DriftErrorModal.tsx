"use client";

import React from 'react';
import { Icon } from '@iconify/react';

interface DriftErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    title: string;
    message: string;
    details?: {
      orderSize?: string;
      minRequired?: string;
      minValue?: string;
      available?: string;
      required?: string;
    };
  } | null;
}

export const DriftErrorModal: React.FC<DriftErrorModalProps> = ({
  isOpen,
  onClose,
  error,
}) => {
  if (!isOpen || !error) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#2b3139] rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[#3a4149]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#3a4149] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-[#f6465d]/10 flex items-center justify-center flex-shrink-0">
                <Icon icon="ph:x-circle" className="text-[#f6465d]" width={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {error.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#848e9c] mt-1">
                  {error.message}
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
        {error.details && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="bg-[#1e2329] p-3 sm:p-4 rounded-lg border border-[#3a4149]">
              <div className="flex items-start gap-2 mb-3">
                <Icon icon="ph:info" className="text-[#fcd535] flex-shrink-0 mt-0.5" width={16} />
                <p className="text-xs sm:text-sm font-semibold text-white">
                  Order Details
                </p>
              </div>
              <div className="space-y-2.5">
                {error.details.orderSize && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-[#848e9c]">Your Order Size:</span>
                    <span className="font-mono text-xs sm:text-sm font-medium text-white">
                      {error.details.orderSize}
                    </span>
                  </div>
                )}
                {error.details.minRequired && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-[#848e9c]">Minimum Required:</span>
                    <span className="font-mono text-xs sm:text-sm font-medium text-[#fcd535]">
                      {error.details.minRequired}
                    </span>
                  </div>
                )}
                {error.details.minValue && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-[#848e9c]">Minimum Value:</span>
                    <span className="font-mono text-xs sm:text-sm font-medium text-[#fcd535]">
                      {error.details.minValue}
                    </span>
                  </div>
                )}
                {error.details.available && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-[#848e9c]">Available:</span>
                    <span className="font-mono text-xs sm:text-sm font-medium text-white">
                      {error.details.available}
                    </span>
                  </div>
                )}
                {error.details.required && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm text-[#848e9c]">Required:</span>
                    <span className="font-mono text-xs sm:text-sm font-medium text-[#f6465d]">
                      {error.details.required}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end p-4 sm:p-6 border-t border-[#3a4149]">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-6 py-2.5 bg-[#fcd535] hover:bg-[#fcd535]/90 text-[#181a20] rounded transition-colors text-sm font-semibold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
