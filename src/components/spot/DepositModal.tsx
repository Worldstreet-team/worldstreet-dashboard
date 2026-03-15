'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useSpotDeposit } from '@/hooks/useSpotDeposit';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositInitiated: (depositData: any) => void;
}

export default function DepositModal({ isOpen, onClose, onDepositInitiated }: DepositModalProps) {
  const [step, setStep] = useState<'form' | 'address'>('form');
  const [amount, setAmount] = useState('');
  const [depositChain, setDepositChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [depositFromAddress, setDepositFromAddress] = useState('');
  const [depositData, setDepositData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { initiateDeposit, loading, error } = useSpotDeposit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !depositFromAddress) return;

    const result = await initiateDeposit({
      amount: parseFloat(amount),
      depositChain,
      depositFromAddress: depositFromAddress.trim()
    });

    if (result) {
      setDepositData(result);
      setStep('address');
      onDepositInitiated(result);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setStep('form');
    setAmount('');
    setDepositFromAddress('');
    setDepositData(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2329] rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2b3139]">
          <h2 className="text-lg font-semibold text-white">Deposit USDT</h2>
          <button
            onClick={handleClose}
            className="text-[#848e9c] hover:text-white transition-colors"
          >
            <Icon icon="ph:x" width={20} />
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-[#848e9c] mb-2">
                Deposit Network
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDepositChain('ethereum')}
                  className={`p-3 rounded-lg border transition-colors ${
                    depositChain === 'ethereum'
                      ? 'border-[#f0b90b] bg-[#f0b90b]/10 text-white'
                      : 'border-[#2b3139] bg-[#0b0e11] text-[#848e9c] hover:border-[#848e9c]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon icon="cryptocurrency:eth" width={20} />
                    <span className="text-sm font-medium">Ethereum</span>
                  </div>
                  <div className="text-xs mt-1">~$3-5 gas</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDepositChain('solana')}
                  className={`p-3 rounded-lg border transition-colors ${
                    depositChain === 'solana'
                      ? 'border-[#f0b90b] bg-[#f0b90b]/10 text-white'
                      : 'border-[#2b3139] bg-[#0b0e11] text-[#848e9c] hover:border-[#848e9c]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon icon="cryptocurrency:sol" width={20} />
                    <span className="text-sm font-medium">Solana</span>
                  </div>
                  <div className="text-xs mt-1">~$0.001 gas</div>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-[#848e9c] mb-2">
                Amount (USDT)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Minimum 5 USDT"
                min="5"
                step="0.01"
                className="w-full p-3 bg-[#0b0e11] border border-[#2b3139] rounded-lg text-white placeholder-[#848e9c] focus:border-[#f0b90b] focus:outline-none"
                required
              />
              <div className="text-xs text-[#848e9c] mt-1">
                Minimum 5 USDT (below this amount will be lost forever)
              </div>
            </div>

            {/* From Address Input */}
            <div>
              <label className="block text-sm font-medium text-[#848e9c] mb-2">
                Your {depositChain === 'ethereum' ? 'Ethereum' : 'Solana'} Address
              </label>
              <input
                type="text"
                value={depositFromAddress}
                onChange={(e) => setDepositFromAddress(e.target.value)}
                placeholder={`Your ${depositChain === 'ethereum' ? 'ETH' : 'SOL'} wallet address`}
                className="w-full p-3 bg-[#0b0e11] border border-[#2b3139] rounded-lg text-white placeholder-[#848e9c] focus:border-[#f0b90b] focus:outline-none font-mono text-sm"
                required
              />
              <div className="text-xs text-[#848e9c] mt-1">
                The wallet address you'll send USDT from
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
                <div className="text-[#f6465d] text-sm">{error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount || !depositFromAddress}
              className="w-full py-3 bg-[#f0b90b] hover:bg-[#f0b90b]/90 disabled:bg-[#2b3139] disabled:text-[#848e9c] text-black font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Icon icon="svg-spinners:ring-resize" width={16} />
                  <span>Creating Deposit...</span>
                </div>
              ) : (
                'Generate Deposit Address'
              )}
            </button>
          </form>
        )}

        {step === 'address' && depositData && (
          <div className="p-4 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0ecb81]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon icon="ph:check" width={24} className="text-[#0ecb81]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Deposit Address Generated</h3>
              <p className="text-sm text-[#848e9c]">
                Send exactly {depositData.amount} USDT to the address below
              </p>
            </div>

            {/* Treasury Address */}
            <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#848e9c]">Treasury Address</span>
                <span className="text-xs text-[#848e9c] capitalize">{depositData.depositChain}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-white bg-[#1e2329] p-2 rounded border break-all">
                  {depositData.treasuryAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(depositData.treasuryAddress)}
                  className="p-2 text-[#848e9c] hover:text-white transition-colors"
                  title="Copy address"
                >
                  <Icon icon={copied ? "ph:check" : "ph:copy"} width={16} />
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#f0b90b] text-black rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Send USDT</div>
                  <div className="text-xs text-[#848e9c]">{depositData.instructions.step1}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#848e9c] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Wait for Processing</div>
                  <div className="text-xs text-[#848e9c]">{depositData.instructions.step2}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#848e9c] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Start Trading</div>
                  <div className="text-xs text-[#848e9c]">{depositData.instructions.step3}</div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-[#f0b90b]/10 border border-[#f0b90b]/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Icon icon="ph:warning" width={16} className="text-[#f0b90b] mt-0.5" />
                <div className="text-xs text-[#f0b90b]">
                  Send exactly {depositData.amount} USDT. Different amounts may cause processing delays.
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-[#2b3139] hover:bg-[#3b4149] text-white font-medium rounded-lg transition-colors"
            >
              I've Sent the USDT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}