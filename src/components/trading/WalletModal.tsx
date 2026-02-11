"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSolana } from "@/app/context/solanaContext";

// Minimum deposit/withdrawal amount
const MIN_AMOUNT = 5;

// Payment methods
const paymentMethods = [
  {
    id: "p2p",
    name: "P2P Trading",
    icon: "solar:users-group-rounded-bold-duotone",
    description: "Trade with other users",
    fee: "Low fees",
    highlight: true,
  },
  {
    id: "bank",
    name: "Bank Transfer",
    icon: "solar:bank-bold-duotone",
    description: "1-3 business days",
    fee: "Free",
  },
  {
    id: "card",
    name: "Credit/Debit Card",
    icon: "solar:card-bold-duotone",
    description: "Instant",
    fee: "2.5%",
  },
  {
    id: "crypto",
    name: "Crypto Wallet",
    icon: "solar:wallet-bold-duotone",
    description: "~30 minutes",
    fee: "Network fee",
  },
];

// Crypto options for withdrawal
const cryptoOptions = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", icon: "cryptocurrency-color:btc", network: "Bitcoin" },
  { id: "eth", name: "Ethereum", symbol: "ETH", icon: "cryptocurrency-color:eth", network: "ERC-20" },
  { id: "usdt", name: "Tether", symbol: "USDT", icon: "cryptocurrency-color:usdt", network: "TRC-20" },
];

// Quick amount options
const quickAmounts = [100, 250, 500, 1000, 2500, 5000];

interface WalletModalProps {
  trigger?: React.ReactNode;
  defaultTab?: "deposit" | "withdraw";
}

const WalletModal: React.FC<WalletModalProps> = ({ trigger, defaultTab = "deposit" }) => {
  const router = useRouter();
  const { tokenBalances } = useSolana();
  
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">(defaultTab);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("p2p");
  const [selectedCrypto, setSelectedCrypto] = useState("btc");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"amount" | "method" | "confirm" | "success">("amount");
  const [isOpen, setIsOpen] = useState(false);

  // Get USDT balance from Solana network (main wallet)
  const usdtBalance = useMemo(() => {
    const usdtToken = tokenBalances.find(t => t.symbol === "USDT");
    return usdtToken?.amount ?? 0;
  }, [tokenBalances]);

  // USDT is pegged to USD, so balance in USD = token amount
  const availableBalance = usdtBalance;

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setAmount(value);
  };

  const handleContinue = () => {
    const parsedAmount = parseFloat(amount) || 0;
    
    if (step === "amount") {
      // Validate minimum amount
      if (parsedAmount < MIN_AMOUNT) {
        return; // Don't proceed if below minimum
      }
      // For withdrawals, also check sufficient balance
      if (activeTab === "withdraw" && parsedAmount > availableBalance) {
        return;
      }
      setStep("method");
    } else if (step === "method") {
      // If P2P is selected, redirect to the P2P page with amount
      if (selectedMethod === "p2p") {
        setIsOpen(false);
        const url = activeTab === "deposit" 
          ? `/deposit?amount=${parsedAmount}` 
          : `/withdraw?amount=${parsedAmount}`;
        router.push(url);
        return;
      }
      setStep("confirm");
    } else if (step === "confirm") {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === "method") setStep("amount");
    else if (step === "confirm") setStep("method");
  };

  const handleSubmit = () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");
    }, 2000);
  };

  const resetModal = () => {
    setStep("amount");
    setAmount("");
    setSelectedMethod("p2p");
    setCryptoAddress("");
  };

  const getFee = () => {
    if (selectedMethod === "card") return parseFloat(amount) * 0.025;
    return 0;
  };

  const getTotal = () => {
    const fee = getFee();
    return activeTab === "deposit" 
      ? parseFloat(amount || "0") - fee 
      : parseFloat(amount || "0") + fee;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetModal();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-primary hover:bg-primary/90">
            <Icon icon="solar:wallet-bold" className="mr-2 h-4 w-4" />
            Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-white dark:bg-black border-0 shadow-2xl rounded-3xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-dark dark:text-white">
                {step === "success" ? "Success!" : "Wallet"}
              </DialogTitle>
              <DialogDescription className="text-muted">
                {step === "success" 
                  ? "Your transaction has been submitted"
                  : `Available balance: $${availableBalance.toLocaleString()}`
                }
              </DialogDescription>
            </div>
            {step !== "success" && (
              <div className="flex items-center gap-1">
                {["amount", "method", "confirm"].map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      step === s || ["method", "confirm"].indexOf(step) > i - 1
                        ? "bg-primary w-6"
                        : "bg-gray-200 dark:bg-darkgray"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {step !== "success" && step !== "confirm" && (
          <div className="px-6">
            <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val as "deposit" | "withdraw");
              setStep("amount");
            }}>
              <TabsList className="w-full bg-gray-100 dark:bg-darkgray/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="deposit" 
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-dark data-[state=active]:shadow-sm"
                >
                  <Icon icon="solar:arrow-down-bold" className="mr-2 h-4 w-4" />
                  Deposit
                </TabsTrigger>
                <TabsTrigger 
                  value="withdraw"
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-dark data-[state=active]:shadow-sm"
                >
                  <Icon icon="solar:arrow-up-bold" className="mr-2 h-4 w-4" />
                  Withdraw
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Content */}
        <div className="p-6 pt-4">
          {/* Step 1: Amount */}
          {step === "amount" && (
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-dark dark:text-white">
                  {activeTab === "deposit" ? "Deposit Amount" : "Withdraw Amount"}
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-dark dark:text-white">
                    $
                  </span>
                  <Input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="pl-10 pr-4 h-16 text-3xl font-bold border-2 border-gray-200 dark:border-darkborder rounded-2xl focus:border-primary dark:bg-darkgray/30 text-dark dark:text-white"
                  />
                </div>
                {parseFloat(amount) > 0 && parseFloat(amount) < MIN_AMOUNT && (
                  <p className="text-xs text-error flex items-center gap-1">
                    <Icon icon="solar:danger-circle-bold" className="h-4 w-4" />
                    Minimum amount is ${MIN_AMOUNT}
                  </p>
                )}
                {activeTab === "withdraw" && parseFloat(amount) > availableBalance && (
                  <p className="text-xs text-error flex items-center gap-1">
                    <Icon icon="solar:danger-circle-bold" className="h-4 w-4" />
                    Insufficient balance
                  </p>
                )}
              </div>

              {/* Quick Amounts */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted uppercase tracking-wider">
                  Quick Select
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleQuickAmount(value)}
                      className={cn(
                        "py-3 px-4 rounded-xl text-sm font-semibold transition-all",
                        amount === value.toString()
                          ? "bg-primary text-white"
                          : "bg-gray-100 dark:bg-darkgray/50 text-dark dark:text-white hover:bg-primary/10"
                      )}
                    >
                      ${value.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "withdraw" && (
                <button 
                  onClick={() => setAmount(availableBalance.toString())}
                  className="w-full text-center text-sm text-primary font-medium hover:underline"
                >
                  Withdraw all (${availableBalance.toLocaleString()})
                </button>
              )}
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === "method" && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-dark dark:text-white">
                {activeTab === "deposit" ? "Payment Method" : "Withdrawal Method"}
              </Label>
              
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                      selectedMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 dark:border-darkborder hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      selectedMethod === method.id ? "bg-primary/10" : "bg-gray-100 dark:bg-darkgray/50"
                    )}>
                      <Icon 
                        icon={method.icon} 
                        className={cn(
                          "h-6 w-6",
                          selectedMethod === method.id ? "text-primary" : "text-muted"
                        )} 
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-dark dark:text-white">{method.name}</p>
                        {"highlight" in method && method.highlight && (
                          <Badge className="bg-primary text-white text-[10px] px-1.5 py-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted">{method.description}</p>
                    </div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs border-0 rounded-full",
                        method.fee === "Free" 
                          ? "bg-success/10 text-success" 
                          : method.fee === "Low fees"
                          ? "bg-primary/10 text-primary"
                          : "bg-gray-100 dark:bg-darkgray/50 text-muted"
                      )}
                    >
                      {method.fee}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Crypto Wallet Selection */}
              {selectedMethod === "crypto" && activeTab === "withdraw" && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium text-dark dark:text-white">
                    Select Cryptocurrency
                  </Label>
                  <div className="flex gap-2">
                    {cryptoOptions.map((crypto) => (
                      <button
                        key={crypto.id}
                        onClick={() => setSelectedCrypto(crypto.id)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                          selectedCrypto === crypto.id
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 dark:border-darkborder"
                        )}
                      >
                        <Icon icon={crypto.icon} className="h-6 w-6" />
                        <span className="text-xs font-semibold text-dark dark:text-white">
                          {crypto.symbol}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-dark dark:text-white">
                      Wallet Address
                    </Label>
                    <Input
                      type="text"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      placeholder={`Enter your ${cryptoOptions.find(c => c.id === selectedCrypto)?.symbol} address`}
                      className="h-12 rounded-xl border-2 border-gray-200 dark:border-darkborder dark:bg-darkgray/30"
                    />
                    <p className="text-xs text-muted">
                      Network: {cryptoOptions.find(c => c.id === selectedCrypto)?.network}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-darkgray/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Transaction Type</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-sm font-semibold border-0 rounded-full px-3",
                      activeTab === "deposit" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}
                  >
                    {activeTab === "deposit" ? "Deposit" : "Withdrawal"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Amount</span>
                  <span className="font-semibold text-dark dark:text-white">
                    ${parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Payment Method</span>
                  <span className="font-medium text-dark dark:text-white">
                    {paymentMethods.find(m => m.id === selectedMethod)?.name}
                  </span>
                </div>
                {getFee() > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Fee (2.5%)</span>
                    <span className="font-medium text-error">
                      -${getFee().toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 dark:border-darkborder pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-dark dark:text-white">
                      {activeTab === "deposit" ? "You'll receive" : "You'll pay"}
                    </span>
                    <span className="text-2xl font-bold text-dark dark:text-white">
                      ${getTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-xl">
                <Icon icon="solar:info-circle-bold" className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  {activeTab === "deposit" 
                    ? "Deposits are typically processed within 1-3 business days for bank transfers, or instantly for card payments."
                    : "Withdrawals are subject to security verification and may take up to 24 hours to process."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                <Icon icon="solar:check-circle-bold" className="h-10 w-10 text-success" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-dark dark:text-white mb-2">
                  {activeTab === "deposit" ? "Deposit Initiated!" : "Withdrawal Submitted!"}
                </h3>
                <p className="text-muted">
                  {activeTab === "deposit"
                    ? `$${parseFloat(amount).toLocaleString()} is being processed`
                    : `$${parseFloat(amount).toLocaleString()} withdrawal is pending`
                  }
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-darkgray/30 rounded-2xl p-4">
                <p className="text-xs text-muted mb-1">Transaction ID</p>
                <p className="font-mono text-sm text-dark dark:text-white">
                  TXN-{Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 space-y-3">
          {step !== "success" ? (
            <div className="flex gap-3">
              {step !== "amount" && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-12 rounded-xl border-2"
                >
                  <Icon icon="solar:arrow-left-linear" className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleContinue}
                disabled={
                  (step === "amount" && (!amount || parseFloat(amount) <= 0)) ||
                  (step === "amount" && activeTab === "withdraw" && parseFloat(amount) > availableBalance) ||
                  (step === "method" && selectedMethod === "crypto" && activeTab === "withdraw" && !cryptoAddress) ||
                  isProcessing
                }
                className={cn(
                  "flex-1 h-12 rounded-xl font-semibold text-white",
                  step === "confirm"
                    ? activeTab === "deposit"
                      ? "bg-success hover:bg-success/90"
                      : "bg-warning hover:bg-warning/90"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {isProcessing ? (
                  <>
                    <Icon icon="solar:spinner-line-duotone" className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : step === "confirm" ? (
                  <>
                    <Icon icon="solar:check-circle-bold" className="mr-2 h-4 w-4" />
                    Confirm {activeTab === "deposit" ? "Deposit" : "Withdrawal"}
                  </>
                ) : (
                  <>
                    Continue
                    <Icon icon="solar:arrow-right-linear" className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={resetModal}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            >
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;
