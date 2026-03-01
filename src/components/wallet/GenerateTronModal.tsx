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
import { generateTronWallet } from "@/lib/wallet/tronWallet";

interface GenerateTronModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (address: string) => void;
}

type Step = "pin-entry" | "generating" | "success" | "error";

// Modern PIN input
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
            `}
            style={{ caretColor: "transparent" }}
          />
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

export function GenerateTronModal({ isOpen, onClose, onSuccess }: GenerateTronModalProps) {
  const [step, setStep] = useState<Step>("pin-entry");
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generatedAddress, setGeneratedAddress] = useState<string>("");
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("pin-entry");
        setPin(["", "", "", "", "", ""]);
        setError(null);
        setProgress(0);
        setGeneratedAddress("");
      }, 300);
    }
  }, [isOpen]);

  // Auto-focus first PIN input
  useEffect(() => {
    if (step === "pin-entry" && isOpen) {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [step, isOpen]);

  // Simulate progress during generation
  useEffect(() => {
    if (step === "generating") {
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 20, 90));
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length > 0) {
      const newPin = ["", "", "", "", "", ""];
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setPin(newPin);
    }
  };

  const getPinValue = () => pin.join("");

  const handleGenerate = async () => {
    const pinValue = getPinValue();

    if (pinValue.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setStep("generating");
    setError(null);

    try {
      // First, try to get user ID from the auth context
      // We'll call the spot wallets endpoint which handles wallet generation
      const response = await fetch("/api/wallet/add-tron", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinValue,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add Tron wallet");
      }

      // Extract address from response
      const address = data.wallet?.tron?.address || data.address;
      setGeneratedAddress(address);

      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      setStep("success");
      
      setTimeout(() => {
        onSuccess(address);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error("Tron wallet generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate Tron wallet";
      
      // Provide helpful error messages
      if (errorMessage.includes("TronWeb")) {
        setError("TronWeb library not loaded. Please refresh the page and try again.");
      } else if (errorMessage.includes("Invalid PIN")) {
        setError("Invalid PIN. Please try again.");
      } else {
        setError(errorMessage);
      }
      
      setStep("error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && step !== "generating" && onClose()}>
      <DialogContent 
        className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl" 
        showCloseButton={step !== "generating"}
      >
        <div className="p-8">
          {/* PIN Entry */}
          {step === "pin-entry" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-600/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </div>

              <DialogHeader className="text-center mb-8">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Generate Tron Wallet
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Enter your PIN to create a Tron wallet
                </DialogDescription>
              </DialogHeader>

              <div className="mb-8">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 text-center mb-4">
                  Enter your wallet PIN
                </p>
                <PinInput
                  value={pin}
                  onChange={handlePinChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  inputRefs={pinInputRefs}
                  error={!!error}
                />
                {error && (
                  <p className="text-red-500 text-sm text-center mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={getPinValue().length < 4}
                  className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
                >
                  Generate
                </Button>
              </div>
            </div>
          )}

          {/* Generating */}
          {step === "generating" && (
            <div className="animate-in fade-in duration-500 text-center py-8">
              <div className="w-24 h-24 mx-auto mb-8 relative">
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
                    strokeDasharray={`${progress * 2.51} 251`}
                    className="text-red-500 transition-all duration-300"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              <DialogHeader className="text-center">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Creating Tron Wallet
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Generating secure keys and encrypting...
                </DialogDescription>
              </DialogHeader>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-4">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  Tron Wallet Created!
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  Your Tron wallet is ready to use
                </DialogDescription>
              </DialogHeader>

              {generatedAddress && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Address</p>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                    {generatedAddress}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                This dialog will close automatically...
              </p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="animate-in fade-in duration-500 text-center py-4">
              <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>

              <DialogHeader className="text-center mb-6">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-red-600 dark:text-red-400">
                  Generation Failed
                </DialogTitle>
                <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
                  {error || "An error occurred"}
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-xl"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setStep("pin-entry");
                    setError(null);
                    setPin(["", "", "", "", "", ""]);
                  }}
                  className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
