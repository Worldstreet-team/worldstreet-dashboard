"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useHyperliquid } from '@/app/context/hyperliquidContext';

interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'long' | 'short';
  marketIndex: number; // For compatibility with older props
  marketName?: string;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen,
  onClose,
  side,
  marketIndex,
  marketName = 'BTC-USD'
}) => {
  const { openPosition, refreshSummary, refreshPositions } = useHyperliquid();

  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
        setError(result.error || 'Order failed');
      }
    } catch (err) {
      setError('Network error');
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
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold">{side === 'long' ? 'Long' : 'Short'} {marketName}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
               side === 'long' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
            }`}>
              {side.toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#1f2329] rounded"><Icon icon="ph:x" width={18} className="text-[#848e9c]" /></button>
        </div>

        {success ? (
          <div className="text-center py-10">
            <Icon icon="ph:check-circle" className="mx-auto text-[#0ecb81] mb-2" width={64} />
            <h4 className="text-white font-bold text-lg">Order Placed</h4>
            <p className="text-[#848e9c] text-sm mt-1">Your order has been submitted to Hyperliquid</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#1f2329] rounded">
              {['market', 'limit', 'stop'].map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t === 'stop' ? 'stop-limit' : t as any)}
                  className={`py-1.5 text-[10px] rounded font-bold transition-all ${
                    (orderType === t || (t === 'stop' && orderType === 'stop-limit')) 
                      ? 'bg-[#2b3139] text-white shadow-sm' 
                      : 'text-[#848e9c] hover:text-white'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[11px] font-medium text-[#848e9c] uppercase">Size</label>
                <span className="text-[11px] text-[#848e9c]">{marketName.split('-')[0]}</span>
              </div>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-[#1f2329] border border-[#2b3139] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0b90b]"
                placeholder="0.00"
              />
            </div>

            {orderType !== 'market' && (
              <div>
                <label className="text-[11px] font-medium text-[#848e9c] uppercase mb-1 block">Price</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full bg-[#1f2329] border border-[#2b3139] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0b90b]"
                  placeholder="Price"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[11px] font-medium text-[#848e9c] uppercase">Leverage</label>
                <span className="text-[11px] text-[#f0b90b] font-bold">{leverage}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#1f2329] rounded-lg appearance-none cursor-pointer accent-[#f0b90b]"
              />
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[9px] text-[#848e9c]">1x</span>
                <span className="text-[9px] text-[#848e9c]">25x</span>
                <span className="text-[9px] text-[#848e9c]">50x</span>
              </div>
            </div>

            {error && (
              <div className="p-2 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded flex items-center gap-2">
                <Icon icon="ph:warning-circle" className="text-[#f6465d]" width={14} />
                <p className="text-[#f6465d] text-[10px]">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={executing}
              className={`w-full py-3 rounded-lg font-bold text-sm text-[#0b0e11] transition-all transform active:scale-95 ${
                side === 'long' 
                  ? 'bg-[#0ecb81] hover:bg-[#0ecb81]/90' 
                  : 'bg-[#f6465d] hover:bg-[#f6465d]/90'
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon icon="svg-spinners:ring-resize" width={16} />
                  PROCESSING...
                </span>
              ) : (
                `CONFIRM ${side.toUpperCase()}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
