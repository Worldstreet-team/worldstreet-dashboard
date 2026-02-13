"use client";

import React, { useState, useMemo, useEffect } from "react";
import { LoaderIcon, ChevronDown, Repeat, Info, Wallet, ArrowDownUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useSwap, SwapToken, ChainKey, SWAP_CHAINS } from "@/app/context/swapContext";
import { cn } from "@/lib/utils";
import { formatAmount as formatTokenAmount } from "@/lib/wallet/amounts";
import { TokenSelectModal } from "@/components/swap/TokenSelectModal";
import { SwapQuoteCard } from "@/components/swap/SwapQuoteCard";
import { PinConfirmModal } from "@/components/swap/PinConfirmModal";

const SpotInterface = () => {
    const { address: solAddress, balance: solBalance, tokenBalances: solTokens } = useSolana();
    const { address: evmAddress, balance: ethBalance, tokenBalances: ethTokens } = useEvm();
    const { getQuote, executeSwap, quote, quoteLoading, quoteError, executing, swapStatus } = useSwap();

    // Selected tokens & chains
    const [fromChain, setFromChain] = useState<ChainKey>("solana");
    const [toChain, setToChain] = useState<ChainKey>("solana");
    const [fromToken, setFromToken] = useState<SwapToken | null>(null);
    const [toToken, setToToken] = useState<SwapToken | null>(null);

    // UI state
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [amount, setAmount] = useState("");
    const [showTokenSelect, setShowTokenSelect] = useState<{ open: boolean; side: "from" | "to" }>({ open: false, side: "from" });
    const [showPinModal, setShowPinModal] = useState(false);

    // Initialize default tokens
    useEffect(() => {
        const solToken = {
            chainId: 1151111081099710,
            address: "11111111111111111111111111111111",
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            logoURI: "https://static.debank.com/image/coin/logo_url/sol/1e6d4c14106579294f997c02b37be801.png"
        };

        const usdcToken = {
            chainId: 1151111081099710,
            address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            logoURI: "https://static.debank.com/image/coin/logo_url/usdc/c513738128ca7ed637c356191a329ecb.png"
        };

        setFromToken(side === "buy" ? usdcToken : solToken);
        setToToken(side === "buy" ? solToken : usdcToken);
    }, [side]);

    // Debounced quote fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            if (fromToken && toToken && amount && parseFloat(amount) > 0) {
                const fromAddress = fromChain === "solana" ? solAddress : (fromChain === "ethereum" ? evmAddress : null);
                const toAddress = toChain === "solana" ? solAddress : (toChain === "ethereum" ? evmAddress : null);

                if (fromAddress) {
                    getQuote({
                        fromChain,
                        toChain,
                        fromToken: fromToken.address,
                        toToken: toToken.address,
                        fromAmount: (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toFixed(0),
                        fromAddress,
                        toAddress: toAddress || fromAddress,
                    });
                }
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [fromToken, toToken, amount, fromChain, toChain, solAddress, evmAddress, getQuote]);

    // Balance calculation
    const currentBalance = useMemo(() => {
        if (!fromToken) return 0;
        if (fromChain === "solana") {
            if (fromToken.address === "11111111111111111111111111111111" || fromToken.address === "So11111111111111111111111111111111111111112") return solBalance;
            return solTokens.find(t => t.mint === fromToken.address)?.amount || 0;
        } else if (fromChain === "ethereum") {
            if (fromToken.address === "0x0000000000000000000000000000000000000000") return ethBalance;
            return ethTokens.find(t => t.address === fromToken.address)?.amount || 0;
        }
        return 0;
    }, [fromToken, fromChain, solBalance, solTokens, ethBalance, ethTokens]);

    const handleExecute = () => {
        if (!quote) return;
        setShowPinModal(true);
    };

    const onPinSubmit = async (pin: string) => {
        if (!quote) return;
        try {
            await executeSwap(quote, pin);
            setShowPinModal(false);
            setAmount("");
        } catch (err) {
            console.error("Swap failed:", err);
        }
    };

    const handleSwapValues = () => {
        const tempToken = fromToken;
        const tempChain = fromChain;
        setFromToken(toToken);
        setFromChain(toChain);
        setToToken(tempToken);
        setToChain(tempChain);
    };

    return (
        <Card className="border border-border/50 shadow-xl dark:bg-black dark:border-darkborder h-full overflow-hidden flex flex-col animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <CardHeader className="pb-4 border-b border-border/10 dark:border-white/5 bg-muted/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Repeat className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-dark dark:text-white leading-tight">
                                Spot Trading
                            </h3>
                            <p className="text-[10px] text-muted font-medium uppercase tracking-widest">Universal Asset Bridge</p>
                        </div>
                    </div>
                    <div className="flex gap-2 p-1 bg-muted/20 dark:bg-white/5 rounded-lg border border-border/10">
                        {(["solana", "ethereum"] as ChainKey[]).map((c) => (
                            <button
                                key={c}
                                onClick={() => { setFromChain(c); setFromToken(null); }}
                                className={cn(
                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-tighter",
                                    fromChain === c ? "bg-primary text-white shadow-sm" : "text-muted hover:text-white"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 flex-1 flex flex-col gap-5">
                {/* Buy/Sell Toggles */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/20 dark:bg-white/5 rounded-xl border border-border/5">
                    <button onClick={() => setSide("buy")} className={cn("py-2 text-[11px] font-black rounded-lg transition-all", side === "buy" ? "bg-success text-white shadow-lg shadow-success/20" : "text-muted hover:text-white")}>BUY</button>
                    <button onClick={() => setSide("sell")} className={cn("py-2 text-[11px] font-black rounded-lg transition-all", side === "sell" ? "bg-error text-white shadow-lg shadow-error/20" : "text-muted hover:text-white")}>SELL</button>
                </div>

                {/* Amount Input Section */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-tighter">Amount</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
                            <Wallet className="w-3 h-3" />
                            <span>{formatTokenAmount(currentBalance)} {fromToken?.symbol}</span>
                        </div>
                    </div>

                    <div className="bg-muted/10 dark:bg-white/3 border border-border/20 dark:border-white/5 rounded-2xl p-4 transition-all hover:border-primary/30 focus-within:border-primary/50">
                        <div className="flex items-center justify-between gap-4">
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-transparent border-0 p-0 text-3xl font-black focus-visible:ring-0 placeholder:text-muted/50 h-auto"
                            />
                            <button
                                onClick={() => setShowTokenSelect({ open: true, side: "from" })}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/10 rounded-xl border border-border/50 hover:bg-muted/10 transition-all group shrink-0"
                            >
                                {fromToken?.logoURI && <img src={fromToken.logoURI} className="w-6 h-6 rounded-full" alt="" />}
                                <span className="font-bold text-sm">{fromToken?.symbol || "Select"}</span>
                                <ChevronDown className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-4">
                            {[0.25, 0.5, 0.75, 1].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setAmount((currentBalance * p).toFixed(fromToken?.decimals || 6))}
                                    className="flex-1 py-1.5 text-[10px] font-bold bg-white/5 dark:bg-white/5 border border-border/10 rounded-lg hover:border-primary/50 hover:text-primary transition-all uppercase"
                                >
                                    {p === 1 ? 'MAX' : `${p * 100}%`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center -my-6 relative z-10">
                    <button onClick={handleSwapValues} className="p-3 bg-white dark:bg-[#0a0a0a] border-2 border-border/50 dark:border-white/10 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all text-primary hover:bg-primary hover:text-white group">
                        <ArrowDownUp className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>

                {/* Receiving Section */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] font-bold text-muted uppercase tracking-tighter">Receiving</span>
                    </div>

                    <div className="bg-muted/10 dark:bg-white/3 border border-border/20 dark:border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-3xl font-black text-dark dark:text-white overflow-hidden text-ellipsis">
                                {quote ? (parseFloat(quote.toAmount) / Math.pow(10, quote.toToken.decimals)).toFixed(6) : "0.00"}
                            </div>
                            <button
                                onClick={() => setShowTokenSelect({ open: true, side: "to" })}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/10 rounded-xl border border-border/50 hover:bg-muted/10 transition-all group shrink-0"
                            >
                                {toToken?.logoURI && <img src={toToken.logoURI} className="w-6 h-6 rounded-full" alt="" />}
                                <span className="font-bold text-sm">{toToken?.symbol || "Select"}</span>
                                <ChevronDown className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Under the Hood */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-black text-muted uppercase tracking-widest px-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Under the Hood</span>
                        <div className="flex-1 h-px bg-border/20 dark:bg-white/5 ml-2" />
                    </div>

                    {quoteLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-3 animate-pulse">
                            <LoaderIcon className="w-6 h-6 animate-spin text-primary/50" />
                            <p className="text-[10px] font-bold text-muted">Analyzing Optimal Routes...</p>
                        </div>
                    ) : quoteError ? (
                        <div className="p-4 bg-error/5 border border-error/20 rounded-2xl text-center">
                            <p className="text-xs font-bold text-error">{quoteError}</p>
                        </div>
                    ) : quote ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <SwapQuoteCard quote={quote} fromDecimals={fromToken?.decimals || 18} toDecimals={toToken?.decimals || 18} />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-muted/5 border border-border/10 rounded-xl">
                                    <p className="text-[9px] font-black text-muted uppercase mb-1">Bridge Provider</p>
                                    <p className="text-xs font-bold text-dark dark:text-white capitalize">{quote.toolDetails?.name || 'Li.Fi'}</p>
                                </div>
                                <div className="p-3 bg-muted/5 border border-border/10 rounded-xl">
                                    <p className="text-[9px] font-black text-muted uppercase mb-1">Max Slippage</p>
                                    <p className="text-xs font-bold text-dark dark:text-white">0.50%</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center gap-3 bg-muted/5 rounded-2xl border border-dashed border-border/20">
                            <Repeat className="w-6 h-6 text-muted/30" />
                            <p className="text-[10px] font-bold text-muted">Enter an amount to see routing</p>
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleExecute}
                    disabled={!quote || quoteLoading || executing}
                    className={cn(
                        "w-full h-14 text-sm font-black tracking-[0.2em] uppercase transition-all duration-300 rounded-2xl",
                        side === "buy" ? "bg-success hover:bg-success/90 text-white shadow-xl shadow-success/20" : "bg-error hover:bg-error/90 text-white shadow-xl shadow-error/20",
                        (!quote || quoteLoading || executing) && "opacity-50 grayscale"
                    )}
                >
                    {executing ? (
                        <div className="flex items-center gap-3"><LoaderIcon className="w-5 h-5 animate-spin" /><span>Verifying Order...</span></div>
                    ) : (
                        `${side === 'buy' ? 'CONFIRM PURCHASE' : 'EXECUTE LIQUIDATION'}`
                    )}
                </Button>
            </CardContent>

            <TokenSelectModal
                isOpen={showTokenSelect.open}
                onClose={() => setShowTokenSelect({ ...showTokenSelect, open: false })}
                onSelect={(token) => {
                    if (showTokenSelect.side === "from") setFromToken(token);
                    else setToToken(token);
                }}
                chain={showTokenSelect.side === "from" ? fromChain : toChain}
            />

            <PinConfirmModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={onPinSubmit}
            />
        </Card>
    );
};

export default SpotInterface;
