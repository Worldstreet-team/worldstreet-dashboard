"use client";

import React, { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

const RecentTrades = () => {
  const { recentTrades } = useTradingStore();

  return (
    <Card className="border border-border/50 shadow-sm bg-[#0b0e11] text-gray-200 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-white/5 bg-[#161a1e]">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Recent Trades</h5>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-sm">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase">Live</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-[300px] overflow-hidden">
        {recentTrades.length === 0 ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Waiting for trades...
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Headers */}
            <div className="flex items-center px-4 py-2 border-b border-white/5 text-[9px] font-bold text-gray-500 uppercase">
              <span className="w-[35%]">Price(USDT)</span>
              <span className="w-[30%] text-right">Amount(BTC)</span>
              <span className="w-[35%] text-right">Time</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {recentTrades.map((trade) => (
                <div
                  key={`${trade.id}-${trade.time}`}
                  className="flex items-center px-4 py-1.5 hover:bg-white/5 transition-colors group cursor-default"
                >
                  <div className={cn("w-[35%] text-[11px] font-mono font-medium tabular-nums",
                    trade.side === "buy" ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="w-[30%] text-right text-[11px] font-mono text-gray-300 tabular-nums">
                    {parseFloat(trade.amount).toFixed(5)}
                  </div>
                  <div className="w-[35%] text-right text-[10px] font-mono text-gray-500 tabular-nums">
                    {new Date(trade.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(RecentTrades);
