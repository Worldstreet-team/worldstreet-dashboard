"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal, ModalBody } from "flowbite-react";
import { Icon } from "@iconify/react";

interface PinConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
}

export function PinConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Enter Your PIN",
  description = "Enter your PIN to authorize this action",
}: PinConfirmModalProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPin(["", "", "", "", "", ""]);
        setError(null);
        setIsVerifying(false);
        setShake(false);
      }, 300);
    } else {
      setTimeout(() => pinInputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

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
      // Verify PIN by attempting to get keys
      const response = await fetch("/api/wallet/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Incorrect PIN");
      }

      // PIN verified - call success callback
      onSuccess(pinValue);
      
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
    <Modal show={isOpen} onClose={onClose} size="md" dismissible={!isVerifying}>
      <ModalBody className="p-0">
        <div className="p-8">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon icon="ph:lock-simple" className="text-primary" width={32} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-center text-dark dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-center text-muted text-sm mb-6">
            {description}
          </p>

          {/* PIN Input */}
          <div className={`mb-6 ${shake ? "animate-shake" : ""}`}>
            <div className="flex justify-center gap-3">
              {pin.map((digit, index) => (
                <div key={index} className="relative">
                  <input
                    ref={(el) => { pinInputRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    disabled={isVerifying}
                    className={`
                      w-12 h-14 text-center text-xl font-semibold
                      bg-lightgray dark:bg-darkborder
                      border-2 rounded-xl
                      transition-all duration-200
                      outline-none
                      ${digit ? "border-primary" : "border-border dark:border-darkborder"}
                      ${error ? "border-error" : ""}
                      focus:border-primary focus:ring-2 focus:ring-primary/20
                      disabled:opacity-50 disabled:cursor-not-allowed
                      text-dark dark:text-white
                    `}
                    style={{ caretColor: "transparent" }}
                  />
                  {digit && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-2.5 h-2.5 rounded-full bg-dark dark:bg-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 rounded-lg flex items-center gap-2 text-error text-sm">
              <Icon icon="ph:warning" width={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 py-3 bg-lightgray dark:bg-darkborder text-dark dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={isVerifying || getPinValue().length < 4}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Icon icon="ph:spinner" className="animate-spin" width={18} />
                  Verifying...
                </>
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

export default PinConfirmModal;
