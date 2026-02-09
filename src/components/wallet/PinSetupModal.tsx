"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/app/context/walletContext";
import { generateAllWallets } from "@/lib/wallet";
import { hashPIN } from "@/lib/wallet/encryption";

type SetupStep = "warning" | "pin-entry" | "generating" | "success";

// Coinbase-style step indicator
function StepIndicator({ currentStep }: { currentStep: SetupStep }) {
  const steps = ["warning", "pin-entry", "generating", "success"];
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div
          key={step}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            index <= currentIndex
              ? "w-8 bg-blue-500"
              : "w-2 bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

// Animated icon wrapper
function IconWrapper({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  const bgColors = {
    default: "bg-blue-50 dark:bg-blue-500/10",
    warning: "bg-amber-50 dark:bg-amber-500/10", 
    success: "bg-emerald-50 dark:bg-emerald-500/10",
  };
  
  return (
    <div className={`
      w-20 h-20 rounded-2xl ${bgColors[variant]} 
      flex items-center justify-center mx-auto mb-6
      animate-in fade-in zoom-in-75 duration-500
    `}>
      {children}
    </div>
  );
}

// Modern PIN input with glow effect
function PinInput({
  value,
  onChange,
  onKeyDown,
  onPaste,
  inputRefs,
  disabled = false,
  error = false,
}: {
  value: string[];
  onChange: (index: number, val: string) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex justify-center gap-3">
      {value.map((digit, index) => (
        <div key={index} className="relative group">
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onPaste={onPaste}
            disabled={disabled}
            className={`
              w-14 h-16 text-center text-2xl font-semibold
              bg-white dark:bg-gray-800/50
              border-2 rounded-xl
              transition-all duration-200 ease-out
              outline-none
              ${digit ? "border-blue-500 dark:border-blue-400" : "border-gray-200 dark:border-gray-700"}
              ${error ? "border-red-400 dark:border-red-500 animate-shake" : ""}
              focus:border-blue-500 dark:focus:border-blue-400
              focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20
              focus:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed
              placeholder:text-gray-300
            `}
            style={{
              caretColor: "transparent",
            }}
          />
          {/* Dot indicator when filled */}
          {digit && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-gray-800 dark:bg-white animate-in fade-in zoom-in duration-150" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Wallet chain badge
function ChainBadge({ name, symbol, color }: { name: string; symbol: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center`}>
        <span className="text-white text-sm font-bold">{symbol}</span>
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
    </div>
  );
}

export function PinSetupModal() {
  const { showPinSetupModal, closePinSetupModal, onWalletSetupComplete } = useWallet();
  
  const [step, setStep] = useState<SetupStep>("warning");
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!showPinSetupModal) {
      setTimeout(() => {
        setStep("warning");
        setPin(["", "", "", "", "", ""]);
        setConfirmPin(["", "", "", "", "", ""]);
        setError(null);
        setIsProcessing(false);
        setGenerationProgress(0);
      }, 300);
    }
  }, [showPinSetupModal]);

  // Auto-focus first PIN input
  useEffect(() => {
    if (step === "pin-entry") {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // Simulate progress during generation
  useEffect(() => {
    if (step === "generating") {
      const interval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + Math.random() * 15, 90));
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handlePinChange = (index: number, value: string, isConfirm: boolean = false) => {
    if (value && !/^\d$/.test(value)) return;

    const targetPin = isConfirm ? confirmPin : pin;
    const setTargetPin = isConfirm ? setConfirmPin : setPin;
    const refs = isConfirm ? confirmPinInputRefs : pinInputRefs;

    const newPin = [...targetPin];
    newPin[index] = value;
    setTargetPin(newPin);
    setError(null);

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, isConfirm: boolean = false) => {
    const refs = isConfirm ? confirmPinInputRefs : pinInputRefs;
    const targetPin = isConfirm ? confirmPin : pin;

    if (e.key === "Backspace" && !targetPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, isConfirm: boolean = false) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length > 0) {
      const setTargetPin = isConfirm ? setConfirmPin : setPin;
      const newPin = ["", "", "", "", "", ""];
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setTargetPin(newPin);
    }
  };

  const getPinValue = () => pin.join("");
  const getConfirmPinValue = () => confirmPin.join("");

  const handleGenerateWallets = async () => {
    const pinValue = getPinValue();
    const confirmPinValue = getConfirmPinValue();

    if (pinValue.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (pinValue !== confirmPinValue) {
      setError("PINs do not match");
      return;
    }

    setIsProcessing(true);
    setStep("generating");
    setError(null);

    try {
      const wallets = await generateAllWallets(pinValue);
      const pinHash = hashPIN(pinValue);

      const response = await fetch("/api/wallet/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallets: {
            solana: { address: wallets.solana.address, encryptedPrivateKey: wallets.solana.encryptedPrivateKey },
            ethereum: { address: wallets.ethereum.address, encryptedPrivateKey: wallets.ethereum.encryptedPrivateKey },
            bitcoin: { address: wallets.bitcoin.address, encryptedPrivateKey: wallets.bitcoin.encryptedPrivateKey },
          },
          pinHash,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to save wallets");

      setGenerationProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep("success");
      
      onWalletSetupComplete({
        solana: wallets.solana.address,
        ethereum: wallets.ethereum.address,
        bitcoin: wallets.bitcoin.address,
      });

      setTimeout(() => closePinSetupModal(), 3000);
      
    } catch (err) {
      console.error("Wallet generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate wallets");
      setStep("pin-entry");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={showPinSetupModal} onOpenChange={(open) => !open && step !== "generating" && closePinSetupModal()}>
      <DialogContent 
        className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl" 
        showCloseButton={step !== "generating"}
      >
        <div className="p-8">
          <StepIndicator currentStep={step} />

          {/* Step 1: Warning */}
          {step === "warning" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <IconWrapper variant="warning">
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </IconWrapper>

              <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Secure Your Wallets
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Create a PIN to encrypt your private keys
                </DialogDescription>
              </DialogHeader>

              {/* Warning card */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-2xl p-5 mb-6 border border-red-100 dark:border-red-900/50">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-300 mb-1">
                      No recovery possible
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                      If you lose your PIN, your funds are <span className="font-semibold">permanently lost</span>. 
                      We never store your PIN and cannot help you recover it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Wallets to be created */}
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Wallets to be created
              </p>
              <div className="grid grid-cols-3 gap-2 mb-8">
                <ChainBadge name="Solana" symbol="SOL" color="bg-gradient-to-br from-purple-500 to-blue-500" />
                <ChainBadge name="Ethereum" symbol="ETH" color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                <ChainBadge name="Bitcoin" symbol="BTC" color="bg-gradient-to-br from-orange-400 to-orange-600" />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closePinSetupModal}
                  className="flex-1 h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Set Up Later
                </Button>
                <Button
                  onClick={() => setStep("pin-entry")}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: PIN Entry */}
          {step === "pin-entry" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <IconWrapper>
                <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </IconWrapper>

              <DialogHeader className="text-center mb-8">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Create Your PIN
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Enter a 4-6 digit PIN
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-8">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-4">
                    Enter PIN
                  </p>
                  <PinInput
                    value={pin}
                    onChange={(i, v) => handlePinChange(i, v, false)}
                    onKeyDown={(e, i) => handleKeyDown(e, i, false)}
                    onPaste={(e) => handlePaste(e, false)}
                    inputRefs={pinInputRefs}
                    disabled={isProcessing}
                    error={!!error}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-4">
                    Confirm PIN
                  </p>
                  <PinInput
                    value={confirmPin}
                    onChange={(i, v) => handlePinChange(i, v, true)}
                    onKeyDown={(e, i) => handleKeyDown(e, i, true)}
                    onPaste={(e) => handlePaste(e, true)}
                    inputRefs={confirmPinInputRefs}
                    disabled={isProcessing}
                    error={!!error}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep("warning")}
                  className="flex-1 h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerateWallets}
                  disabled={getPinValue().length < 4 || getConfirmPinValue().length < 4}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                >
                  Create Wallets
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === "generating" && (
            <div className="animate-in fade-in duration-500 text-center py-8">
              <div className="w-24 h-24 mx-auto mb-8 relative">
                {/* Spinning ring */}
                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${generationProgress * 2.51} 251`}
                    className="text-blue-500 transition-all duration-300"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                {/* Center percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                    {Math.round(generationProgress)}%
                  </span>
                </div>
              </div>

              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Creating Your Wallets
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Generating secure keys and encrypting with your PIN...
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 space-y-2">
                <div className={`text-sm ${generationProgress > 20 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"} transition-colors`}>
                  {generationProgress > 20 ? "✓" : "○"} Generating Solana keypair
                </div>
                <div className={`text-sm ${generationProgress > 45 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"} transition-colors`}>
                  {generationProgress > 45 ? "✓" : "○"} Generating Ethereum wallet
                </div>
                <div className={`text-sm ${generationProgress > 70 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"} transition-colors`}>
                  {generationProgress > 70 ? "✓" : "○"} Generating Bitcoin address
                </div>
                <div className={`text-sm ${generationProgress > 90 ? "text-gray-700 dark:text-gray-300" : "text-gray-400"} transition-colors`}>
                  {generationProgress > 90 ? "✓" : "○"} Encrypting & securing
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === "success" && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
              <IconWrapper variant="success">
                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </IconWrapper>

              <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  Wallets Created!
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Your crypto wallets are now ready to use
                </DialogDescription>
              </DialogHeader>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/50">
                <div className="flex items-center gap-3 justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    Your keys are encrypted and secure
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-6">
                This dialog will close automatically...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
