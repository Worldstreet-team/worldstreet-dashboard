'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useDepositStatus } from '@/hooks/useDepositStatus';

interface DepositStatusTrackerProps {
  depositId: string;
  onComplete?: () => void;
}

const STAGES = [
  { key: 'initiated', label: 'Waiting for USDT', icon: 'ph:clock' },
  { key: 'detected', label: 'USDT Detected', icon: 'ph:eye' },
  { key: 'disbursing', label: 'Sending USDC', icon: 'ph:arrow-right' },
  { key: 'disbursed', label: 'USDC Received', icon: 'ph:check-circle' },
  { key: 'bridging', label: 'Bridging to HL', icon: 'ph:bridge' },
  { key: 'completed', label: 'Ready to Trade', icon: 'ph:check-circle-fill' }
];

export default function DepositStatusTracker({ depositId, onComplete }: DepositStatusTrackerProps) {
  const { status, loading, error } = useDepositStatus(depositId, !!depositId);

  React.useEffect(() => {
    if (status?.stage === 'completed' && onComplete) {
      onComplete();
    }
  }, [status?.stage, onComplete]);

  if (!depositId) return null;

  const getCurrentStageIndex = () => {
    if (!status) return 0;
    return STAGES.findIndex(stage => stage.key === status.stage);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="bg-[#1e2329] border border-[#2b3139] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Deposit Progress</h3>
        {loading && (
          <Icon icon="svg-spinners:ring-resize" width={16} className="text-[#f0b90b]" />
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
          <div className="text-[#f6465d] text-sm">{error}</div>
        </div>
      )}

      {status?.stage === 'failed' && (
        <div className="mb-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
          <div className="flex items-center gap-2 text-[#f6465d]">
            <Icon icon="ph:warning" width={16} />
            <span className="text-sm font-medium">Deposit Failed</span>
          </div>
          <div className="text-[#f6465d] text-xs mt-1">{status.message}</div>
        </div>
      )}

      {status?.stage === 'expired' && (
        <div className="mb-4 p-3 bg-[#f0b90b]/10 border border-[#f0b90b]/20 rounded-lg">
          <div className="flex items-center gap-2 text-[#f0b90b]">
            <Icon icon="ph:clock" width={16} />
            <span className="text-sm font-medium">Deposit Expired</span>
          </div>
          <div className="text-[#f0b90b] text-xs mt-1">24-hour timeout reached</div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="space-y-3">
        {STAGES.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isCompleted = index < currentStageIndex;
          const isFailed = status?.stage === 'failed' && index === currentStageIndex;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isFailed 
                  ? 'bg-[#f6465d]/10 border border-[#f6465d]/20'
                  : isCompleted 
                    ? 'bg-[#0ecb81]/10 border border-[#0ecb81]/20'
                    : isActive 
                      ? 'bg-[#f0b90b]/10 border border-[#f0b90b]/20'
                      : 'bg-[#2b3139] border border-[#2b3139]'
              }`}>
                <Icon 
                  icon={
                    isFailed 
                      ? 'ph:x' 
                      : isCompleted 
                        ? 'ph:check' 
                        : isActive 
                          ? stage.icon 
                          : stage.icon
                  } 
                  width={16} 
                  className={
                    isFailed 
                      ? 'text-[#f6465d]'
                      : isCompleted 
                        ? 'text-[#0ecb81]'
                        : isActive 
                          ? 'text-[#f0b90b]'
                          : 'text-[#848e9c]'
                  }
                />
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  isFailed 
                    ? 'text-[#f6465d]'
                    : isCompleted 
                      ? 'text-[#0ecb81]'
                      : isActive 
                        ? 'text-white'
                        : 'text-[#848e9c]'
                }`}>
                  {stage.label}
                </div>
                {isActive && status?.message && (
                  <div className="text-xs text-[#848e9c] mt-1">{status.message}</div>
                )}
                {isActive && status?.estimatedTimeRemaining && (
                  <div className="text-xs text-[#f0b90b] mt-1">
                    ETA: {status.estimatedTimeRemaining}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deposit Info */}
      {status && (
        <div className="mt-4 pt-4 border-t border-[#2b3139]">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[#848e9c]">Amount</div>
              <div className="text-white font-medium">{status.amount} USDT</div>
            </div>
            <div>
              <div className="text-[#848e9c]">Network</div>
              <div className="text-white font-medium capitalize">{status.depositChain}</div>
            </div>
          </div>
          
          {status.txHash && (
            <div className="mt-2">
              <div className="text-[#848e9c] text-xs">Transaction Hash</div>
              <div className="text-[#f0b90b] text-xs font-mono break-all">{status.txHash}</div>
            </div>
          )}
          
          {status.bridgeTxHash && (
            <div className="mt-2">
              <div className="text-[#848e9c] text-xs">Bridge Transaction</div>
              <div className="text-[#f0b90b] text-xs font-mono break-all">{status.bridgeTxHash}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}