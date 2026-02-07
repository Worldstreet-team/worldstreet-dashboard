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
    color: "bg-primary",
    lightColor: "bg-primary/10",
  },
  {
    label: "Today's P&L",
    value: "+$892.50",
    change: "12 trades",
    changePercent: "+3.72%",
    isPositive: true,
    icon: "solar:chart-2-bold-duotone",
    color: "bg-success",
    lightColor: "bg-success/10",
  },
  {
    label: "Open Positions",
    value: "5",
    change: "$4,280 invested",
    changePercent: "",
    isPositive: true,
    icon: "solar:layers-bold-duotone",
    color: "bg-warning",
    lightColor: "bg-warning/10",
  },
  {
    label: "Available Margin",
    value: "$20,570.00",
    change: "82.8% available",
    changePercent: "",
    isPositive: true,
    icon: "solar:safe-circle-bold-duotone",
    color: "bg-secondary",
    lightColor: "bg-secondary/10",
  },
];

const PortfolioStats = () => {
  const userName = "Trader";

  return (
    <div className="space-y-5">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Welcome back, {userName}!</h1>
          <p className="text-muted text-sm">Here's what's happening with your portfolio today.</p>
        </div>
        <div className="flex gap-3">
          <WalletModal 
            defaultTab="deposit"
            trigger={
              <Button className="bg-success hover:bg-success/90 text-white font-semibold rounded-xl px-5 shadow-lg shadow-success/25">
                <Icon icon="solar:arrow-down-bold" className="mr-2 h-4 w-4" />
                Deposit
              </Button>
            }
          />
          <WalletModal 
            defaultTab="withdraw"
            trigger={
              <Button variant="outline" className="border-2 border-warning text-warning hover:bg-warning hover:text-white font-semibold rounded-xl px-5">
                <Icon icon="solar:arrow-up-bold" className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid xl:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-5">
        {portfolioData.map((item, index) => (
          <Card 
            key={index} 
            className="border-0 shadow-md dark:bg-black dark:shadow-dark-md overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted font-medium mb-1">{item.label}</p>
                  <h3 className="text-2xl font-bold text-dark dark:text-white tracking-tight mb-2">
                    {item.value}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{item.change}</span>
                    {item.changePercent && (
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        item.isPositive 
                          ? "bg-success/10 text-success" 
                          : "bg-error/10 text-error"
                      )}>
                        {item.changePercent}
                      </span>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  item.lightColor
                )}>
                  <Icon 
                    icon={item.icon} 
                    className={cn(
                      "h-7 w-7",
                      item.color.replace("bg-", "text-")
                    )} 
                  />
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
