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
import { Icon } from "@iconify/react";

// Mobile-optimized PIN input with show/hide functionality
function PinInput({
  value,
  onChange,
  onKeyDown,
  onPaste,
  inputRefs,
  disabled = false,
  error = false,
  showPin = false,
}: {
  value: string[];
  onChange: (index: number, val: string) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
  error?: boolean;
  showPin?: boolean;
}) {
  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {value.map((digit, index) => (
        <div key={index} className="relative">
          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onPaste={onPaste}
            disabled={disabled}
            className={`
              w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16
              text-center text-xl sm:text-2xl font-bold
              bg-white dark:bg-gray-800/50
              border-2 rounded-lg sm:rounded-xl
              transition-all duration-200
              outline-none
              ${digit ? "border-primary dark:border-primary" : "border-gray-200 dark:border-gray-700"}
              ${error ? "border-error dark:border-error animate-shake" : ""}
              focus:border-primary dark:focus:border-primary
              focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/20
              focus:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed
              touch-manipulation
            `}
            style={{
              caretColor: showPin ? "auto" : "transparent",
            }}
          />
          {/* Dot indicator when filled and hidden */}
          {digit && !showPin && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gray-800 dark:bg-white" />
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
  const [showPin, setShowPin] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPin(["", "", "", "", "", ""]);
        setError(null);
        setIsVerifying(false);
        setShowPin(false);
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
        setTimeout(() => handleUnlock(fullPin), 100);
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
      
      // Focus last filled input
      const lastIndex = Math.min(pastedData.length - 1, 5);
      setTimeout(() => pinInputRefs.current[lastIndex]?.focus(), 0);
      
      // Auto-submit if full PIN pasted
      if (pastedData.length >= 4) {
        setTimeout(() => handleUnlock(pastedData), 100);
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
      onUnlock(pinValue);
    } catch (err) {
      setError("Incorrect PIN");
      setPin(["", "", "", "", "", ""]);
      pinInputRefs.current[0]?.focus();
      setIsVerifying(false);
    }
  };

  const getPinValue = () => pin.join("");

  const handleClear = () => {
    setPin(["", "", "", "", "", ""]);
    setError(null);
    pinInputRefs.current[0]?.focus();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isVerifying && onClose()}>
      <DialogContent 
        className="w-[95vw] max-w-md p-0 overflow-hidden !bg-white dark:!bg-gray-900 border-0 shadow-2xl" 
        showCloseButton={!isVerifying}
      >
        <div className="p-4 sm:p-6 md:p-8">
          {/* Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Icon icon="ph:lock-key-duotone" className="text-primary" height={40} width={40} />
          </div>

          {/* Header */}
          <DialogHeader className="text-center mb-6 sm:mb-8">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-dark dark:text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-muted dark:text-gray-400 mt-2">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* PIN Input */}
          <div className="space-y-4 sm:space-y-6">
            <PinInput
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              inputRefs={pinInputRefs}
              disabled={isVerifying}
              error={!!error}
              showPin={showPin}
            />

            {/* Show/Hide PIN Toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 transition-colors text-sm text-muted dark:text-gray-400 touch-manipulation"
              >
                <Icon 
                  icon={showPin ? "ph:eye-slash" : "ph:eye"} 
                  height={18} 
                  width={18}
                />
                <span>{showPin ? "Hide" : "Show"} PIN</span>
              </button>
              
              {getPinValue().length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/10 dark:hover:bg-white/5 transition-colors text-sm text-muted dark:text-gray-400 touch-manipulation disabled:opacity-50"
                >
                  <Icon icon="ph:x-circle" height={18} width={18} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg">
                <Icon icon="ph:warning-circle" className="text-error flex-shrink-0" height={18} />
                <p className="text-error text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Verifying State */}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted dark:text-gray-400">
                <Icon icon="svg-spinners:ring-resize" height={20} />
                <span>Verifying...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 h-11 sm:h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUnlock(getPinValue())}
              disabled={getPinValue().length < 4 || isVerifying}
              className="flex-1 h-11 sm:h-12 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-all touch-manipulation disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <Icon icon="svg-spinners:ring-resize" height={18} />
                  Verifying...
                </span>
              ) : (
                "Unlock"
              )}
            </Button>
          </div>

          {/* Security Note */}
          <p className="text-xs text-center text-muted dark:text-gray-500 mt-4 sm:mt-6">
            <Icon icon="ph:shield-check" className="inline mr-1" height={14} />
            Your PIN is never sent to our servers
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
