'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface SpotDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAsset?: string;
}

export default function SpotDepositModal({
    isOpen,
    onClose,
    initialAsset = 'USDC'
}: SpotDepositModalProps) {
    const { depositCollateral, walletBalance, summary, isLoading } = useDrift();
    const [amount, setAmount] = useState('');
    const [executing, setExecuting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleDeposit = async () => {
        setError(null);
        setSuccess(null);

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setExecuting(true);
        try {
            const result = await depositCollateral(amountNum);
            if (result.success) {
                setSuccess('Deposit successful!');
                setAmount('');
                setTimeout(() => {
                    onClose();
                    setSuccess(null);
                }, 2000);
            } else {
                setError(result.error || 'Deposit failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => !executing && onClose()}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#181a20] rounded-2xl shadow-2xl border border-[#2b3139] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3139]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Icon icon="ph:arrow-down-bold" className="text-[#0ecb81]" />
                        Deposit Collateral
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={executing}
                        className="p-2 hover:bg-[#2b3139] rounded-full transition-colors disabled:opacity-50"
                    >
                        <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-[#848e9c]">Asset</span>
                            <span className="text-[#848e9c]">Wallet Balance</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-[#2b3139] rounded-lg">
                            <div className="flex items-center gap-2">
                                <Icon icon="cryptocurrency:usdc" width={24} className="text-[#2775ca]" />
                                <span className="text-white font-medium">USDC</span>
                            </div>
                            <span className="text-white font-mono text-sm">-- USDC</span>
                        </div>
                        <p className="text-[10px] text-[#848e9c]">
                            Currently only USDC deposits are supported for spot collateral.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-[#848e9c]">Amount to Deposit</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-3 bg-[#2b3139] border border-[#2b3139] rounded-lg text-lg text-white placeholder:text-[#848e9c] focus:outline-none focus:border-[#fcd535]"
                            />
                            <button
                                onClick={() => setAmount('10')} // Example max/fast buttons
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#181a20] text-[#fcd535] text-[10px] font-bold rounded"
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-[#fcd535]/5 border border-[#fcd535]/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Icon icon="ph:info" width={18} className="text-[#fcd535] flex-shrink-0 mt-0.5" />
                            <div className="text-[11px] text-[#fcd535]/90 space-y-1">
                                <p>Deposits are processed instantly via the Drift Protocol.</p>
                                <p>You will need a small amount of SOL ({walletBalance.toFixed(4)}) for network fees.</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-lg text-xs text-[#f6465d] flex items-center gap-2">
                            <Icon icon="ph:warning-circle" width={16} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-[#0ecb81]/10 border border-[#0ecb81]/30 rounded-lg text-xs text-[#0ecb81] flex items-center gap-2">
                            <Icon icon="ph:check-circle" width={16} />
                            {success}
                        </div>
                    )}

                    <button
                        onClick={handleDeposit}
                        disabled={executing || !amount || parseFloat(amount) <= 0}
                        className="w-full py-4 bg-[#fcd535] hover:bg-[#fcd535]/90 disabled:bg-[#2b3139] disabled:text-[#848e9c] text-[#181a20] font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                    >
                        {executing ? (
                            <span className="flex items-center justify-center gap-2">
                                <Icon icon="ph:circle-notch" className="animate-spin" width={20} />
                                Processing Deposit...
                            </span>
                        ) : (
                            'Confirm Deposit'
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-[#0b0e11] border-t border-[#2b3139]">
                    <div className="flex items-center justify-between text-[10px] text-[#848e9c]">
                        <span>Powered by Drift SDK</span>
                        <span>Fee: 0.00 USDC</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
