'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useSpotDeposit, type DepositInfo } from '@/hooks/useSpotDeposit';
import { useWallet } from '@/app/context/walletContext';
import { useSolana } from '@/app/context/solanaContext';
import { useEvm } from '@/app/context/evmContext';
import { useTron } from '@/app/context/tronContext';

interface SpotDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositComplete?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  initiated: { label: "Initializing...", icon: "ph:spinner", color: "text-[#848e9c]" },
  sending_usdt: { label: "Sending USDT to treasury...", icon: "ph:spinner", color: "text-[#f0b90b]" },
  awaiting_deposit: { label: "USDT sent, waiting for confirmation...", icon: "ph:clock", color: "text-[#f0b90b]" },
  deposit_detected: { label: "Deposit detected!", icon: "ph:check-circle", color: "text-[#0ecb81]" },
  disbursing: { label: "Converting to Arb USDC...", icon: "ph:spinner", color: "text-[#f0b90b]" },
  disbursed: { label: "USDC received, bridging...", icon: "ph:spinner", color: "text-[#f0b90b]" },
  bridging: { label: "Depositing to Hyperliquid...", icon: "ph:spinner", color: "text-[#f0b90b]" },
  transferring: { label: "Transferring to Spot wallet...", icon: "ph:spinner", color: "text-[#f0b90b]" },
  completed: { label: "Ready to trade!", icon: "ph:check-circle-fill", color: "text-[#0ecb81]" },
  failed: { label: "Deposit failed", icon: "ph:x-circle", color: "text-[#f6465d]" },
  expired: { label: "Deposit expired", icon: "ph:clock-countdown", color: "text-[#f6465d]" },
};

const STAGES = [
  "sending_usdt",
  "awaiting_deposit",
  "deposit_detected",
  "disbursing",
  "disbursed",
  "bridging",
  "transferring",
  "completed",
];

// Ethereum USDT contract address
const ETH_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

function getStageIndex(status: string): number {
  const idx = STAGES.indexOf(status);
  return idx === -1 ? 0 : idx;
}

export default function SpotDepositModal({ isOpen, onClose, onDepositComplete }: SpotDepositModalProps) {
  const { deposit, loading, error, initiate, resumePolling, reset, cancel } = useSpotDeposit();
  const { addresses, isLoading: walletsLoading } = useWallet();
  const { getUsdtBalance: getSolUsdtBalance, balance: solNativeBalance, loading: solLoading } = useSolana();
  const { tokenBalances: ethTokenBalances, loading: evmLoading } = useEvm();
  const { tokenBalances: tronTokenBalances, balance: tronNativeBalance, loading: tronLoading } = useTron();

  // Form state
  const [chain, setChain] = useState<"ethereum" | "solana" | "tron">("ethereum");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  // Derive wallet address from context based on selected chain
  const fromAddress = useMemo(() => {
    if (!addresses) return "";
    if (chain === "ethereum") return addresses.ethereum;
    if (chain === "solana") return addresses.solana;
    return addresses.tron;
  }, [chain, addresses]);

  // Compute USDT balances for all chains
  const solUsdtBalance = useMemo(() => getSolUsdtBalance(), [getSolUsdtBalance]);
  const ethUsdtBalance = useMemo(() => {
    const usdt = ethTokenBalances.find(
      (t) => t.address.toLowerCase() === ETH_USDT_ADDRESS.toLowerCase()
    );
    return usdt?.amount ?? 0;
  }, [ethTokenBalances]);
  const tronUsdtBalance = useMemo(() => {
    const usdt = tronTokenBalances.find(
      (t) => t.symbol === "USDT"
    );
    return usdt?.amount ?? 0;
  }, [tronTokenBalances]);

  // Active chain balance (used for max button & validation)
  const usdtBalance = chain === "solana" ? solUsdtBalance : chain === "tron" ? tronUsdtBalance : ethUsdtBalance;
  const balanceLoading = chain === "solana" ? solLoading : chain === "tron" ? tronLoading : evmLoading;

  // Check if user has enough native token for transaction fees
  const needsGas =
    (chain === "solana" && solNativeBalance < 0.01) ||
    (chain === "tron" && tronNativeBalance < 30);

  // Resume polling on mount
  useEffect(() => {
    if (isOpen) {
      resumePolling();
    }
  }, [isOpen, resumePolling]);

  // Notify parent on completion
  useEffect(() => {
    if (deposit?.status === "completed" && onDepositComplete) {
      onDepositComplete();
    }
  }, [deposit?.status, onDepositComplete]);

  if (!isOpen) return null;

  const handleInitiate = async () => {
    if (!amount || parseFloat(amount) < 5) return;
    if (!fromAddress) return;

    await initiate({
      depositChain: chain,
      depositAmount: parseFloat(amount),
      depositFromAddress: fromAddress,
      depositToken: "USDT",
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewDeposit = () => {
    reset();
    setAmount("");
  };

  const handleMax = () => {
    if (usdtBalance > 0) {
      setAmount(String(usdtBalance));
    }
  };

  const isActive = deposit && !["completed", "failed", "expired"].includes(deposit.status);
  const isTerminal = deposit && ["completed", "failed", "expired"].includes(deposit.status);
  const showForm = !deposit || isTerminal;
  const statusCfg = deposit ? STATUS_CONFIG[deposit.status] || STATUS_CONFIG.initiated : null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1e2329] rounded-2xl border border-[#2b3139] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b3139]">
          <h2 className="text-base font-semibold text-white">Deposit to Spot Wallet</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2b3139] transition-colors"
          >
            <Icon icon="ph:x" width={20} className="text-[#848e9c]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* FORM: Show when no active deposit */}
          {showForm && (
            <>
              {isTerminal && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  deposit?.status === "completed" ? "bg-[#0ecb81]/10" : "bg-[#f6465d]/10"
                }`}>
                  <Icon
                    icon={statusCfg?.icon || "ph:info"}
                    width={18}
                    className={statusCfg?.color || "text-white"}
                  />
                  <span className={`text-sm ${statusCfg?.color}`}>
                    {statusCfg?.label}
                    {deposit?.errorMessage && (
                      <span className="block text-xs text-[#848e9c] mt-1">{deposit.errorMessage}</span>
                    )}
                  </span>
                </div>
              )}

              {/* Network Selection */}
              <div>
                <label className="block text-xs text-[#848e9c] mb-2">Send USDT from</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ethereum", "solana", "tron"] as const).map((c) => {
                    const chainConfig = {
                      ethereum: { icon: "cryptocurrency:eth", label: "Ethereum" },
                      solana: { icon: "cryptocurrency:sol", label: "Solana" },
                      tron: { icon: "cryptocurrency:trx", label: "Tron" },
                    };
                    const cfg = chainConfig[c];
                    return (
                      <button
                        key={c}
                        onClick={() => setChain(c)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors ${
                          chain === c
                            ? "border-[#f0b90b] bg-[#f0b90b]/10 text-[#f0b90b]"
                            : "border-[#2b3139] text-[#848e9c] hover:border-[#3b4149]"
                        }`}
                      >
                        <Icon icon={cfg.icon} width={18} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#848e9c]">Amount (USDT)</label>
                  <button
                    type="button"
                    onClick={handleMax}
                    disabled={usdtBalance <= 0}
                    className="text-xs text-[#f0b90b] hover:text-[#f0b90b]/80 disabled:text-[#4a5056] disabled:cursor-not-allowed"
                  >
                    Max
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min 5 USDT"
                    min={5}
                    className="w-full px-3 py-3 bg-[#0b0e11] border border-[#2b3139] rounded-lg text-sm text-white placeholder:text-[#4a5056] focus:outline-none focus:border-[#f0b90b]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#848e9c]">USDT</span>
                </div>
                {amount && parseFloat(amount) < 5 && (
                  <p className="text-xs text-[#f6465d] mt-1">Minimum deposit is 5 USDT</p>
                )}
              </div>

              {/* Wallet Address (auto-fetched) */}
              <div>
                <label className="block text-xs text-[#848e9c] mb-2">
                  Your {chain === "ethereum" ? "Ethereum" : chain === "solana" ? "Solana" : "Tron"} wallet
                </label>
                {walletsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-3 bg-[#0b0e11] border border-[#2b3139] rounded-lg">
                    <Icon icon="ph:spinner" width={14} className="animate-spin text-[#848e9c]" />
                    <span className="text-xs text-[#4a5056]">Loading wallet...</span>
                  </div>
                ) : fromAddress ? (
                  <div className="bg-[#0b0e11] border border-[#2b3139] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-white font-mono truncate max-w-65">
                        {fromAddress}
                      </code>
                      <button
                        onClick={() => handleCopy(fromAddress)}
                        className="p-1 rounded hover:bg-[#2b3139] transition-colors ml-2"
                      >
                        <Icon
                          icon={copied ? "ph:check" : "ph:copy"}
                          width={14}
                          className={copied ? "text-[#0ecb81]" : "text-[#848e9c]"}
                        />
                      </button>
                    </div>

                    {/* All chain balances */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4a5056] flex items-center gap-1">
                        <Icon icon="cryptocurrency:eth" width={12} />
                        Ethereum USDT
                      </span>
                      <span className={`text-xs font-medium ${chain === "ethereum" ? "text-white" : "text-[#848e9c]"}`}>
                        {evmLoading ? (
                          <Icon icon="ph:spinner" width={12} className="animate-spin inline" />
                        ) : (
                          `${ethUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4a5056] flex items-center gap-1">
                        <Icon icon="cryptocurrency:sol" width={12} />
                        Solana USDT
                      </span>
                      <span className={`text-xs font-medium ${chain === "solana" ? "text-white" : "text-[#848e9c]"}`}>
                        {solLoading ? (
                          <Icon icon="ph:spinner" width={12} className="animate-spin inline" />
                        ) : (
                          `${solUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4a5056] flex items-center gap-1">
                        <Icon icon="cryptocurrency:trx" width={12} />
                        Tron USDT
                      </span>
                      <span className={`text-xs font-medium ${chain === "tron" ? "text-white" : "text-[#848e9c]"}`}>
                        {tronLoading ? (
                          <Icon icon="ph:spinner" width={12} className="animate-spin inline" />
                        ) : (
                          `${tronUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-3 bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg">
                    <Icon icon="ph:warning" width={14} className="text-[#f6465d]" />
                    <span className="text-xs text-[#f6465d]">No {chain === "ethereum" ? "Ethereum" : chain === "solana" ? "Solana" : "Tron"} wallet found</span>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-[#f6465d]">{error}</p>
              )}

              {/* Gas fee warning */}
              {needsGas && !error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#f0b90b]/10 border border-[#f0b90b]/20">
                  <Icon icon="ph:warning-fill" width={16} className="text-[#f0b90b] mt-0.5 shrink-0" />
                  <span className="text-xs text-[#f0b90b]">
                    {chain === "solana"
                      ? `You need at least 0.01 SOL for Solana network fees. Your current balance is ${solNativeBalance.toFixed(4)} SOL. Please send some SOL to your wallet before depositing.`
                      : `You need at least 30 TRX for Tron network energy fees. Your current balance is ${tronNativeBalance.toFixed(2)} TRX. Please send some TRX to your wallet before depositing.`
                    }
                  </span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={isTerminal ? handleNewDeposit : handleInitiate}
                disabled={loading || (!isTerminal && (!amount || parseFloat(amount) < 5 || !fromAddress || needsGas))}
                className="w-full py-3 bg-[#f0b90b] hover:bg-[#f0b90b]/90 disabled:bg-[#2b3139] disabled:text-[#4a5056] text-black font-semibold text-sm rounded-lg transition-colors"
              >
                {loading ? (
                  <Icon icon="ph:spinner" width={18} className="animate-spin mx-auto" />
                ) : isTerminal ? (
                  "New Deposit"
                ) : (
                  "Deposit"
                )}
              </button>
            </>
          )}

          {/* ACTIVE DEPOSIT: Show progress tracker */}
          {isActive && deposit && (
            <>
              {/* Deposit Summary */}
              <div className="bg-[#0b0e11] rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848e9c]">Amount</span>
                  <span className="text-xs text-white font-medium">
                    {deposit.depositAmount} {deposit.depositToken || "USDT"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#848e9c]">Network</span>
                  <span className="text-xs text-[#f0b90b] font-medium capitalize">
                    {deposit.depositChain}
                  </span>
                </div>
                {deposit.depositTxHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#848e9c]">Send TX</span>
                    <span className="text-xs text-[#848e9c] font-mono">
                      {deposit.depositTxHash.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Tracker */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    icon={statusCfg?.icon || "ph:spinner"}
                    width={18}
                    className={`${statusCfg?.color} ${
                      ["ph:spinner"].includes(statusCfg?.icon || "")
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  <span className={`text-sm font-medium ${statusCfg?.color}`}>
                    {statusCfg?.label}
                  </span>
                </div>

                {/* Stage Progress Bar */}
                <div className="flex gap-1">
                  {STAGES.map((stage, i) => {
                    const currentIdx = getStageIndex(deposit.status);
                    const done = i <= currentIdx;
                    return (
                      <div
                        key={stage}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          done ? "bg-[#0ecb81]" : "bg-[#2b3139]"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Step labels */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="text-[10px] text-[#848e9c]">
                    <Icon icon="ph:paper-plane-tilt" width={14} className="mx-auto mb-1" />
                    Sending USDT
                  </div>
                  <div className="text-[10px] text-[#848e9c]">
                    <Icon icon="ph:arrows-left-right" width={14} className="mx-auto mb-1" />
                    Convert & Bridge
                  </div>
                  <div className="text-[10px] text-[#848e9c]">
                    <Icon icon="ph:chart-bar" width={14} className="mx-auto mb-1" />
                    Ready to Trade
                  </div>
                </div>
              </div>

              {/* TX Hashes */}
              {(deposit.depositTxHash || deposit.disburseTxHash || deposit.bridgeTxHash) && (
                <div className="space-y-1 text-xs text-[#4a5056]">
                  {deposit.depositTxHash && (
                    <p>Deposit TX: <span className="text-[#848e9c] font-mono">{deposit.depositTxHash.slice(0, 16)}...</span></p>
                  )}
                  {deposit.disburseTxHash && (
                    <p>Disburse TX: <span className="text-[#848e9c] font-mono">{deposit.disburseTxHash.slice(0, 16)}...</span></p>
                  )}
                  {deposit.bridgeTxHash && (
                    <p>Bridge TX: <span className="text-[#848e9c] font-mono">{deposit.bridgeTxHash.slice(0, 16)}...</span></p>
                  )}
                </div>
              )}

              {/* Cancel button for stuck early-stage deposits */}
              {["initiated", "sending_usdt"].includes(deposit.status) && (
                <button
                  onClick={cancel}
                  className="w-full py-2.5 bg-[#2b3139] hover:bg-[#3b4149] text-[#f6465d] text-xs font-medium rounded-lg transition-colors border border-[#3b4149]"
                >
                  Cancel Deposit
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
