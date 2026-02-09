"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/app/context/walletContext";
import { hashPIN } from "@/lib/wallet/encryption";

// Icons
import { Loader2, Key } from "lucide-react";

interface PinEntryModalProps {
  onSuccess: (pinHash: string, pin: string) => void;
  title?: string;
  description?: string;
}

export function PinEntryModal({
  onSuccess,
  title = "Enter Your PIN",
  description = "Enter your PIN to authorize this action.",
}: PinEntryModalProps) {
  const { showPinEntryModal, closePinEntryModal } = useWallet();
  
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!showPinEntryModal) {
      setPin(["", "", "", "", "", ""]);
      setError(null);
      setIsVerifying(false);
    } else if (pinInputRefs.current[0]) {
      pinInputRefs.current[0].focus();
    }
  }, [showPinEntryModal]);

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
    
    // Submit on Enter if PIN is complete
    if (e.key === "Enter" && getPinValue().length >= 4) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
      
      // Verify the PIN by trying to get the encrypted keys
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinHash }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Incorrect PIN");
      }

      // PIN is correct, pass it back
      onSuccess(pinHash, pinValue);
      closePinEntryModal();
      
    } catch (err) {
      console.error("PIN verification error:", err);
      setError(err instanceof Error ? err.message : "Verification failed");
      // Clear PIN on error
      setPin(["", "", "", "", "", ""]);
      pinInputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={showPinEntryModal} onOpenChange={(open) => !open && !isVerifying && closePinEntryModal()}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isVerifying}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 justify-center">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { pinInputRefs.current[index] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-blue-500 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:border-gray-600"
                disabled={isVerifying}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={closePinEntryModal}
            disabled={isVerifying}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={getPinValue().length < 4 || isVerifying}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
