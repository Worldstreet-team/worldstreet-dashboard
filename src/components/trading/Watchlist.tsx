"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const watchlistData = [
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    price: 44850.00,
    change: 6.53,
    icon: "cryptocurrency-color:btc",
    sparkline: [42, 43, 42, 44, 45, 44, 45, 46, 45, 46],
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    price: 2510.00,
    change: 11.56,
    icon: "cryptocurrency-color:eth",
    sparkline: [22, 23, 22, 24, 25, 24, 25, 26, 25, 26],
  },
  {
    symbol: "EUR/USD",
    name: "Euro",
    price: 1.0968,
    change: 1.09,
    icon: "circle-flags:eu",
    sparkline: [1.08, 1.09, 1.08, 1.09, 1.10, 1.09, 1.10, 1.10, 1.09, 1.10],
  },
  {
    symbol: "GBP/USD",
    name: "British Pound",
    price: 1.2850,
    change: -0.34,
    icon: "circle-flags:gb",
    sparkline: [1.29, 1.28, 1.29, 1.28, 1.27, 1.28, 1.28, 1.29, 1.28, 1.29],
  },
  {
    symbol: "XRP/USD",
    name: "Ripple",
    price: 0.590,
    change: 13.46,
    icon: "cryptocurrency-color:xrp",
    sparkline: [0.52, 0.54, 0.53, 0.56, 0.58, 0.57, 0.58, 0.59, 0.58, 0.59],
  },
  {
    symbol: "SOL/USD",
    name: "Solana",
    price: 98.50,
    change: -2.15,
    icon: "cryptocurrency-color:sol",
    sparkline: [102, 100, 101, 99, 97, 98, 97, 99, 98, 99],
  },
  {
    symbol: "USD/JPY",
    name: "Japanese Yen",
    price: 148.25,
    change: 0.45,
    icon: "circle-flags:jp",
    sparkline: [147, 148, 147, 148, 149, 148, 148, 149, 148, 148],
  },
];

const Watchlist = () => {
  const [starred, setStarred] = useState<string[]>(["BTC/USD", "ETH/USD", "EUR/USD"]);

  const toggleStar = (symbol: string) => {
    setStarred(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const formatPrice = (symbol: string, price: number) => {
    if (symbol.includes("BTC") || symbol.includes("SOL")) {
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (symbol.includes("ETH")) {
      return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (symbol.includes("XRP")) {
      return `$${price.toFixed(3)}`;
    }
    if (symbol.includes("JPY")) {
      return `¥${price.toFixed(2)}`;
    }
    return price.toFixed(4);
  };

  // Simple sparkline renderer
  const renderSparkline = (data: number[], isPositive: boolean) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const height = 24;
    const width = 60;
    const stepX = width / (data.length - 1);
    
    const points = data.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "var(--color-success)" : "var(--color-error)"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <Card className="border-0 shadow-md dark:bg-black dark:shadow-dark-md h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-lg font-semibold text-dark dark:text-white">Watchlist</h5>
            <p className="text-sm text-muted">Track your favorite markets</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
            <Icon icon="solar:add-circle-linear" className="h-5 w-5 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ScrollArea className="h-[480px] pr-3">
          <div className="space-y-2">
            {watchlistData.map((item) => {
              const isPositive = item.change >= 0;
              const isStarred = starred.includes(item.symbol);
              
              return (
                <div
                  key={item.symbol}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-darkgray/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleStar(item.symbol)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon 
                        icon={isStarred ? "solar:star-bold" : "solar:star-linear"} 
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isStarred ? "text-warning" : "text-muted hover:text-warning"
                        )}
                      />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-darkgray/50 flex items-center justify-center">
                      <Icon icon={item.icon} className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-dark dark:text-white">
                        {item.symbol}
                      </p>
                      <p className="text-xs text-muted">{item.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">
                      {renderSparkline(item.sparkline, isPositive)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-dark dark:text-white">
                        {formatPrice(item.symbol, item.price)}
                      </p>
                      <p className={cn(
                        "text-xs font-medium",
                        isPositive ? "text-success" : "text-error"
                      )}>
                        {isPositive ? "+" : ""}{item.change.toFixed(2)}%
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
