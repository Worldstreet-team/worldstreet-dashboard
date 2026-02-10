"use client";
import React from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import WalletModal from "./WalletModal";

const portfolioData = [
  {
    label: "Total Balance",
    value: "$24,850.00",
    change: "+$1,250.00",
    changePercent: "+5.29%",
    isPositive: true,
    icon: "solar:wallet-bold-duotone",
    iconColor: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    label: "Today's P&L",
    value: "+$892.50",
    change: "12 trades",
    changePercent: "+3.72%",
    isPositive: true,
    icon: "solar:chart-2-bold-duotone",
    iconColor: "text-success",
    bgColor: "bg-success/8",
  },
  {
    label: "Open Positions",
    value: "5",
    change: "$4,280 invested",
    changePercent: "",
    isPositive: true,
    icon: "solar:layers-bold-duotone",
    iconColor: "text-warning",
    bgColor: "bg-warning/8",
  },
  {
    label: "Available Margin",
    value: "$20,570.00",
    change: "82.8% available",
    changePercent: "",
    isPositive: true,
    icon: "solar:safe-circle-bold-duotone",
    iconColor: "text-info",
    bgColor: "bg-info/8",
  },
];

const PortfolioStats = () => {
  const userName = "Trader";

  return (
    <div className="space-y-5">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-semibold text-dark dark:text-white tracking-tight">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted text-sm mt-0.5">
            Here&apos;s what&apos;s happening with your portfolio today.
          </p>
        </div>
        <div className="flex gap-2.5">
          <WalletModal
            defaultTab="deposit"
            trigger={
              <Button className="bg-success hover:bg-success/90 text-white font-medium rounded-lg px-4 h-9 text-sm shadow-sm transition-all duration-200 hover:shadow-md">
                <Icon icon="solar:arrow-down-bold" className="mr-1.5 h-3.5 w-3.5" />
                Deposit
              </Button>
            }
          />
          <WalletModal
            defaultTab="withdraw"
            trigger={
              <Button variant="outline" className="border-border text-warning hover:bg-warning hover:text-white font-medium rounded-lg px-4 h-9 text-sm transition-all duration-200">
                <Icon icon="solar:arrow-up-bold" className="mr-1.5 h-3.5 w-3.5" />
                Withdraw
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4 stagger-children">
        {portfolioData.map((item, index) => (
          <Card
            key={index}
            className="border border-border/50 shadow-sm dark:bg-black dark:border-darkborder overflow-hidden group hover:shadow-md hover:border-border transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-2">
                    {item.label}
                  </p>
                  <h3 className="text-2xl font-bold text-dark dark:text-white tracking-tight mb-1.5">
                    {item.value}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{item.change}</span>
                    {item.changePercent && (
                      <span
                        className={cn(
                          "text-[11px] font-semibold px-1.5 py-0.5 rounded",
                          item.isPositive
                            ? "bg-success/10 text-success"
                            : "bg-error/10 text-error"
                        )}
                      >
                        {item.changePercent}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
                    item.bgColor
                  )}
                >
                  <Icon icon={item.icon} className={cn("h-5 w-5", item.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PortfolioStats;
