"use client";
import React, { useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePrices, CoinData } from "@/lib/wallet/usePrices";

// Icon mapping for crypto symbols
const CRYPTO_ICONS: Record<string, string> = {
  BTC: "cryptocurrency-color:btc",
  ETH: "cryptocurrency-color:eth",
  SOL: "cryptocurrency-color:sol",
  XRP: "cryptocurrency-color:xrp",
  ADA: "cryptocurrency-color:ada",
  DOGE: "cryptocurrency-color:doge",
  DOT: "cryptocurrency-color:dot",
  LINK: "cryptocurrency-color:link",
  AVAX: "cryptocurrency-color:avax",
  MATIC: "cryptocurrency-color:matic",
  LTC: "cryptocurrency-color:ltc",
  UNI: "cryptocurrency-color:uni",
  XLM: "cryptocurrency-color:xlm",
  ATOM: "cryptocurrency-color:atom",
  NEAR: "cryptocurrency-color:near",
  APT: "simple-icons:aptos",
  SUI: "token-branded:sui",
  USDT: "cryptocurrency-color:usdt",
  USDC: "cryptocurrency-color:usdc",
};

// Default watchlist symbols
const DEFAULT_WATCHLIST = ["BTC", "ETH", "SOL", "XRP", "DOGE", "LINK", "ADA"];

const Watchlist = () => {
  const { coins, loading } = usePrices();
  const [starred, setStarred] = useState<string[]>(["BTC", "ETH", "SOL"]);

  // Filter coins to show in watchlist
  const watchlistCoins = useMemo(() => {
    if (!coins.length) return [];
    
    // Show default watchlist coins first, then others
    const defaultCoins = DEFAULT_WATCHLIST
      .map(symbol => coins.find(c => c.symbol === symbol))
      .filter((c): c is CoinData => c !== undefined);
    
    // Add remaining coins not in default list
    const otherCoins = coins.filter(c => 
      !DEFAULT_WATCHLIST.includes(c.symbol) && 
      c.symbol !== "USDT" && 
      c.symbol !== "USDC"
    );
    
    return [...defaultCoins, ...otherCoins];
  }, [coins]);

  const toggleStar = (symbol: string) => {
    setStarred(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return "$" + price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return "$" + price.toFixed(2);
    if (price >= 0.01) return "$" + price.toFixed(4);
    return "$" + price.toFixed(6);
  };

  // Generate simple sparkline from change percentage (simulated visual)
  const renderSparkline = (change24h: number) => {
    const isPositive = change24h >= 0;
    const height = 22;
    const width = 56;
    
    // Generate simple trend line based on change
    const data = isPositive 
      ? [40, 45, 42, 48, 52, 50, 55, 58, 55, 60]
      : [60, 55, 58, 52, 48, 50, 45, 42, 45, 40];
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      return x + "," + y;
    }).join(" ");
    
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline points={points} fill="none"
          stroke={isPositive ? "var(--color-success)" : "var(--color-error)"}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  if (loading) {
    return (
      <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full animate-fade-in-up">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-base font-semibold text-dark dark:text-white">Watchlist</h5>
              <p className="text-xs text-muted mt-0.5">Track your favorite markets</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="h-[460px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder h-full animate-fade-in-up" style={{ animationDelay: "60ms" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-base font-semibold text-dark dark:text-white">Watchlist</h5>
            <p className="text-xs text-muted mt-0.5">Live prices • 60s refresh</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-8 text-xs">
            <Icon icon="solar:add-circle-linear" className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <ScrollArea className="h-[460px] pr-2">
          <div className="space-y-0.5">
            {watchlistCoins.map((coin, index) => {
              const isPositive = coin.change24h >= 0;
              const isStarred = starred.includes(coin.symbol);
              const icon = CRYPTO_ICONS[coin.symbol] || "cryptocurrency:generic";
              
              return (
                <div
                  key={coin.id}
                  className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: index * 40 + "ms" }}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleStar(coin.symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Icon
                        icon={isStarred ? "solar:star-bold" : "solar:star-linear"}
                        className={cn("h-3.5 w-3.5 transition-colors", isStarred ? "text-warning" : "text-muted hover:text-warning")}
                      />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-muted/40 dark:bg-white/5 flex items-center justify-center overflow-hidden">
                      {coin.image ? (
                        <img src={coin.image} alt={coin.symbol} className="h-5 w-5" />
                      ) : (
                        <Icon icon={icon} className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-dark dark:text-white leading-tight">{coin.symbol}/USD</p>
                      <p className="text-[11px] text-muted">{coin.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block">{renderSparkline(coin.change24h)}</div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-dark dark:text-white">{formatPrice(coin.price)}</p>
                      <p className={cn("text-[11px] font-medium", isPositive ? "text-success" : "text-error")}>
                        {isPositive ? "+" : ""}{coin.change24h.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default Watchlist;
