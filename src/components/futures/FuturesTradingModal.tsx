"use client";

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';

interface FuturesTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'long' | 'short';
  marketIndex: number;
  marketName: string;
}

export default function FuturesTradingModal({ 
  isOpen, 
  onClose, 
  side, 
  marketIndex, 
  marketName 
}: FuturesTradingModalProps) {
  const { openPosition, refreshSummary, refreshPositions } = useHyperliquid();

  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setSize('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!size || parseFloat(size) <= 0) {
      setError('Please enter a valid size');
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      const result = await openPosition({
        symbol: marketName,
        side,
        size: parseFloat(size),
        type: orderType,
        leverage,
        limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
        triggerPrice: orderType === 'stop-limit' ? parseFloat(triggerPrice) : undefined
      });

      if (result.success) {
        setSuccess(true);
        refreshSummary();
        refreshPositions();
        setTimeout(onClose, 2000);
      } else {
        setError(result.error || 'Failed to place order');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[400px] bg-[#0b0e11] rounded-lg border border-[#1f2329] shadow-2xl flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">{side === 'long' ? 'Long' : 'Short'} {marketName}</h3>
          <button onClick={onClose}><Icon icon="ph:x" className="text-[#848e9c]" /></button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <Icon icon="ph:check-circle" className="mx-auto text-[#0ecb81] mb-2" width={48} />
            <p className="text-white font-bold">Order Placed Successfully</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#848e9c] mb-1 block">Order Type</label>
              <div className="grid grid-cols-3 gap-2">
                {['market', 'limit', 'stop-limit'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t as any)}
                    className={`py-1.5 text-[10px] rounded border ${
                      orderType === t ? 'bg-[#f0b90b]/10 border-[#f0b90b] text-[#f0b90b]' : 'border-[#1f2329] text-[#848e9c]'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-[#848e9c] mb-1 block">Size ({marketName.split('-')[0]})</label>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-[#1f2329] border border-[#1f2329] rounded p-2 text-white text-sm focus:outline-none focus:border-[#f0b90b]"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="text-xs text-[#848e9c] mb-1 block">Leverage: {leverage}x</label>
              <input
                type="range"
                min="1"
                max="50"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#1f2329] rounded-lg appearance-none cursor-pointer accent-[#f0b90b]"
              />
            </div>

            {error && <p className="text-[#f6465d] text-xs text-center">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={executing}
              className={`w-full py-3 rounded font-bold text-white transition-all ${
                side === 'long' ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90' : 'bg-[#f6465d] hover:bg-[#f6465d]/90'
              } disabled:opacity-50`}
            >
              {executing ? 'Executing...' : `Confirm ${side.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
