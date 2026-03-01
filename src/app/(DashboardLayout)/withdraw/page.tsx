"use client";
import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface BankDetail {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

interface DashboardProfile {
  savedBankDetails: BankDetail[];
}

interface WithdrawalStatus {
  _id: string;
  status: string;
  txHash?: string;
  fiatAmount: number;
  completedAt?: string;
}

const STEP_TITLES = [
  "Select Chain & Amount",
  "Bank Details",
  "Confirm & Transfer",
  "Status",
];

const STEP_DESCRIPTIONS = [
  "Choose which blockchain and how much USDT to withdraw",
  "Select or enter your receiving bank account",
  "Verify PIN and transfer USDT to treasury wallet",
  "Monitor your withdrawal status",
];

export default function WithdrawPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 1: Chain + Amount
  const [chain, setChain] = useState<"solana" | "ethereum">("solana");
  const [usdtAmount, setUsdtAmount] = useState("");

  // Step 2: Bank Details
  const [selectedBank, setSelectedBank] = useState("");
  const [newBank, setNewBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  // Step 3: PIN + Transfer
  const [pin, setPin] = useState("");
  const [pinVisible, setPinVisible] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [exchangeRate, setExchangeRate] = useState(0);

  // Step 4: Status polling
  const [withdrawalId, setWithdrawalId] = useState("");
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };
    fetchProfile();
  }, []);

  const handleInitiateWithdrawal = async () => {
    setError("");
    setSuccess("");
    if (!usdtAmount || !chain) {
      setError("Please select chain and amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/withdraw/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdtAmount: parseFloat(usdtAmount), chain }),
      });
      const data = await res.json();
      if (res.ok) {
        setExchangeRate(data.exchangeRate);
        setStep(2);
      } else {
        setError(data.error || "Failed to initiate withdrawal");
      }
    } catch (err) {
      setError("Failed to initiate withdrawal");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBankDetails = () => {
    setError("");
    if (newBank) {
      if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
        setError("Please fill in all bank details");
        return;
      }
    } else if (!selectedBank) {
      setError("Please select a bank account");
      return;
    }
    setStep(3);
  };

  const handleTransferUsdt = async () => {
    setError("");
    setSuccess("");
    if (!pin) {
      setError("Please enter your PIN");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch("/api/withdraw/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash,
          pin,
          usdtAmount: parseFloat(usdtAmount),
          chain,
          bankDetails: newBank ? bankForm : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWithdrawalId(data.withdrawalId);
        setSuccess("USDT transferred successfully! Verifying on blockchain...");
        
        // Start polling status
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/withdraw/status/${data.withdrawalId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              setWithdrawalStatus(statusData);
              
              // Stop polling if completed
              if (["completed", "failed", "cancelled"].includes(statusData.status)) {
                clearInterval(pollInterval);
              }
            }
          } catch (err) {
            console.error("Failed to fetch withdrawal status:", err);
          }
        }, 5000);

        setPollingInterval(pollInterval);
        setStep(4);
      } else {
        setError(data.error || "Transfer failed");
      }
    } catch (err) {
      setError("Transfer failed. Please check and try again.");
      console.error(err);
    } finally {
      setTransferring(false);
    }
  };

  const handleCancelWithdrawal = async () => {
    if (!withdrawalId) return;
    if (!confirm("Are you sure? You cannot cancel after NGN payment begins.")) return;

    try {
      const res = await fetch(`/api/withdraw/status/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (res.ok) {
        setError("");
        setSuccess("Withdrawal cancelled");
        setTimeout(() => setStep(1), 2000);
      } else {
        setError("Cannot cancel at this stage");
      }
    } catch (err) {
      setError("Failed to cancel");
      console.error(err);
    }
  };

  const fiatAmount = exchangeRate > 0 ? (parseFloat(usdtAmount || "0") * exchangeRate * 0.95) : 0;

  return (
    <div className="min-h-screen bg-herobg dark:bg-gradient-to-b dark:from-dark dark:to-darkgray py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-primary hover:underline flex items-center gap-2"
          >
            <Icon icon="tabler:chevron-left" height={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
            Withdraw USDT
          </h1>
          <p className="text-muted">
            Convert your USDT to Nigerian Naira and receive it in your bank account
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8 bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${
                      s < step
                        ? "bg-success text-white"
                        : s === step
                          ? "bg-primary text-white"
                          : "bg-muted/20 text-muted"
                    }`}
                  >
                    {s < step ? <Icon icon="tabler:check" height={18} /> : s}
                  </div>
                  <p className={`text-xs font-medium ${s === step ? "text-primary dark:text-primary" : "text-muted"}`}>
                    {STEP_TITLES[s - 1]}
                  </p>
                  <p className={`text-[10px] ${s === step ? "text-primary/70 dark:text-primary/70" : "text-muted"}`}>
                    {STEP_DESCRIPTIONS[s - 1]}
                  </p>
                </div>
                {s < 4 && (
                  <div className={`h-0.5 flex-1 mx-4 ${s < step ? "bg-success" : "bg-muted/20"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error text-error text-sm flex items-center gap-3">
            <Icon icon="tabler:alert-circle" height={18} className="flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success text-success text-sm flex items-center gap-3">
            <Icon icon="tabler:check-circle" height={18} className="flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white dark:bg-dark rounded-xl border border-border dark:border-darkborder p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-3">
                  Select Blockchain
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "solana", name: "Solana", icon: "mdi:ethereum", color: "text-[#9945FF]" },
                    { id: "ethereum", name: "Ethereum", icon: "mdi:ethereum", color: "text-[#627EEA]" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChain(c.id as "solana" | "ethereum")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        chain === c.id
                          ? "border-primary bg-primary/10"
                          : "border-border dark:border-darkborder bg-herobg dark:bg-darkgray hover:border-primary"
                      }`}
                    >
                      <Icon icon={c.icon} height={24} className={`${c.color} mx-auto mb-2`} />
                      <p className="font-semibold text-dark dark:text-white">{c.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-2">
                  USDT Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full px-4 py-3 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white placeholder-muted"
                  />
                  <span className="absolute right-4 top-3.5 text-muted font-medium">USDT</span>
                </div>
                {usdtAmount && exchangeRate > 0 && (
                  <p className="mt-2 text-sm text-muted">
                    ≈ ₦{fiatAmount.toLocaleString()} NGN (at ₦{exchangeRate.toFixed(2)}/USDT with 5% withdrawal fee)
                  </p>
                )}
              </div>

              <button
                onClick={handleInitiateWithdrawal}
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
                Continue to Bank Details
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {!newBank && profile?.savedBankDetails.length ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-dark dark:text-white mb-3">
                      Select Bank Account
                    </label>
                    <div className="space-y-2">
                      {profile.savedBankDetails.map((bank) => (
                        <button
                          key={`${bank.bankName}-${bank.accountNumber}`}
                          onClick={() =>
                            setSelectedBank(`${bank.bankName}-${bank.accountNumber}`)
                          }
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedBank === `${bank.bankName}-${bank.accountNumber}`
                              ? "border-primary bg-primary/10"
                              : "border-border dark:border-darkborder hover:border-primary"
                          }`}
                        >
                          <p className="font-semibold text-dark dark:text-white">{bank.bankName}</p>
                          <p className="text-sm text-muted">{bank.accountNumber}</p>
                          <p className="text-xs text-muted mt-1">{bank.accountName}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setNewBank(true)}
                    className="text-primary text-sm hover:underline"
                  >
                    + Add New Bank Account
                  </button>
                </>
              ) : null}

              {newBank && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-muted mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-2">Account Number</label>
                    <input
                      type="text"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-2">Account Name</label>
                    <input
                      type="text"
                      value={bankForm.accountName}
                      onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white"
                    />
                  </div>
                  {newBank && profile?.savedBankDetails.length ? (
                    <button
                      onClick={() => setNewBank(false)}
                      className="text-primary text-sm hover:underline"
                    >
                      ← Back to Saved Accounts
                    </button>
                  ) : null}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white font-semibold hover:bg-herobg dark:hover:bg-darkgray transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmBankDetails}
                  className="flex-1 px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                >
                  Continue to Confirm
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-info/10 border border-info">
                <h3 className="font-semibold text-info mb-2">Next Step</h3>
                <ol className="text-sm text-info space-y-1 list-decimal list-inside">
                  <li>Send exactly {usdtAmount} USDT to the treasury wallet below</li>
                  <li>Enter the transaction hash and PIN below</li>
                  <li>We'll verify the transaction on-chain</li>
                  <li>Your NGN will be transferred to your bank account</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-herobg/50 dark:bg-darkgray/50 border border-border dark:border-darkborder">
                <p className="text-xs text-muted mb-2">Treasury {chain === "solana" ? "Solana" : "Ethereum"} Address</p>
                <code className="text-xs text-dark dark:text-white break-all block font-mono bg-white dark:bg-dark p-3 rounded border border-border dark:border-darkborder">
                  treasuryAddressHere...
                </code>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste transaction hash here..."
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white placeholder-muted font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark dark:text-white mb-2">
                  PIN
                </label>
                <div className="relative">
                  <input
                    type={pinVisible ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter your PIN..."
                    className="w-full px-4 py-3 rounded-lg border border-border dark:border-darkborder bg-herobg dark:bg-darkgray text-dark dark:text-white placeholder-muted"
                  />
                  <button
                    onClick={() => setPinVisible(!pinVisible)}
                    className="absolute right-4 top-3.5 text-muted hover:text-dark dark:hover:text-white transition-colors"
                  >
                    <Icon icon={pinVisible ? "tabler:eye-off" : "tabler:eye"} height={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 rounded-lg border border-border dark:border-darkborder text-dark dark:text-white font-semibold hover:bg-herobg dark:hover:bg-darkgray transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleTransferUsdt}
                  disabled={transferring}
                  className="flex-1 px-6 py-3 rounded-lg bg-success text-white font-semibold hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {transferring && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  )}
                  Complete Withdrawal
                </button>
              </div>
            </div>
          )}

          {step === 4 && withdrawalStatus && (
            <div className="space-y-6">
              <div className="text-center">
                {withdrawalStatus.status === "completed" ? (
                  <>
                    <Icon
                      icon="tabler:circle-check"
                      height={48}
                      className="text-success mx-auto mb-4"
                    />
                    <h2 className="text-2xl font-bold text-dark dark:text-white mb-2">
                      Withdrawal Completed!
                    </h2>
                    <p className="text-muted mb-4">
                      ₦{withdrawalStatus.fiatAmount.toLocaleString()} NGN has been sent to your bank account.
                    </p>
                    <p className="text-xs text-muted">
                      {withdrawalStatus.completedAt &&
                        new Date(withdrawalStatus.completedAt).toLocaleString()}
                    </p>
                  </>
                ) : withdrawalStatus.status === "failed" || withdrawalStatus.status === "cancelled" ? (
                  <>
                    <Icon icon="tabler:circle-x" height={48} className="text-error mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-dark dark:text-white mb-2">
                      {withdrawalStatus.status === "failed" ? "Withdrawal Failed" : "Withdrawal Cancelled"}
                    </h2>
                    <p className="text-muted mb-4">
                      Please contact support if you have any questions. Your USDT has been returned.
                    </p>
                  </>
                ) : (
                  <>
                    <Icon
                      icon="tabler:loader-2"
                      height={48}
                      className="text-primary mx-auto mb-4 animate-spin"
                    />
                    <h2 className="text-2xl font-bold text-dark dark:text-white mb-2">
                      Processing Your Withdrawal
                    </h2>
                    <p className="text-muted mb-4">
                      Status: <span className="font-semibold capitalize">{withdrawalStatus.status.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-xs text-muted mb-4">
                      This usually takes 1-2 hours. We'll notify you when your NGN arrives.
                    </p>
                    {withdrawalStatus.txHash && (
                      <a
                        href={
                          chain === "solana"
                            ? `https://solscan.io/tx/${withdrawalStatus.txHash}`
                            : `https://etherscan.io/tx/${withdrawalStatus.txHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs hover:underline inline-block"
                      >
                        View Transaction on {chain === "solana" ? "Solscan" : "Etherscan"}
                      </a>
                    )}
                  </>
                )}
              </div>

              {!["completed", "failed", "cancelled"].includes(withdrawalStatus.status) && (
                <button
                  onClick={handleCancelWithdrawal}
                  className="w-full px-6 py-3 rounded-lg border border-error text-error font-semibold hover:bg-error/10 transition-colors"
                >
                  Cancel Withdrawal
                </button>
              )}

              <Link
                href="/dashboard"
                className="block text-center px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
