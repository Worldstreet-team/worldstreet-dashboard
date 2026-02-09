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
import { hashPIN } from "@/lib/wallet/encryption";

interface PinEntryModalProps {
  onSuccess: (pinHash: string, pin: string) => void;
  title?: string;
  description?: string;
}

// Modern PIN input with glow effect (matching the setup modal)
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
              ${error ? "border-red-400 dark:border-red-500" : ""}
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

export function PinEntryModal({
  onSuccess,
  title = "Enter Your PIN",
  description = "Enter your PIN to authorize this action",
}: PinEntryModalProps) {
  const { showPinEntryModal, closePinEntryModal } = useWallet();
  
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!showPinEntryModal) {
      setTimeout(() => {
        setPin(["", "", "", "", "", ""]);
        setError(null);
        setIsVerifying(false);
        setShake(false);
      }, 300);
    } else {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [showPinEntryModal]);

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);
    setShake(false);

    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
    
    if (e.key === "Enter" && getPinValue().length >= 4) {
      handleVerify();
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

  const getPinValue = () => pin.filter(d => d).join("");

  const handleVerify = async () => {
    const pinValue = getPinValue();

    if (pinValue.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const pinHash = hashPIN(pinValue);
      
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinHash }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Incorrect PIN");
      }

      onSuccess(pinHash, pinValue);
      closePinEntryModal();
      
    } catch (err) {
      console.error("PIN verification error:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
      setShake(true);
      setPin(["", "", "", "", "", ""]);
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
        setShake(false);
      }, 500);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={showPinEntryModal} onOpenChange={(open) => !open && !isVerifying && closePinEntryModal()}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl" 
        showCloseButton={!isVerifying}
      >
        <div className="p-8">
          {/* Icon */}
          <div className={`
            w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-500/10
            flex items-center justify-center mx-auto mb-6
            animate-in fade-in zoom-in-75 duration-500
            ${shake ? "animate-shake" : ""}
          `}>
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>

          <DialogHeader className="text-center mb-8">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-500 dark:text-gray-400 mt-2">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* PIN Input */}
          <div className={`mb-6 ${shake ? "animate-shake" : ""}`}>
            <PinInput
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              inputRefs={pinInputRefs}
              disabled={isVerifying}
              error={!!error}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={closePinEntryModal}
              disabled={isVerifying}
              className="flex-1 h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={getPinValue().length < 4 || isVerifying}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              {isVerifying ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </div>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>

          {/* Forgot PIN hint */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
            Forgot your PIN? Unfortunately, there&apos;s no recovery option.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
