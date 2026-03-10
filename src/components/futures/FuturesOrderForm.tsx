'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FuturesOrderModal } from './FuturesOrderModal';

interface FuturesOrderFormProps {
  marketIndex: number;
  marketName: string;
}

export default function FuturesOrderForm({ marketIndex, marketName }: FuturesOrderFormProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'long' | 'short'>('long');

  const handleOpenModal = (side: 'long' | 'short') => {
    setSelectedSide(side);
    setShowModal(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOpenModal('long')}
            className="py-3 bg-gradient-to-br from-[#0ecb81] to-[#0ecb81]/80 hover:from-[#0ecb81]/90 hover:to-[#0ecb81]/70 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-[#0ecb81]/20"
          >
            <div className="flex items-center justify-center gap-2">
              <Icon icon="ph:arrow-up-bold" width={16} />
              <span>Long</span>
            </div>
          </button>
          <button
            onClick={() => handleOpenModal('short')}
            className="py-3 bg-gradient-to-br from-[#f6465d] to-[#f6465d]/80 hover:from-[#f6465d]/90 hover:to-[#f6465d]/70 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-[#f6465d]/20"
          >
            <div className="flex items-center justify-center gap-2">
              <Icon icon="ph:arrow-down-bold" width={16} />
              <span>Short</span>
            </div>
          </button>
        </div>

        {/* Info Text */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            Click to open a position on {marketName}
          </p>
        </div>
      </div>

      <FuturesOrderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        side={selectedSide}
        marketIndex={marketIndex}
      />
    </>
  );
}
