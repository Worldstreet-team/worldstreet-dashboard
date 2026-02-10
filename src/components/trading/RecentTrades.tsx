"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tradesData = [
  { id: "TRD001", pair: "BTC/USD", type: "buy", amount: 0.15, price: 44200.00, total: 6630.00, status: "filled", time: "2 min ago", icon: "cryptocurrency-color:btc" },
  { id: "TRD002", pair: "EUR/USD", type: "sell", amount: 5000, price: 1.0955, total: 5477.50, status: "filled", time: "15 min ago", icon: "circle-flags:eu" },
  { id: "TRD003", pair: "ETH/USD", type: "buy", amount: 2.5, price: 2480.00, total: 6200.00, status: "pending", time: "28 min ago", icon: "cryptocurrency-color:eth" },
  { id: "TRD004", pair: "GBP/USD", type: "buy", amount: 3000, price: 1.2820, total: 3846.00, status: "filled", time: "1 hour ago", icon: "circle-flags:gb" },
  { id: "TRD005", pair: "XRP/USD", type: "sell", amount: 1500, price: 0.585, total: 877.50, status: "cancelled", time: "2 hours ago", icon: "cryptocurrency-color:xrp" },
];

const openPositions = [
  { pair: "BTC/USD", type: "long", entry: 43500.00, current: 44850.00, amount: 0.25, pnl: 337.50, pnlPercent: 3.10, icon: "cryptocurrency-color:btc" },
  { pair: "ETH/USD", type: "long", entry: 2350.00, current: 2510.00, amount: 3.0, pnl: 480.00, pnlPercent: 6.81, icon: "cryptocurrency-color:eth" },
  { pair: "EUR/USD", type: "short", entry: 1.1020, current: 1.0968, amount: 10000, pnl: 52.00, pnlPercent: 0.47, icon: "circle-flags:eu" },
];

const RecentTrades = () => {
  const [activeTab, setActiveTab] = useState("history");

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "filled": return "bg-success/10 text-success";
      case "pending": return "bg-warning/10 text-warning";
      case "cancelled": return "bg-error/10 text-error";
      default: return "bg-muted/20 text-muted";
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder animate-fade-in-up" style={{ animationDelay: "120ms" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h5 className="text-base font-semibold text-dark dark:text-white">Trading Activity</h5>
            <p className="text-xs text-muted mt-0.5">Your recent trades and positions</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/40 dark:bg-white/5 p-0.5 rounded-lg h-8">
              <TabsTrigger value="history" className="rounded-md px-3 py-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-darkgray data-[state=active]:shadow-sm">
                History
              </TabsTrigger>
              <TabsTrigger value="positions" className="rounded-md px-3 py-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-darkgray data-[state=active]:shadow-sm">
                Positions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === "history" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-darkborder">
                  <th className="text-left py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Pair</th>
                  <th className="text-left py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Type</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Amount</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Price</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Total</th>
                  <th className="text-center py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-right py-2.5 px-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {tradesData.map((trade) => (
                  <tr key={trade.id} className="border-b border-border/30 dark:border-darkborder/30 hover:bg-muted/20 dark:hover:bg-white/3 transition-colors duration-150">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-muted/40 dark:bg-white/5 flex items-center justify-center">
                          <Icon icon={trade.icon} className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm text-dark dark:text-white">{trade.pair}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <Badge variant="outline" className={cn("text-[10px] font-semibold border-0 rounded px-1.5 py-0",
                        trade.type === "buy" ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                        {trade.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-right text-sm text-dark dark:text-white">{trade.amount.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right text-sm text-muted">{"$"}{trade.price.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-right text-sm font-medium text-dark dark:text-white">{"$"}{trade.total.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge variant="outline" className={cn("text-[10px] font-medium border-0 rounded px-1.5 py-0 capitalize", getStatusStyles(trade.status))}>
                        {trade.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-muted">{trade.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {openPositions.map((position, index) => {
              const isProfit = position.pnl >= 0;
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 dark:bg-white/3 transition-colors duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-darkgray flex items-center justify-center shadow-sm">
                      <Icon icon={position.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-dark dark:text-white">{position.pair}</span>
                        <Badge variant="outline" className={cn("text-[9px] font-bold border-0 rounded px-1 py-0",
                          position.type === "long" ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                          {position.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted">Entry: {"$"}{position.entry.toLocaleString()} &bull; Size: {position.amount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold text-base", isProfit ? "text-success" : "text-error")}>
                      {isProfit ? "+" : ""}{"$"}{position.pnl.toFixed(2)}
                    </p>
                    <p className={cn("text-[11px] font-medium", isProfit ? "text-success" : "text-error")}>
                      {isProfit ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted hover:text-error h-8 w-8 p-0">
                    <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTrades;