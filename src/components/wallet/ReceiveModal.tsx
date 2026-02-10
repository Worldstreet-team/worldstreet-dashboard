"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  chain: string;
  address: string;
}

const CHAIN_INFO: Record<string, { name: string; color: string; icon: string }> = {
  solana: {
    name: "Solana",
    color: "#14F195",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  ethereum: {
    name: "Ethereum",
    color: "#627EEA",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  bitcoin: {
    name: "Bitcoin",
    color: "#F7931A",
    icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
};

const ReceiveModal: React.FC<ReceiveModalProps> = ({ isOpen, onClose, chain, address }) => {
  const [copied, setCopied] = useState(false);

  const chainInfo = CHAIN_INFO[chain] || { name: chain, color: "#6366f1", icon: "" };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = address;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 dark:border-darkborder">
          <div className="flex items-center gap-3">
            {chainInfo.icon && (
              <img src={chainInfo.icon} alt={chainInfo.name} className="w-8 h-8 rounded-full" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">Receive {chainInfo.name}</h2>
              <p className="text-sm text-muted">Scan QR code or copy address</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/30 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-500">
                Only send <span className="font-semibold">{chainInfo.name}</span> assets to this address. Sending other assets may result in permanent loss.
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-2xl">
              <QRCodeSVG
                value={address}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <label className="block text-sm text-muted mb-2">Your {chainInfo.name} Address</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted/30 dark:bg-white/5 rounded-lg">
                <p className="text-sm text-dark dark:text-white font-mono break-all">{address}</p>
              </div>
              <button
                onClick={handleCopy}
                className={`p-3 rounded-lg transition-all duration-200 ${
                  copied
                    ? "bg-green-500/20 text-green-500"
                    : "bg-muted/30 dark:bg-white/5 hover:bg-muted/40 dark:hover:bg-white/10 text-muted"
                }`}
              >
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Address
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveModal;
