"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/authContext";
import { useWallet } from "@/app/context/walletContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useBitcoin } from "@/app/context/bitcoinContext";
import { usePrices, getPrice, calculateDailyPnL } from "@/lib/wallet/usePrices";
import { formatUSD } from "@/lib/wallet/amounts";
import WalletModal from "./WalletModal";

const PortfolioStats = () => {
  const { user } = useAuth();
  const { walletsGenerated, addresses } = useWallet();
  const { balance: solBalance, tokenBalances: solTokens } = useSolana();
  const { balance: ethBalance, tokenBalances: ethTokens } = useEvm();
  const { balance: btcBalance } = useBitcoin();
  const { prices, coins, loading: pricesLoading } = usePrices();

  // State for network selection and balances
  const [selectedNetwork, setSelectedNetwork] = useState<'solana' | 'ethereum'>('solana');
  const [spotBalance, setSpotBalance] = useState(0);
  const [futuresBalance, setFuturesBalance] = useState(0);
  const [loadingSpot, setLoadingSpot] = useState(false);
  const [loadingFutures, setLoadingFutures] = useState(false);

  // Get USDT balance based on selected network
  const mainWalletBalance = useMemo(() => {
    if (selectedNetwork === 'solana') {
      const usdtToken = solTokens.find(t => t.symbol === "USDT");
      return usdtToken?.amount ?? 0;
    } else {
      const usdtToken = ethTokens.find(t => t.symbol === "USDT");
      return usdtToken?.amount ?? 0;
    }
  }, [selectedNetwork, solTokens, ethTokens]);

  // Fetch spot balance (sum of open positions invested value)
  useEffect(() => {
    const fetchSpotBalance = async () => {
      if (!user?.userId) return;
      setLoadingSpot(true);
      try {
        const response = await fetch('/api/positions?status=OPEN');
        if (response.ok) {
          const data = await response.json();
          const positions = Array.isArray(data) ? data : data.positions || [];
          // Sum up invested quote amounts (in USDT)
          const total = positions.reduce((sum: number, pos: any) => {
            return sum + parseFloat(pos.investedQuote || '0');
          }, 0);
          setSpotBalance(total);
        }
      } catch (error) {
        console.error('Error fetching spot balance:', error);
      } finally {
        setLoadingSpot(false);
      }
    };

    fetchSpotBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSpotBalance, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch futures balance
  useEffect(() => {
    const fetchFuturesBalance = async () => {
      if (!user?.userId) return;
      setLoadingFutures(true);
      try {
        const response = await fetch('/api/futures/wallet/balance');
        if (response.ok) {
          const data = await response.json();
          setFuturesBalance(data.usdtBalance || 0);
        }
      } catch (error) {
        console.error('Error fetching futures balance:', error);
      } finally {
        setLoadingFutures(false);
      }
    };

    fetchFuturesBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchFuturesBalance, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate total balance
  const totalBalance = useMemo(() => {
    if (!walletsGenerated) return 0;
    
    let total = 0;
    
    // Native coins
    total += solBalance * getPrice(prices, "SOL");
    total += ethBalance * getPrice(prices, "ETH");
    total += btcBalance * getPrice(prices, "BTC");
    
    // Solana tokens
    solTokens.forEach((token) => {
      total += token.amount * getPrice(prices, token.symbol);
    });
    
    // ERC20 tokens
    ethTokens.forEach((token) => {
      total += token.amount * getPrice(prices, token.symbol);
    });
    
    return total;
  }, [walletsGenerated, solBalance, ethBalance, btcBalance, solTokens, ethTokens, prices]);

  // Calculate holdings map for P&L
  const holdings = useMemo(() => {
    if (!walletsGenerated) return {};
    
    const h: Record<string, number> = {};
    
    // Native coins
    h["SOL"] = solBalance;
    h["ETH"] = ethBalance;
    h["BTC"] = btcBalance;
    
    // Solana tokens
    solTokens.forEach((token) => {
      h[token.symbol] = (h[token.symbol] || 0) + token.amount;
    });
    
    // ERC20 tokens
    ethTokens.forEach((token) => {
      h[token.symbol] = (h[token.symbol] || 0) + token.amount;
    });
    
    return h;
  }, [walletsGenerated, solBalance, ethBalance, btcBalance, solTokens, ethTokens]);

  // Calculate 24h P&L
  const dailyPnL = useMemo(() => {
    return calculateDailyPnL(holdings, prices, coins);
  }, [holdings, prices, coins]);

  const pnlPercent = useMemo(() => {
    if (totalBalance === 0 || dailyPnL === 0) return 0;
    // P&L % = (pnl / (totalBalance - pnl)) * 100
    const previousValue = totalBalance - dailyPnL;
    if (previousValue === 0) return 0;
    return (dailyPnL / previousValue) * 100;
  }, [totalBalance, dailyPnL]);

  const userName = user?.firstName || "Trader";

  // Build portfolio data with real values
  const portfolioData = [
    {
      label: "Total Balance",
      value: formatUSD(totalBalance),
      change: walletsGenerated ? (pricesLoading ? "Loading..." : "Live prices") : "Set up wallet",
      changePercent: "",
      isPositive: true,
      icon: "solar:wallet-bold-duotone",
      iconColor: "text-primary",
      bgColor: "bg-primary/8",
    },
    {
      label: "Today's P&L",
      value: `${dailyPnL >= 0 ? "+" : ""}${formatUSD(dailyPnL)}`,
      change: "24h change",
      changePercent: pnlPercent !== 0 ? `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%` : "",
      isPositive: dailyPnL >= 0,
      icon: "solar:chart-2-bold-duotone",
      iconColor: dailyPnL >= 0 ? "text-success" : "text-error",
      bgColor: dailyPnL >= 0 ? "bg-success/8" : "bg-error/8",
    },
    {
      label: "Assets",
      value: String(Object.keys(holdings).filter(k => holdings[k] > 0).length),
      change: walletsGenerated ? "Active tokens" : "No wallet",
      changePercent: "",
      isPositive: true,
      icon: "solar:layers-bold-duotone",
      iconColor: "text-warning",
      bgColor: "bg-warning/8",
    },
    {
      label: "Networks",
      value: walletsGenerated ? "3" : "0",
      change: walletsGenerated ? "SOL, ETH, BTC" : "Set up wallet",
      changePercent: "",
      isPositive: true,
      icon: "solar:safe-circle-bold-duotone",
      iconColor: "text-info",
      bgColor: "bg-info/8",
    },
  ];

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

      {/* Balance Cards Grid */}
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
        {/* Main Wallet Card - USDT with Network Switch */}
        <Card className="border-2 border-primary/20 shadow-md dark:bg-gradient-to-br dark:from-black dark:to-primary/5 dark:border-primary/30 overflow-hidden animate-fade-in-up">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#26A17B] to-[#1a7a5c] flex items-center justify-center shadow-lg">
                  <Icon icon="cryptocurrency-color:usdt" className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Main Wallet</p>
                  <p className="text-[10px] text-muted mt-0.5">USDT Balance</p>
                </div>
              </div>
            </div>
            
            {/* Network Selector */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSelectedNetwork('solana')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                  selectedNetwork === 'solana'
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted/30 dark:bg-white/5 text-muted hover:bg-muted/50 dark:hover:bg-white/10"
                )}
              >
                <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" className="w-4 h-4 rounded-full" />
                Solana
              </button>
              <button
                onClick={() => setSelectedNetwork('ethereum')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                  selectedNetwork === 'ethereum'
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted/30 dark:bg-white/5 text-muted hover:bg-muted/50 dark:hover:bg-white/10"
                )}
              >
                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" alt="ETH" className="w-4 h-4 rounded-full" />
                Ethereum
              </button>
            </div>

            <h3 className="text-2xl font-bold text-dark dark:text-white tracking-tight mb-2">
              ${mainWalletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-muted">
              {walletsGenerated && addresses?.[selectedNetwork]
                ? `${addresses[selectedNetwork].slice(0, 8)}...${addresses[selectedNetwork].slice(-6)}`
                : "Set up wallet to view address"
              }
            </p>
          </CardContent>
        </Card>

        {/* Spot Balance Card */}
        <Card className="border-2 border-blue-500/20 shadow-md dark:bg-gradient-to-br dark:from-black dark:to-blue-500/5 dark:border-blue-500/30 overflow-hidden animate-fade-in-up" style={{ animationDelay: "40ms" }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Icon icon="solar:chart-2-bold-duotone" className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Spot Trading</p>
                  <p className="text-[10px] text-muted mt-0.5">Open Positions</p>
                </div>
              </div>
            </div>

            {loadingSpot ? (
              <div className="flex items-center gap-2 my-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/20 border-t-primary" />
                <span className="text-xs text-muted">Loading...</span>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-dark dark:text-white tracking-tight mb-2">
                  ${spotBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-muted">Total invested in USDT</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Futures Balance Card */}
        <Card className="border-2 border-orange-500/20 shadow-md dark:bg-gradient-to-br dark:from-black dark:to-orange-500/5 dark:border-orange-500/30 overflow-hidden animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Icon icon="solar:graph-up-bold-duotone" className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider">Futures Trading</p>
                  <p className="text-[10px] text-muted mt-0.5">Wallet Balance</p>
                </div>
              </div>
            </div>

            {loadingFutures ? (
              <div className="flex items-center gap-2 my-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/20 border-t-primary" />
                <span className="text-xs text-muted">Loading...</span>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-dark dark:text-white tracking-tight mb-2">
                  ${futuresBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-muted">Available USDT</p>
              </>
            )}
          </CardContent>
        </Card>
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
