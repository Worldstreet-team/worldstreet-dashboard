"use client";

import React, { useState, useMemo, useEffect } from "react";
import { LoaderIcon, Info, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useSwap, SwapToken, ChainKey } from "@/app/context/swapContext";
import { cn } from "@/lib/utils";
import { formatAmount as formatTokenAmount } from "@/lib/wallet/amounts";
import { PinConfirmModal } from "@/components/swap/PinConfirmModal";
import { usePrices } from "@/lib/wallet/usePrices";

interface SpotInterfaceProps {
    pair: string;
}

const SpotInterface = ({ pair }: SpotInterfaceProps) => {
    const [baseSymbol, quoteSymbol] = (pair || "BTC/USDC").split("/");
    const { address: solAddress, balance: solBalance, tokenBalances: solTokens } = useSolana();
    const { address: evmAddress, balance: ethBalance, tokenBalances: ethTokens } = useEvm();
    const { getQuote, executeSwap, quote, quoteLoading, quoteError, executing } = useSwap();
    const { coins } = usePrices();

    // UI state
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [orderType, setOrderType] = useState<"limit" | "market">("market");
    const [amount, setAmount] = useState("");
    const [total, setTotal] = useState("");
    const [price, setPrice] = useState("");
    const [showPinModal, setShowPinModal] = useState(false);

    // Derived tokens
    const currentPrice = useMemo(() => {
        const coin = coins.find(c => c.symbol === baseSymbol);
        return coin?.price || 0;
    }, [coins, baseSymbol]);

    useEffect(() => {
        if (orderType === "market") {
            setPrice(currentPrice.toString());
        }
    }, [currentPrice, orderType]);

    // Token mapping (simplification for the UI)
    const baseToken: SwapToken = useMemo(() => ({
        chainId: 1151111081099710,
        address: baseSymbol === "SOL" ? "11111111111111111111111111111111" : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Placeholder logic
        symbol: baseSymbol,
        name: baseSymbol,
        decimals: baseSymbol === "SOL" ? 9 : 6,
        logoURI: ""
    }), [baseSymbol]);

    const quoteToken: SwapToken = useMemo(() => ({
        chainId: 1151111081099710,
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC usually
        symbol: quoteSymbol,
        name: quoteSymbol,
        decimals: 6,
        logoURI: ""
    }), [quoteSymbol]);

    const fromToken = side === "buy" ? quoteToken : baseToken;
    const toToken = side === "buy" ? baseToken : quoteToken;

    // Balance calc
    const baseBalance = useMemo(() => {
        if (baseSymbol === "SOL") return solBalance;
        return solTokens.find(t => t.symbol === baseSymbol)?.amount || 0;
    }, [baseSymbol, solBalance, solTokens]);

    const quoteBalance = useMemo(() => {
        if (quoteSymbol === "USDC") {
            // Simplified
            return solTokens.find(t => t.symbol === "USDC")?.amount || 0;
        }
        return 0;
    }, [quoteSymbol, solTokens]);

    const availableBalance = side === "buy" ? quoteBalance : baseBalance;

    // Handle inputs
    const handleAmountChange = (val: string) => {
        setAmount(val);
        if (val && !isNaN(parseFloat(val)) && currentPrice > 0) {
            setTotal((parseFloat(val) * currentPrice).toFixed(2));
        } else {
            setTotal("");
        }
    };

    const handleTotalChange = (val: string) => {
        setTotal(val);
        if (val && !isNaN(parseFloat(val)) && currentPrice > 0) {
            setAmount((parseFloat(val) / currentPrice).toFixed(6));
        } else {
            setAmount("");
        }
    };

    // Debounced quote fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && parseFloat(amount) > 0) {
                const swapAmount = side === "buy" ? total : amount;
                const token = side === "buy" ? quoteToken : baseToken;

                if (solAddress && swapAmount) {
                    getQuote({
                        fromChain: "solana",
                        toChain: "solana",
                        fromToken: fromToken.address,
                        toToken: toToken.address,
                        fromAmount: (parseFloat(swapAmount) * Math.pow(10, fromToken.decimals)).toFixed(0),
                        fromAddress: solAddress,
                        toAddress: solAddress,
                    });
                }
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [amount, total, side, fromToken, toToken, solAddress, getQuote, baseToken, quoteToken]);

    const handleExecute = () => {
        if (!quote) return;
        setShowPinModal(true);
    };

    const onPinSubmit = async (pin: string) => {
        if (!quote) return;
        try {
            const result = await executeSwap(quote, pin);

            // Record the transaction in MongoDB
            try {
                await fetch("/api/trades/transaction", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        symbol: pair,
                        side: side,
                        type: orderType,
                        price: currentPrice,
                        amount: parseFloat(amount),
                        total: parseFloat(total),
                        fee: 0.1, // Default fee or fetch from quote if available
                        status: "COMPLETED", // marking as completed if executeSwap succeeded
                        txHash: result || "",
                    }),
                });
            } catch (dbErr) {
                console.error("Failed to record transaction in DB:", dbErr);
            }

            setShowPinModal(false);
            setAmount("");
            setTotal("");
        } catch (err) {
            console.error("Swap failed:", err);
        }
    };

    return (
        <Card className="border-0 shadow-none dark:bg-[#1a1a1a] bg-white h-full flex flex-col font-sans">
            <div className="flex p-1 bg-muted/20 dark:bg-white/5 rounded-t-xl">
                <button
                    onClick={() => setSide("buy")}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold transition-all rounded-lg",
                        side === "buy" ? "bg-success text-white" : "text-muted hover:text-white"
                    )}
                >
                    Buy
                </button>
                <button
                    onClick={() => setSide("sell")}
                    className={cn(
                        "flex-1 py-2 text-xs font-bold transition-all rounded-lg",
                        side === "sell" ? "bg-error text-white" : "text-muted hover:text-white"
                    )}
                >
                    Sell
                </button>
            </div>

            <CardContent className="pt-4 px-4 space-y-4">
                {/* Order Type Tabs */}
                <div className="flex gap-4 border-b border-border/10 pb-2">
                    <button
                        onClick={() => setOrderType("limit")}
                        className={cn("text-xs font-bold pb-2 transition-all border-b-2", orderType === "limit" ? "text-primary border-primary" : "text-muted border-transparent")}
                    >
                        Limit
                    </button>
                    <button
                        onClick={() => setOrderType("market")}
                        className={cn("text-xs font-bold pb-2 transition-all border-b-2", orderType === "market" ? "text-primary border-primary" : "text-muted border-transparent")}
                    >
                        Market
                    </button>
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted">
                    <span>Available</span>
                    <span className="text-dark dark:text-white font-bold">{formatTokenAmount(availableBalance)} {side === "buy" ? quoteSymbol : baseSymbol}</span>
                </div>

                {/* Price Input */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted uppercase">Price</p>
                    <div className="relative">
                        <Input
                            value={orderType === "market" ? "Market Price" : price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={orderType === "market"}
                            className="bg-muted/10 dark:bg-white/5 border-border/20 text-right pr-12 font-bold tabular-nums h-9 text-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">{quoteSymbol}</span>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted uppercase">Amount</p>
                    <div className="relative">
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="bg-muted/10 dark:bg-white/5 border-border/20 text-right pr-12 font-bold tabular-nums h-9 text-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">{baseSymbol}</span>
                    </div>
                </div>

                {/* Percentage Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 100].map(p => (
                        <button
                            key={p}
                            onClick={() => {
                                const val = (availableBalance * (p / 100)).toFixed(baseToken.decimals);
                                if (side === "sell") handleAmountChange(val);
                                else handleTotalChange(val);
                            }}
                            className="py-1 text-[9px] font-bold bg-muted/20 dark:bg-white/5 rounded hover:bg-primary/20 transition-all text-muted hover:text-primary"
                        >
                            {p}%
                        </button>
                    ))}
                </div>

                {/* Total/Value Input */}
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted uppercase">Order Value</p>
                    <div className="relative">
                        <Input
                            type="number"
                            value={total}
                            onChange={(e) => handleTotalChange(e.target.value)}
                            placeholder="0.00"
                            className="bg-muted/10 dark:bg-white/5 border-border/20 text-right pr-12 font-bold tabular-nums h-9 text-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">{quoteSymbol}</span>
                    </div>
                </div>

                {/* Execution Info */}
                <div className="py-2 space-y-1.5 border-t border-border/10 mt-2">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-muted">Est. Fee</span>
                        <span className="text-dark dark:text-white font-medium">0.1%</span>
                    </div>
                    {quote && (
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted">Rate</span>
                            <span className="text-dark dark:text-white font-medium">1 {baseSymbol} ≈ {currentPrice.toFixed(2)} {quoteSymbol}</span>
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleExecute}
                    disabled={!amount || quoteLoading || executing}
                    className={cn(
                        "w-full h-10 text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-lg",
                        side === "buy" ? "bg-success hover:bg-success/90 text-white shadow-success/20" : "bg-error hover:bg-error/90 text-white shadow-error/20",
                        executing && "opacity-70 animate-pulse"
                    )}
                >
                    {executing ? <LoaderIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                    {side === "buy" ? `Buy ${baseSymbol}` : `Sell ${baseSymbol}`}
                </Button>

                {quoteError && (
                    <p className="text-[9px] text-error font-bold text-center mt-2">{quoteError}</p>
                )}
            </CardContent>

            <PinConfirmModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={onPinSubmit}
            />
        </Card>
    );
};

export default SpotInterface;
