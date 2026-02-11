"use client";

import React, { useState, useCallback } from "react";
import { Modal, ModalHeader, ModalBody, Spinner } from "flowbite-react";

interface TokenMetadata {
  address: string;
  chain: "ethereum" | "solana";
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  price?: number;
  priceChange24h?: number;
}

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenAdded: () => void;
}

const CHAIN_OPTIONS = [
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    placeholder: "0x...",
    example: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  {
    id: "solana",
    name: "Solana",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
    placeholder: "Token mint address...",
    example: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
];

export function AddTokenModal({ isOpen, onClose, onTokenAdded }: AddTokenModalProps) {
  const [chain, setChain] = useState<"ethereum" | "solana">("ethereum");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);

  const selectedChain = CHAIN_OPTIONS.find((c) => c.id === chain)!;

  const handleReset = useCallback(() => {
    setAddress("");
    setMetadata(null);
    setError(null);
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleFetchMetadata = useCallback(async () => {
    if (!address.trim()) {
      setError("Please enter a contract address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMetadata(null);

    try {
      const response = await fetch(
        `/api/tokens/metadata?address=${encodeURIComponent(address.trim())}&chain=${chain}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch token metadata");
      }

      setMetadata(data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch token metadata");
    } finally {
      setIsLoading(false);
    }
  }, [address, chain]);

  const handleAddToken = useCallback(async () => {
    if (!metadata) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/tokens/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: metadata.chain,
          address: metadata.address,
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: metadata.decimals,
          logoURI: metadata.logoURI || "",
          coingeckoId: metadata.coingeckoId || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add token");
      }

      onTokenAdded();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add token");
    } finally {
      setIsSaving(false);
    }
  }, [metadata, onTokenAdded, handleClose]);

  return (
    <Modal show={isOpen} onClose={handleClose} size="md">
      <ModalHeader>Add Custom Token</ModalHeader>
      <ModalBody>
        <div className="space-y-6">
          {/* Chain Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Network
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CHAIN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setChain(option.id as "ethereum" | "solana");
                    handleReset();
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    chain === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border dark:border-darkborder hover:border-primary/50"
                  }`}
                >
                  <img src={option.icon} alt={option.name} className="w-6 h-6 rounded-full" />
                  <span className="font-medium text-dark dark:text-white">{option.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contract Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contract Address
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setMetadata(null);
                  setError(null);
                }}
                placeholder={selectedChain.placeholder}
                className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border dark:border-darkborder rounded-xl text-dark dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              />
              {address && (
                <button
                  onClick={handleReset}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-xs text-muted mt-1.5">
              Example: {selectedChain.example.slice(0, 20)}...
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Fetch Button */}
          {!metadata && (
            <button
              onClick={handleFetchMetadata}
              disabled={isLoading || !address.trim()}
              className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  Fetching token info...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Lookup Token
                </>
              )}
            </button>
          )}

          {/* Token Preview */}
          {metadata && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 dark:bg-white/5 rounded-xl">
                <div className="flex items-center gap-4">
                  {metadata.logoURI ? (
                    <img
                      src={metadata.logoURI}
                      alt={metadata.symbol}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = selectedChain.icon;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {metadata.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark dark:text-white">{metadata.name}</h3>
                    <p className="text-sm text-muted">{metadata.symbol}</p>
                  </div>
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div className="mt-4 pt-3 border-t border-border dark:border-darkborder grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted">Decimals</p>
                    <p className="font-medium text-dark dark:text-white">{metadata.decimals}</p>
                  </div>
                  <div>
                    <p className="text-muted">Network</p>
                    <p className="font-medium text-dark dark:text-white capitalize">{metadata.chain}</p>
                  </div>
                  {metadata.price && (
                    <div>
                      <p className="text-muted">Price</p>
                      <p className="font-medium text-dark dark:text-white">
                        ${metadata.price < 0.01 ? metadata.price.toExponential(2) : metadata.price.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {metadata.priceChange24h !== undefined && (
                    <div>
                      <p className="text-muted">24h Change</p>
                      <p className={`font-medium ${metadata.priceChange24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {metadata.priceChange24h >= 0 ? "+" : ""}
                        {metadata.priceChange24h.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddToken}
                disabled={isSaving}
                className="w-full py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" />
                    Adding token...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add {metadata.symbol} to Wallet
                  </>
                )}
              </button>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full py-2 text-muted hover:text-dark dark:hover:text-white transition-colors text-sm"
              >
                Search for different token
              </button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

export default AddTokenModal;
