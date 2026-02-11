"use client";
import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RecentTrades = () => {
  return (
    <Card className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder animate-fade-in-up" style={{ animationDelay: "120ms" }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h5 className="text-base font-semibold text-dark dark:text-white">Trading Activity</h5>
            <p className="text-xs text-muted mt-0.5">Your recent trades</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 dark:bg-white/5 flex items-center justify-center mb-4">
            <Icon icon="solar:history-bold-duotone" className="h-8 w-8 text-muted/60" />
          </div>
          <h6 className="text-sm font-semibold text-dark dark:text-white mb-1">No Trading History</h6>
          <p className="text-xs text-muted max-w-[220px]">
            Your trading transactions will appear here once you start trading.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentTrades;