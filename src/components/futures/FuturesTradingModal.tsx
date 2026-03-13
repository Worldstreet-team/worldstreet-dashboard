"use client";

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

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
  // Drift removal - placeholders
  const openPosition = async (...args: any[]) => ({ success: false, error: 'Not implemented' });
  const previewTrade = async (...args: any[]) => ({});
  const summary: any = null;
  const refreshPositions = async () => {};
  const refreshSummary = async () => {};
  const getMarketPrice = (i: number, type: string) => 0;

  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const currentMarketPrice = getMarketPrice(marketIndex, 'perp');

  // Preview calculation
  useEffect(() => {
    if (!isOpen || !size || parseFloat(size) <= 0) {
      setPreviewData(null);
      return;
    }

    const fetchPreview = async () => {
        setPreviewData({
            entryPrice: 0,
            requiredMargin: 0,
            estimatedFee: 0,
            totalRequired: 0,
            marginCheckPassed: false,
            sizeTooSmall: false,
            maxLeverageAllowed: 20,
            estimatedLiquidationPrice: 0
        });
        setError('Hyperliquid futures integration in progress');
    };

    const debounce = setTimeout(fetchPreview, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, marketIndex, size, leverage, side]);

  const handlePercentage = (percent: number) => {
    setSize('0');
    setSliderValue(percent);
  };

  const handleSubmit = async () => {
    setError('Hyperliquid futures integration in progress');
  };

  if (!isOpen) return null;

  const isDisabled = true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Compact Bybit Style */}
      <div className="relative w-full max-w-[500px] bg-[#0b0e11] rounded-lg border border-[#1f2329] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f2329] flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-bold text-white">
              {side === 'long' ? 'Long' : 'Short'} {marketName}
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              side === 'long' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
            }`}>
              {side.toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#1f2329] rounded transition-colors">
            <Icon icon="ph:x" width={16} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content - Scrollable without visible scrollbar */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" 
        >
          <div className="text-center py-12">
            <Icon icon="ph:lightning" className="mx-auto text-[#fcd535] mb-4" width={48} />
            <h4 className="text-white font-bold mb-2">Hyperliquid Integration</h4>
            <p className="text-[#848e9c] text-sm px-6">
              Futures trading is being migrated to Hyperliquid for better performance and lower fees. 
              Trading functionality will be available shortly.
            </p>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="p-2 border-t border-[#1f2329] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded font-bold text-[12px] bg-[#1f2329] text-[#848e9c] hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
