"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DollarSign, Icon, LoaderIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpot } from "@/app/context/spotContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { usePrices } from "@/lib/wallet/usePrices";
import { cn } from "@/lib/utils";
import { formatAmount, formatUSD } from "@/lib/wallet/amounts";

const SpotInterface = () => {
    const { selectedPair, loading } = useSpot();
    const { balance: solBalance, tokenBalances: solTokens } = useSolana();
    const { balance: ethBalance, tokenBalances: ethTokens } = useEvm();
    const { prices } = usePrices();

    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [price, setPrice] = useState("");
    const [amount, setAmount] = useState("");
    const [executing, setExecuting] = useState(false);

    // Set initial price when pair changes or entering limit order
    useEffect(() => {
        if (selectedPair && (orderType === "limit" || !price)) {
            setPrice(selectedPair.price.toString());
        }
    }, [selectedPair, orderType]);

    // Determine base and quote tokens
    const baseToken = selectedPair?.baseToken || "SOL";
    const quoteToken = selectedPair?.quoteToken || "USDC";

    // Get balances for the tokens in the pair
    const getBalance = (symbol: string) => {
        if (symbol === "SOL") return solBalance;
        if (symbol === "ETH") return ethBalance;

        // Check Solana tokens
        const solToken = solTokens.find(t => t.symbol === symbol);
        if (solToken) return solToken.amount;

        // Check EVM tokens
        const evmToken = ethTokens.find(t => t.symbol === symbol);
        if (evmToken) return evmToken.amount;

        return 0;
    };

    const baseBalance = getBalance(baseToken);
    const quoteBalance = getBalance(quoteToken);

    const total = useMemo(() => {
        const p = orderType === "market" ? (selectedPair?.price || 0) : parseFloat(price || "0");
        const a = parseFloat(amount || "0");
        return p * a;
    }, [selectedPair, orderType, price, amount]);

    const handleExecute = async () => {
        setExecuting(true);
        // Simulate trade
        setTimeout(() => {
            setExecuting(false);
            setAmount("");
            alert(`${side.toUpperCase()} ${amount} ${baseToken} successful!`);
        }, 2000);
    };

    const handleSetPercent = (percent: number) => {
        if (side === "buy") {
            const p = orderType === "market" ? (selectedPair?.price || 0) : parseFloat(price || "0");
            if (p > 0) {
                setAmount(((quoteBalance * percent) / p).toFixed(6));
            }
        } else {
            setAmount((baseBalance * percent).toFixed(6));
        }
    };

    return (
        <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full overflow-hidden flex flex-col animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <CardHeader className="pb-2 border-b border-border/10 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-white dark:border-black z-10">
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center border border-white dark:border-black">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-dark dark:text-white leading-tight">
                                {selectedPair?.symbol || "SOL/USDC"}
                            </h3>
                            <p className="text-[10px] text-muted font-medium uppercase tracking-tighter">Spot Trading</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-success leading-tight">${selectedPair?.price.toFixed(2)}</p>
                        <p className="text-[10px] text-success font-medium">+{selectedPair?.change24h}%</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col gap-4">
                {/* Buy/Sell Tabs */}
                <div className="grid grid-cols-2 p-1 bg-muted/20 dark:bg-white/5 rounded-xl">
                    <button
                        onClick={() => setSide("buy")}
                        className={cn(
                            "py-2 text-xs font-bold rounded-lg transition-all",
                            side === "buy"
                                ? "bg-success text-white shadow-lg shadow-success/20"
                                : "text-muted hover:text-dark dark:hover:text-white"
                        )}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setSide("sell")}
                        className={cn(
                            "py-2 text-xs font-bold rounded-lg transition-all",
                            side === "sell"
                                ? "bg-error text-white shadow-lg shadow-error/20"
                                : "text-muted hover:text-dark dark:hover:text-white"
                        )}
                    >
                        SELL
                    </button>
                </div>

                {/* Order Type Tabs */}
                <div className="flex items-center gap-4 border-b border-border/10 dark:border-white/5 pb-1">
                    <button
                        onClick={() => setOrderType("market")}
                        className={cn(
                            "text-[11px] font-bold pb-2 border-b-2 transition-all",
                            orderType === "market" ? "text-primary border-primary" : "text-muted border-transparent"
                        )}
                    >
                        MARKET
                    </button>
                    <button
                        onClick={() => setOrderType("limit")}
                        className={cn(
                            "text-[11px] font-bold pb-2 border-b-2 transition-all",
                            orderType === "limit" ? "text-primary border-primary" : "text-muted border-transparent"
                        )}
                    >
                        LIMIT
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Price Input (Limit only) */}
                    {orderType === "limit" && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                                <span className="text-muted">Price</span>
                                <span className="text-dark dark:text-white">{quoteToken}</span>
                            </div>
                            <div className="relative group">
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="bg-muted/10 dark:bg-white/3 border-border/30 dark:border-white/5 h-10 text-sm font-semibold focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-medium">
                            <span className="text-muted">Amount</span>
                            <span className="text-dark dark:text-white">{baseToken}</span>
                        </div>
                        <div className="relative group">
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-muted/10 dark:bg-white/3 border-border/30 dark:border-white/5 h-10 text-sm font-semibold focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* Quick Percent Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {[0.25, 0.5, 0.75, 1].map((p) => (
                            <button
                                key={p}
                                onClick={() => handleSetPercent(p)}
                                className="py-1 text-[10px] font-bold bg-muted/10 dark:bg-white/3 border border-border/10 dark:border-white/5 rounded-md hover:bg-muted/30 dark:hover:bg-white/10 text-muted hover:text-dark dark:hover:text-white transition-all uppercase"
                            >
                                {p * 100}%
                            </button>
                        ))}
                    </div>

                    {/* Total Display */}
                    <div className="pt-2">
                        <div className="flex justify-between text-[11px] font-medium mb-1.5">
                            <span className="text-muted">Estimated Total</span>
                            <span className="text-dark dark:text-white">{formatUSD(total)}</span>
                        </div>
                        <div className="h-10 px-3 flex items-center bg-muted/10 dark:bg-white/3 border border-dashed border-border/30 dark:border-white/10 rounded-xl">
                            <span className="text-sm font-bold text-dark dark:text-white">{total.toFixed(2)}</span>
                            <span className="ml-auto text-[10px] font-bold text-muted">{quoteToken}</span>
                        </div>
                    </div>
                </div>

                {/* Balance Info */}
                <div className="mt-auto space-y-1.5 pt-4">
                    <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-muted">Available {side === "buy" ? quoteToken : baseToken}</span>
                        <span className="text-dark dark:text-white font-bold">
                            {side === "buy" ? quoteBalance.toFixed(4) : baseBalance.toFixed(4)}
                        </span>
                    </div>
                    <div className="w-full bg-muted/20 dark:bg-white/5 h-1 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", side === "buy" ? "bg-success" : "bg-error")}
                            style={{ width: `${Math.min(100, (parseFloat(amount || "0") / (side === "buy" ? quoteBalance : baseBalance)) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Execution Button */}
                <Button
                    onClick={handleExecute}
                    disabled={!amount || parseFloat(amount) <= 0 || executing}
                    className={cn(
                        "w-full h-12 text-sm font-black tracking-widest uppercase transition-all duration-300 transform active:scale-95",
                        side === "buy"
                            ? "bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20"
                            : "bg-error hover:bg-error/90 text-white shadow-lg shadow-error/20"
                    )}
                >
                    {executing ? (
                        <LoaderIcon className="w-5 h-5 animate-spin" />
                    ) : (
                        `${side} ${baseToken}`
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};

export default SpotInterface;
