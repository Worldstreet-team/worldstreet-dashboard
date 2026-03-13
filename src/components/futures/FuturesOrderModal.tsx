"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDebounce } from '@/hooks/useFuturesPolling';

interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'long' | 'short';
  marketIndex: number;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({
  isOpen,
  onClose,
  side,
  marketIndex,
}) => {
  // Drift removal - placeholders
  const openPosition = async (...args: any[]) => ({ success: false, error: 'Not implemented' });
  const driftLoading = false;
  const previewTrade = async (...args: any[]) => ({});
  const getMarketName = (i: number) => 'Market';
  const getMarketPrice = (i: number, type: string) => 0;
  const perpMarkets = new Map();
  const summary: any = null;

  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop-limit'>('market');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showQuote, setShowQuote] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [executing, setExecuting] = useState(false);

  const debouncedSize = useDebounce(size, 300);

  // Get market info from Drift context
  const marketInfo = perpMarkets.get(marketIndex);
  const marketName = marketInfo?.symbol || getMarketName(marketIndex);
  const currentMarketPrice = getMarketPrice(marketIndex, 'perp');

  // Preview calculation with better error handling
  useEffect(() => {
    if (!marketIndex || !debouncedSize || parseFloat(debouncedSize) <= 0) {
      setPreviewData(null);
      setError(null);
      setIsLoadingPreview(false);
      return;
    }

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        setPreviewData({
            entryPrice: 0,
            requiredMargin: 0,
            estimatedFee: 0,
            totalRequired: 0,
            marginCheckPassed: false,
            sizeTooSmall: false,
            maxLeverageAllowed: 20,
            estimatedLiquidationPrice: 0,
            freeCollateral: 0
        });
        setError('Hyperliquid futures integration in progress');
      } catch (error) {
        setPreviewData(null);
        setError('Failed to calculate preview');
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [marketIndex, marketName, debouncedSize, leverage, side]);

  const handlePercentage = (percent: number) => {
    setSize('0');
  };

  const handleGetQuote = () => {
    setError('Hyperliquid futures integration in progress');
  };

  const handleConfirmOrder = async () => {
    setExecuting(false);
    setError('Hyperliquid futures integration in progress');
  };

  const handleBackToForm = () => {
    setShowQuote(false);
    setPin('');
    setPinError('');
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSize('');
      setLimitPrice('');
      setTriggerPrice('');
      setLeverage(1);
      setOrderType('market');
      setError(null);
      setSuccessMessage('');
      setPreviewData(null);
      setIsLoadingPreview(false);
      setShowQuote(false);
      setPin('');
      setPinError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canContinue = false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Compact Bybit Style */}
      <div className="relative w-full max-w-[400px] md:max-w-[600px] bg-[#0b0e11] rounded-lg border border-[#1f2329] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-[#1f2329] flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] md:text-[14px] font-bold text-white">
              {side === 'long' ? 'Long' : 'Short'} {marketName}
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-bold ${
              side === 'long' ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
            }`}>
              {side.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1f2329] rounded transition-colors"
          >
            <Icon icon="ph:x" width={16} className="text-[#848e9c]" />
          </button>
        </div>

        {/* Content - Scrollable without visible scrollbar */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-4 py-2 md:py-3" 
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
        <div className="p-2 md:p-3 border-t border-[#1f2329] flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2 md:py-2.5 rounded font-bold text-[12px] md:text-[13px] bg-[#1f2329] text-[#848e9c] hover:text-white transition-colors"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};
