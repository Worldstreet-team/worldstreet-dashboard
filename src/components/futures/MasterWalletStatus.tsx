"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet, TrendingUp, AlertCircle } from 'lucide-react';

interface MasterWalletInfo {
  address: string;
  balance: number;
  totalFeesCollected?: number;
}

export const MasterWalletStatus: React.FC = () => {
  const [walletInfo, setWalletInfo] = useState<MasterWalletInfo | null>(null);
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchWalletInfo();
    fetchFeeSummary();
  }, []);
  
  const fetchWalletInfo = async () => {
    try {
      const response = await fetch('/api/futures/master/balance');
      const data = await response.json();
      
      if (data.success) {
        setWalletInfo(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch wallet info');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchFeeSummary = async () => {
    try {
      const response = await fetch('/api/futures/master/fees');
      const data = await response.json();
      
      if (data.success) {
        setFeeSummary(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch fee summary:', err);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }
  
  const isLowBalance = (walletInfo?.balance || 0) < 0.1;
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Master Wallet
          </CardTitle>
          <CardDescription>Platform fee collection wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="text-sm text-gray-500">Address</div>
            <div className="font-mono text-xs break-all">
              {walletInfo?.address}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Balance</div>
            <div className={`text-2xl font-bold ${isLowBalance ? 'text-red-500' : 'text-green-600'}`}>
              {walletInfo?.balance.toFixed(4)} SOL
            </div>
            {isLowBalance && (
              <div className="text-xs text-red-500 mt-1">
                ⚠️ Low balance - please top up
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {feeSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Fee Summary
            </CardTitle>
            <CardDescription>Platform revenue statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-sm text-gray-500">Total Fees Collected</div>
              <div className="text-2xl font-bold text-green-600">
                {feeSummary.totalFeesCollected.toFixed(4)} SOL
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Deposits</div>
                <div className="font-semibold">{feeSummary.numberOfDeposits}</div>
              </div>
              <div>
                <div className="text-gray-500">Avg Fee</div>
                <div className="font-semibold">{feeSummary.averageFeeAmount.toFixed(4)} SOL</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
