"use client";

import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { SwapToken, ChainKey, SWAP_CHAINS, useSwap } from "@/app/context/swapContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: SwapToken) => void;
  chain: ChainKey;
  excludeAddress?: string; // Exclude a token (e.g., same as other side)
}

export function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  chain,
  excludeAddress,
}: TokenSelectModalProps) {
  const { tokens, tokensLoading, fetchTokens } = useSwap();
  const { tokenBalances: solTokenBalances, balance: solBalance } = useSolana();
  const { tokenBalances: evmTokenBalances, balance: ethBalance } = useEvm();

  const [search, setSearch] = useState("");

  // Fetch tokens when modal opens
  useEffect(() => {
    if (isOpen && tokens[chain].length === 0) {
      fetchTokens(chain);
    }
  }, [isOpen, chain, tokens, fetchTokens]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Get user's balance for a token
  const getBalance = (token: SwapToken): number => {
    if (chain === "solana") {
      // Native SOL
      if (token.address === "So11111111111111111111111111111111111111112") {
        return solBalance;
      }
      const found = solTokenBalances.find(
        (t) => t.mint.toLowerCase() === token.address.toLowerCase()
      );
      return found?.amount ?? 0;
    } else {
      // Native ETH
      if (token.address === "0x0000000000000000000000000000000000000000") {
        return ethBalance;
      }
      const found = evmTokenBalances.find(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );
      return found?.amount ?? 0;
    }
  };

  // Filter and sort tokens
  const displayTokens = useMemo(() => {
    let filtered = tokens[chain].filter((token) => {
      // Exclude specified address
      if (excludeAddress && token.address.toLowerCase() === excludeAddress.toLowerCase()) {
        return false;
      }
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          token.symbol.toLowerCase().includes(searchLower) ||
          token.name.toLowerCase().includes(searchLower) ||
          token.address.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // Sort by balance (tokens user owns first), then by name
    filtered.sort((a, b) => {
      const balA = getBalance(a);
      const balB = getBalance(b);
      if (balA > 0 && balB === 0) return -1;
      if (balB > 0 && balA === 0) return 1;
      if (balA !== balB) return balB - balA;
      return a.symbol.localeCompare(b.symbol);
    });

    return filtered;
  }, [tokens, chain, search, excludeAddress]);

  // Popular tokens for quick access
  const popularSymbols = chain === "ethereum" 
    ? ["ETH", "USDT", "USDC", "WETH", "DAI"]
    : ["SOL", "USDT", "USDC", "BONK", "JUP"];

  const popularTokens = useMemo(() => {
    return tokens[chain].filter((t) => popularSymbols.includes(t.symbol.toUpperCase()));
  }, [tokens, chain]);

  return (
    <Modal show={isOpen} onClose={onClose} size="md" dismissible>
      <ModalHeader className="border-b border-border dark:border-darkborder">
        <div className="flex items-center gap-2">
          <span>Select Token</span>
          <span className="text-xs text-muted px-2 py-0.5 bg-lightgray dark:bg-darkborder rounded-full">
            {SWAP_CHAINS[chain].name}
          </span>
        </div>
      </ModalHeader>
      <ModalBody className="p-0">
        {/* Search */}
        <div className="p-4 border-b border-border dark:border-darkborder">
          <div className="relative">
            <Icon
              icon="ph:magnifying-glass"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width={18}
            />
            <input
              type="text"
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-lightgray dark:bg-darkborder border-0 rounded-lg text-dark dark:text-white placeholder:text-muted focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Popular tokens */}
        {!search && popularTokens.length > 0 && (
          <div className="p-4 border-b border-border dark:border-darkborder">
            <p className="text-xs text-muted mb-2">Popular</p>
            <div className="flex flex-wrap gap-2">
              {popularTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-lightgray dark:bg-darkborder rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {token.logoURI && (
                    <img
                      src={token.logoURI}
                      alt={token.symbol}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <span className="text-sm font-medium text-dark dark:text-white">
                    {token.symbol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Token list */}
        <div className="max-h-[400px] overflow-y-auto">
          {tokensLoading ? (
            <div className="py-12 text-center">
              <Icon
                icon="ph:spinner"
                className="animate-spin mx-auto text-primary"
                width={32}
              />
              <p className="text-muted mt-2">Loading tokens...</p>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="py-12 text-center">
              <Icon icon="ph:coin" className="mx-auto text-muted" width={40} />
              <p className="text-muted mt-2">
                {search ? "No tokens found" : "No tokens available"}
              </p>
            </div>
          ) : (
            displayTokens.map((token) => {
              const balance = getBalance(token);
              return (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-lightgray dark:hover:bg-darkborder transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-lightgray dark:bg-darkborder flex items-center justify-center overflow-hidden">
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt={token.symbol}
                          className="w-10 h-10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "";
                            (e.target as HTMLImageElement).onerror = null;
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-muted">${token.symbol[0]}</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted">
                          {token.symbol[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-dark dark:text-white">
                        {token.symbol}
                      </p>
                      <p className="text-xs text-muted line-clamp-1">{token.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {balance > 0 && (
                      <p className="text-sm font-medium text-dark dark:text-white">
                        {balance.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </p>
                    )}
                    {token.priceUSD && parseFloat(token.priceUSD) > 0 && (
                      <p className="text-xs text-muted">
                        ${parseFloat(token.priceUSD).toFixed(2)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

export default TokenSelectModal;
