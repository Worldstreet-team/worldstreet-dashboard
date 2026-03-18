'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { useSpotDeposit } from '@/hooks/useSpotDeposit';
import { useWallet } from '@/app/context/walletContext';
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';

// Ethereum USDT contract address
const ETH_USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  initiated:        { label: 'Initializing...',                  icon: 'ph:spinner',           color: 'text-[#848e9c]' },
  sending_usdt:     { label: 'Sending USDT to treasury...',      icon: 'ph:spinner',           color: 'text-[#f0b90b]' },
  awaiting_deposit: { label: 'USDT sent, waiting for confirm...', icon: 'ph:clock',            color: 'text-[#f0b90b]' },
  deposit_detected: { label: 'Deposit detected!',                icon: 'ph:check-circle',      color: 'text-[#0ecb81]' },
  disbursing:       { label: 'Converting to Arb USDC...',        icon: 'ph:spinner',           color: 'text-[#f0b90b]' },
  disbursed:        { label: 'USDC received, bridging...',       icon: 'ph:spinner',           color: 'text-[#f0b90b]' },
  bridging:         { label: 'Depositing to Hyperliquid...',     icon: 'ph:spinner',           color: 'text-[#f0b90b]' },
  transferring:     { label: 'Transferring to Spot wallet...',   icon: 'ph:spinner',           color: 'text-[#f0b90b]' },
  completed:        { label: 'Funds ready to trade!',            icon: 'ph:check-circle-fill', color: 'text-[#0ecb81]' },
  failed:           { label: 'Transfer failed',                  icon: 'ph:x-circle',          color: 'text-[#f6465d]' },
  expired:          { label: 'Transfer expired',                 icon: 'ph:clock-countdown',   color: 'text-[#f6465d]' },
};

const STAGES = [
  'sending_usdt',
  'awaiting_deposit',
  'deposit_detected',
  'disbursing',
  'disbursed',
  'bridging',
  'transferring',
  'completed',
];

function getStageIndex(status: string): number {
  const idx = STAGES.indexOf(status);
  return idx === -1 ? 0 : idx;
}

interface SpotFundingSwapProps {
  onTransferComplete?: () => void;
}

export default function SpotFundingSwap({ onTransferComplete }: SpotFundingSwapProps) {
  const { deposit, loading, error, initiate, resumePolling, reset, cancel } = useSpotDeposit();
  const { addresses, isLoading: walletsLoading } = useWallet();
  const { getUsdtBalance: getSolUsdtBalance, balance: solNativeBalance, loading: solLoading } = useSolana();
  const { tokenBalances: ethTokenBalances, loading: evmLoading } = useEvm();

  const [chain, setChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [amount, setAmount] = useState('');
  const [spotBalance, setSpotBalance] = useState<number | null>(null);
  const [spotBalanceLoading, setSpotBalanceLoading] = useState(false);

  // Derive wallet address
  const fromAddress = useMemo(() => {
    if (!addresses) return '';
    return chain === 'ethereum' ? addresses.ethereum : addresses.solana;
  }, [chain, addresses]);

  // USDT balances
  const solUsdtBalance = useMemo(() => getSolUsdtBalance(), [getSolUsdtBalance]);
  const ethUsdtBalance = useMemo(() => {
    const usdt = ethTokenBalances.find(
      (t) => t.address.toLowerCase() === ETH_USDT_ADDRESS.toLowerCase()
    );
    return usdt?.amount ?? 0;
  }, [ethTokenBalances]);

  const usdtBalance = chain === 'solana' ? solUsdtBalance : ethUsdtBalance;
  const balanceLoading = chain === 'solana' ? solLoading : evmLoading;
  const needsSol = chain === 'solana' && solNativeBalance < 0.01;

  // Fetch spot wallet USDC balance
  const fetchSpotBalance = useCallback(async () => {
    try {
      setSpotBalanceLoading(true);
      const res = await fetch('/api/hyperliquid/spot-balances');
      const data = await res.json();
      if (data.success && data.data?.balances) {
        const usdc = data.data.balances.find(
          (b: { coin: string; total: string }) =>
            b.coin === 'USDC' || b.coin === 'USDT'
        );
        setSpotBalance(usdc ? parseFloat(usdc.total) : 0);
      }
    } catch {
      // Silently fail
    } finally {
      setSpotBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpotBalance();
  }, [fetchSpotBalance]);

  // Resume polling on mount
  useEffect(() => {
    resumePolling();
  }, [resumePolling]);

  // Notify parent + refresh spot balance on completion
  useEffect(() => {
    if (deposit?.status === 'completed') {
      fetchSpotBalance();
      onTransferComplete?.();
    }
  }, [deposit?.status, fetchSpotBalance, onTransferComplete]);

  const handleInitiate = async () => {
    if (!amount || parseFloat(amount) < 5 || !fromAddress) return;
    await initiate({
      depositChain: chain,
      depositAmount: parseFloat(amount),
      depositFromAddress: fromAddress,
      depositToken: 'USDT',
    });
  };

  const handleNewTransfer = () => {
    reset();
    setAmount('');
    fetchSpotBalance();
  };

  const handleMax = () => {
    if (usdtBalance > 0) setAmount(String(usdtBalance));
  };

  const isActive = deposit && !['completed', 'failed', 'expired'].includes(deposit.status);
  const isTerminal = deposit && ['completed', 'failed', 'expired'].includes(deposit.status);
  const showForm = !deposit || isTerminal;
  const statusCfg = deposit ? STATUS_CONFIG[deposit.status] || STATUS_CONFIG.initiated : null;

  return (
    <div className="bg-[#1e2329] rounded-2xl border border-[#2b3139] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2b3139]">
        <div className="flex items-center gap-2">
          <Icon icon="ph:arrows-down-up" width={18} className="text-[#f0b90b]" />
          <h3 className="text-sm font-semibold text-white">Fund Spot Wallet</h3>
        </div>
        {isActive && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f0b90b] animate-pulse" />
            <span className="text-[10px] text-[#f0b90b]">Processing</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* === FORM VIEW === */}
        {showForm && (
          <>
            {/* Terminal Status (if coming from completed/failed) */}
            {isTerminal && statusCfg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                deposit?.status === 'completed' ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10'
              }`}>
                <Icon icon={statusCfg.icon} width={16} className={statusCfg.color} />
                <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
              </div>
            )}

            {/* ── FROM SECTION ── */}
            <div className="bg-[#0b0e11] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#848e9c] uppercase tracking-wider">From</span>
                <span className="text-[10px] text-[#848e9c]">
                  Balance:{' '}
                  {balanceLoading ? (
                    <Icon icon="ph:spinner" width={10} className="animate-spin inline" />
                  ) : (
                    <span className="text-white">
                      {usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  )}
                </span>
              </div>

              {/* Chain Toggle */}
              <div className="flex gap-2">
                {(['ethereum', 'solana'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setChain(c)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      chain === c
                        ? 'bg-[#f0b90b]/10 border border-[#f0b90b]/40 text-[#f0b90b]'
                        : 'bg-[#1e2329] border border-[#2b3139] text-[#848e9c] hover:border-[#3b4149]'
                    }`}
                  >
                    <Icon
                      icon={c === 'ethereum' ? 'cryptocurrency:eth' : 'cryptocurrency:sol'}
                      width={14}
                    />
                    {c === 'ethereum' ? 'Ethereum' : 'Solana'}
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div className="flex items-center gap-2 bg-[#1e2329] rounded-lg px-3 py-2.5 border border-[#2b3139] focus-within:border-[#f0b90b] transition-colors">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={5}
                  className="flex-1 bg-transparent text-white text-lg font-medium placeholder:text-[#4a5056] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleMax}
                    disabled={usdtBalance <= 0}
                    className="text-[10px] font-medium text-[#f0b90b] hover:text-[#f0b90b]/80 disabled:text-[#4a5056] px-1.5 py-0.5 rounded bg-[#f0b90b]/10 disabled:bg-transparent"
                  >
                    MAX
                  </button>
                  <div className="flex items-center gap-1 text-xs text-white font-medium">
                    <Icon icon="token-branded:usdt" width={16} />
                    USDT
                  </div>
                </div>
              </div>

              {amount && parseFloat(amount) < 5 && (
                <p className="text-[10px] text-[#f6465d]">Minimum transfer is 5 USDT</p>
              )}
            </div>

            {/* ── SWAP ARROW ── */}
            <div className="flex justify-center -my-1">
              <div className="w-8 h-8 rounded-full bg-[#2b3139] border-4 border-[#1e2329] flex items-center justify-center">
                <Icon icon="ph:arrow-down-bold" width={14} className="text-[#f0b90b]" />
              </div>
            </div>

            {/* ── TO SECTION ── */}
            <div className="bg-[#0b0e11] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#848e9c] uppercase tracking-wider">To</span>
                <span className="text-[10px] text-[#848e9c]">
                  Spot Balance:{' '}
                  {spotBalanceLoading ? (
                    <Icon icon="ph:spinner" width={10} className="animate-spin inline" />
                  ) : spotBalance !== null ? (
                    <span className="text-white">
                      {spotBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </span>
                  ) : (
                    <span className="text-[#4a5056]">—</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#1e2329] rounded-lg px-3 py-2.5 border border-[#2b3139]">
                <div className="flex-1">
                  <span className="text-lg font-medium text-white">
                    {amount && parseFloat(amount) >= 5
                      ? `≈ ${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '0.00'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white font-medium shrink-0">
                  <Icon icon="token-branded:usdc" width={16} />
                  USDC
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-[#848e9c]">
                <Icon icon="ph:chart-bar" width={12} />
                Hyperliquid Spot Wallet
              </div>
            </div>

            {/* Warnings */}
            {needsSol && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#f0b90b]/10 border border-[#f0b90b]/20">
                <Icon icon="ph:warning-fill" width={14} className="text-[#f0b90b] mt-0.5 shrink-0" />
                <span className="text-[10px] text-[#f0b90b]">
                  You need at least 0.01 SOL for network fees. Current: {solNativeBalance.toFixed(4)} SOL
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[#f6465d]/10 border border-[#f6465d]/20">
                <Icon icon="ph:warning" width={14} className="text-[#f6465d] mt-0.5 shrink-0" />
                <span className="text-[10px] text-[#f6465d]">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={isTerminal ? handleNewTransfer : handleInitiate}
              disabled={loading || (!isTerminal && (!amount || parseFloat(amount) < 5 || !fromAddress || needsSol))}
              className="w-full py-3 bg-[#f0b90b] hover:bg-[#f0b90b]/90 disabled:bg-[#2b3139] disabled:text-[#4a5056] text-black font-semibold text-sm rounded-xl transition-colors"
            >
              {loading ? (
                <Icon icon="ph:spinner" width={18} className="animate-spin mx-auto" />
              ) : isTerminal ? (
                'New Transfer'
              ) : (
                'Fund Spot Wallet'
              )}
            </button>
          </>
        )}

        {/* === ACTIVE TRANSFER: Progress Tracker === */}
        {isActive && deposit && statusCfg && (
          <>
            {/* Transfer Summary */}
            <div className="bg-[#0b0e11] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#848e9c]">Sending</span>
                <span className="text-xs text-white font-medium">
                  {deposit.depositAmount} {deposit.depositToken || 'USDT'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#848e9c]">Network</span>
                <span className="text-xs text-[#f0b90b] font-medium capitalize">{deposit.depositChain}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#848e9c]">Destination</span>
                <span className="text-xs text-white font-medium">Spot Wallet (USDC)</span>
              </div>
            </div>

            {/* Status Label */}
            <div className="flex items-center gap-2">
              <Icon
                icon={statusCfg.icon}
                width={16}
                className={`${statusCfg.color} ${statusCfg.icon === 'ph:spinner' ? 'animate-spin' : ''}`}
              />
              <span className={`text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-0.5">
              {STAGES.map((stage, i) => {
                const currentIdx = getStageIndex(deposit.status);
                const done = i <= currentIdx;
                return (
                  <div
                    key={stage}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      done ? 'bg-[#0ecb81]' : 'bg-[#2b3139]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Step Labels */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="text-[10px] text-[#848e9c]">
                <Icon icon="ph:paper-plane-tilt" width={12} className="mx-auto mb-0.5" />
                Send USDT
              </div>
              <div className="text-[10px] text-[#848e9c]">
                <Icon icon="ph:arrows-left-right" width={12} className="mx-auto mb-0.5" />
                Convert & Bridge
              </div>
              <div className="text-[10px] text-[#848e9c]">
                <Icon icon="ph:chart-bar" width={12} className="mx-auto mb-0.5" />
                Ready to Trade
              </div>
            </div>

            {/* TX hashes */}
            {(deposit.depositTxHash || deposit.bridgeTxHash) && (
              <div className="space-y-1 text-[10px] text-[#4a5056]">
                {deposit.depositTxHash && (
                  <p>Send TX: <span className="text-[#848e9c] font-mono">{deposit.depositTxHash.slice(0, 12)}...</span></p>
                )}
                {deposit.bridgeTxHash && (
                  <p>Bridge TX: <span className="text-[#848e9c] font-mono">{deposit.bridgeTxHash.slice(0, 12)}...</span></p>
                )}
              </div>
            )}

            {/* Cancel for stuck early-stage deposits */}
            {['initiated', 'sending_usdt'].includes(deposit.status) && (
              <button
                onClick={cancel}
                className="w-full py-2 bg-[#2b3139] hover:bg-[#3b4149] text-[#f6465d] text-xs font-medium rounded-lg transition-colors border border-[#3b4149]"
              >
                Cancel Transfer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
