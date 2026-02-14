"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface SpotPair {
    symbol: string;
    name: string;
    baseToken: string;
    quoteToken: string;
    price: number;
    change24h: number;
    volume24h: number;
}

interface SpotContextType {
    selectedPair: SpotPair | null;
    setSelectedPair: (pair: SpotPair | null) => void;
    loading: boolean;
}

const SpotContext = createContext<SpotContextType | undefined>(undefined);

export function SpotProvider({ children }: { children: ReactNode }) {
    const [selectedPair, setSelectedPair] = useState<SpotPair | null>({
        symbol: "SOL/USDC",
        name: "Solana",
        baseToken: "SOL",
        quoteToken: "USDC",
        price: 145.20,
        change24h: 2.5,
        volume24h: 1250000000,
    });
    const [loading, setLoading] = useState(false);

    return (
        <SpotContext.Provider value={{ selectedPair, setSelectedPair, loading }}>
            {children}
        </SpotContext.Provider>
    );
}

export function useSpot() {
    const context = useContext(SpotContext);
    if (context === undefined) {
        throw new Error("useSpot must be used within a SpotProvider");
    }
    return context;
}
