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
import { decryptWithPIN } from "@/lib/wallet/encryption";

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

interface PinUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (pin: string) => void;
  title?: string;
  description?: string;
}

export function PinUnlockModal({
  isOpen,
  onClose,
  onUnlock,
  title = "Enter Your PIN",
  description = "Unlock your wallet to continue"
}: PinUnlockModalProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPin(["", "", "", "", "", ""]);
        setError(null);
        setIsVerifying(false);
      }, 300);
    } else {
      // Auto-focus first input when modal opens
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullPin = [...newPin].join("");
      if (fullPin.length >= 4) {
        handleUnlock(fullPin);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      const pinValue = pin.join("");
      if (pinValue.length >= 4) {
        handleUnlock(pinValue);
      }
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
      
      // Auto-submit if full PIN pasted
      if (pastedData.length >= 4) {
        handleUnlock(pastedData);
      }
    }
  };

  const handleUnlock = async (pinValue: string) => {
    if (pinValue.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Verify PIN by attempting to decrypt a test value
      // The actual verification happens when trying to use the PIN
      onUnlock(pinValue);
    } catch (err) {
      setError("Incorrect PIN");
      setPin(["", "", "", "", "", ""]);
      pinInputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const getPinValue = () => pin.join("");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isVerifying && onClose()}>
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl" 
        showCloseButton={!isVerifying}
      >
        <div className="p-8">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-6 animate-in fade-in zoom-in-75 duration-500">
            <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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

          <div className="space-y-6">
            <PinInput
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              inputRefs={pinInputRefs}
              disabled={isVerifying}
              error={!!error}
            />

            {error && (
              <p className="text-red-500 text-sm text-center animate-in fade-in slide-in-from-top-2 duration-300">
                {error}
              </p>
            )}

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUnlock(getPinValue())}
              disabled={getPinValue().length < 4 || isVerifying}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            >
              {isVerifying ? "Verifying..." : "Unlock"}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-6">
            Your PIN is never sent to our servers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
