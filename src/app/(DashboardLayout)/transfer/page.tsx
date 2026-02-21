'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeftRight, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Balance {
  asset: string;
  available_balance: string;
  locked_balance: string;
}

interface SpotWallet {
  asset: string;
  public_address: string;
}

export default function TransferPage() {
  const [direction, setDirection] = useState<'main-to-spot' | 'spot-to-main'>('main-to-spot');
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [mainBalances, setMainBalances] = useState<Balance[]>([]);
  const [spotBalances, setSpotBalances] = useState<Balance[]>([]);
  const [spotWallets, setSpotWallets] = useState<SpotWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingWallet, setGeneratingWallet] = useState(false);

  const userId = 'user123'; // Replace with actual user ID from auth
  const assets = ['USDT', 'USDC', 'ETH', 'SOL'];

  useEffect(() => {
    fetchBalances();
    fetchSpotWallets();
  }, []);

  const fetchBalances = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/balances`);
      if (response.ok) {
        const data = await response.json();
        setMainBalances(data);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  };

  const fetchSpotWallets = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/spot-wallets`);
      if (response.ok) {
        const data = await response.json();
        setSpotWallets(data.wallets || []);
        setSpotBalances(data.balances || []);
      }
    } catch (err) {
      console.error('Failed to fetch spot wallets:', err);
    }
  };

  const handleGenerateWallets = async () => {
    setGeneratingWallet(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${userId}/spot-wallets`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Spot wallets generated successfully!');
        await fetchSpotWallets();
      } else {
        setError(data.error || 'Failed to generate wallets');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setGeneratingWallet(false);
    }
  };

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          asset: selectedAsset,
          amount: parseFloat(amount),
          direction,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully transferred ${amount} ${selectedAsset}`);
        setAmount('');
        await fetchBalances();
        await fetchSpotWallets();
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    setDirection(direction === 'main-to-spot' ? 'spot-to-main' : 'main-to-spot');
    setAmount('');
    setError('');
    setSuccess('');
  };

  const getBalance = (asset: string, isSpot: boolean) => {
    const balances = isSpot ? spotBalances : mainBalances;
    const balance = balances.find(b => b.asset === asset);
    return balance ? parseFloat(balance.available_balance) : 0;
  };

  const getSpotWallet = (asset: string) => {
    return spotWallets.find(w => w.asset === asset);
  };

  const currentBalance = direction === 'main-to-spot' 
    ? getBalance(selectedAsset, false)
    : getBalance(selectedAsset, true);

  const hasSpotWallets = spotWallets.length > 0;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Transfer Funds</h1>

      {!hasSpotWallets && (
        <Alert className="mb-6">
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            You need to generate spot wallets before transferring funds.
            <Button
              onClick={handleGenerateWallets}
              disabled={generatingWallet}
              className="ml-4"
              size="sm"
            >
              {generatingWallet ? 'Generating...' : 'Generate Spot Wallets'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {/* Direction Toggle */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-4 bg-muted p-2 rounded-lg">
              <span className={`font-medium ${direction === 'main-to-spot' ? 'text-primary' : 'text-muted-foreground'}`}>
                Main Wallet
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDirection}
                className="h-8 w-8"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <span className={`font-medium ${direction === 'spot-to-main' ? 'text-primary' : 'text-muted-foreground'}`}>
                Spot Wallet
              </span>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="mb-4">
            <Label>Select Asset</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {assets.map((asset) => (
                <Button
                  key={asset}
                  variant={selectedAsset === asset ? 'default' : 'outline'}
                  onClick={() => setSelectedAsset(asset)}
                  className="w-full"
                >
                  {asset}
                </Button>
              ))}
            </div>
          </div>

          {/* Balance Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Main Wallet</p>
              <p className="text-lg font-semibold">
                {getBalance(selectedAsset, false).toFixed(6)} {selectedAsset}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Spot Wallet</p>
              <p className="text-lg font-semibold">
                {getBalance(selectedAsset, true).toFixed(6)} {selectedAsset}
              </p>
              {hasSpotWallets && getSpotWallet(selectedAsset) && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {getSpotWallet(selectedAsset)?.public_address}
                </p>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <Label>Amount</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setAmount((currentBalance * 0.25).toString())}
              >
                25%
              </Button>
              <Button
                variant="outline"
                onClick={() => setAmount((currentBalance * 0.5).toString())}
              >
                50%
              </Button>
              <Button
                variant="outline"
                onClick={() => setAmount((currentBalance * 0.75).toString())}
              >
                75%
              </Button>
              <Button
                variant="outline"
                onClick={() => setAmount(currentBalance.toString())}
              >
                Max
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Available: {currentBalance.toFixed(6)} {selectedAsset}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-500 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Transfer Button */}
          <Button
            onClick={handleTransfer}
            disabled={loading || !hasSpotWallets || !amount}
            className="w-full"
            size="lg"
          >
            {loading ? 'Processing...' : `Transfer ${direction === 'main-to-spot' ? 'to Spot' : 'to Main'}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
