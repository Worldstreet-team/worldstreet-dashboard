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
import { generateAllWallets } from "@/lib/wallet";
import { hashPIN } from "@/lib/wallet/encryption";

// Icons
import { AlertTriangle, Loader2, CheckCircle, Shield, Key } from "lucide-react";

type SetupStep = "warning" | "pin-entry" | "generating" | "success";

export function PinSetupModal() {
  const { showPinSetupModal, closePinSetupModal, onWalletSetupComplete } = useWallet();
  
  const [step, setStep] = useState<SetupStep>("warning");
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!showPinSetupModal) {
      setStep("warning");
      setPin(["", "", "", "", "", ""]);
      setConfirmPin(["", "", "", "", "", ""]);
      setError(null);
      setIsProcessing(false);
    }
  }, [showPinSetupModal]);

  // Auto-focus first PIN input when entering PIN step
  useEffect(() => {
    if (step === "pin-entry" && pinInputRefs.current[0]) {
      pinInputRefs.current[0].focus();
    }
  }, [step]);

  const handlePinChange = (
    index: number,
    value: string,
    isPinConfirm: boolean = false
  ) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const targetPin = isPinConfirm ? confirmPin : pin;
    const setTargetPin = isPinConfirm ? setConfirmPin : setPin;
    const refs = isPinConfirm ? confirmPinInputRefs : pinInputRefs;

    const newPin = [...targetPin];
    newPin[index] = value;
    setTargetPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    isPinConfirm: boolean = false
  ) => {
    const refs = isPinConfirm ? confirmPinInputRefs : pinInputRefs;
    const targetPin = isPinConfirm ? confirmPin : pin;

    if (e.key === "Backspace" && !targetPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    isPinConfirm: boolean = false
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length > 0) {
      const setTargetPin = isPinConfirm ? setConfirmPin : setPin;
      const newPin = ["", "", "", "", "", ""];
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setTargetPin(newPin);
    }
  };

  const getPinValue = () => pin.join("");
  const getConfirmPinValue = () => confirmPin.join("");

  const handleContinueToPin = () => {
    setStep("pin-entry");
  };

  const handleGenerateWallets = async () => {
    const pinValue = getPinValue();
    const confirmPinValue = getConfirmPinValue();

    // Validation
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
      // Generate wallets client-side
      const wallets = await generateAllWallets(pinValue);
      
      // Hash the PIN for server storage (never send raw PIN)
      const pinHash = hashPIN(pinValue);

      // Save encrypted wallets to server
      const response = await fetch("/api/wallet/setup", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallets: {
            solana: {
              address: wallets.solana.address,
              encryptedPrivateKey: wallets.solana.encryptedPrivateKey,
            },
            ethereum: {
              address: wallets.ethereum.address,
              encryptedPrivateKey: wallets.ethereum.encryptedPrivateKey,
            },
            bitcoin: {
              address: wallets.bitcoin.address,
              encryptedPrivateKey: wallets.bitcoin.encryptedPrivateKey,
            },
          },
          pinHash,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save wallets");
      }

      // Success!
      setStep("success");
      
      // Notify context
      onWalletSetupComplete({
        solana: wallets.solana.address,
        ethereum: wallets.ethereum.address,
        bitcoin: wallets.bitcoin.address,
      });

      // Auto-close after a moment
      setTimeout(() => {
        closePinSetupModal();
      }, 3000);
      
    } catch (err) {
      console.error("Wallet generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate wallets");
      setStep("pin-entry");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPinInput = (
    pinArray: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    isPinConfirm: boolean = false
  ) => (
    <div className="flex gap-2 justify-center">
      {pinArray.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { refs.current[index] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(index, e.target.value, isPinConfirm)}
          onKeyDown={(e) => handleKeyDown(e, index, isPinConfirm)}
          onPaste={(e) => handlePaste(e, isPinConfirm)}
          className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-blue-500 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:border-gray-600"
          disabled={isProcessing}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={showPinSetupModal} onOpenChange={(open) => !open && step !== "generating" && closePinSetupModal()}>
      <DialogContent className="sm:max-w-md" showCloseButton={step !== "generating"}>
        {/* Warning Step */}
        {step === "warning" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                Set Up Your Wallet PIN
              </DialogTitle>
              <DialogDescription className="text-center">
                Create a secure PIN to protect your crypto wallets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 dark:text-red-400 flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4" />
                  Critical Security Warning
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    Your PIN encrypts your private keys. We NEVER store your PIN.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <strong>If you lose your PIN, your funds are LOST FOREVER.</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    There is NO recovery option. Write down your PIN and store it safely.
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4" />
                  What will be created:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Solana (SOL) wallet</li>
                  <li>• Ethereum (ETH) wallet</li>
                  <li>• Bitcoin (BTC) wallet</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={closePinSetupModal}
                className="w-full sm:w-auto"
              >
                Set Up Later
              </Button>
              <Button
                onClick={handleContinueToPin}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                I Understand, Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {/* PIN Entry Step */}
        {step === "pin-entry" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Create Your PIN
              </DialogTitle>
              <DialogDescription className="text-center">
                Enter a 4-6 digit PIN to secure your wallets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <label className="block text-sm font-medium mb-3 text-center">
                  Enter PIN
                </label>
                {renderPinInput(pin, pinInputRefs, false)}
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-center">
                  Confirm PIN
                </label>
                {renderPinInput(confirmPin, confirmPinInputRefs, true)}
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <p className="text-xs text-gray-500 text-center">
                Remember: If you lose this PIN, your funds cannot be recovered!
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("warning")}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                onClick={handleGenerateWallets}
                disabled={getPinValue().length < 4}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                Generate Wallets
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Generating Step */}
        {step === "generating" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                Generating Wallets
              </DialogTitle>
              <DialogDescription className="text-center">
                Please wait while your wallets are being created...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-gray-500">
                This may take a few seconds...
              </p>
            </div>
          </>
        )}

        {/* Success Step */}
        {step === "success" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                Wallets Created!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your wallets have been securely generated and encrypted.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700 dark:text-green-300">
                  You can now receive crypto on your new wallets. Remember to keep your PIN safe!
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
