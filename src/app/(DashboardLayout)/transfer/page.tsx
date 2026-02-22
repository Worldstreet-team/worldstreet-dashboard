"use client";

import React, { useState, useEffect } from 'react';
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";
import { useWallet } from "@/app/context/walletContext";
import { useSolana } from "@/app/context/solanaContext";
import { useEvm } from "@/app/context/evmContext";
import { useAuth } from "@/app/context/authContext";
import CryptoJS from "crypto-js";

interface Balance {
  asset: string;
  available_balance: string;
  locked_balance: string;
}

interface SpotWallet {
  asset: string;
  public_address: string;
}

const ASSET_ICONS: Record<string, string> = {
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  SOL: "https://cryptologos.cc/logos/solana-sol-logo.png",
};

// Token addresses for finding balances
const TOKEN_ADDRESSES = {
  USDT: {
    solana: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT on Solana
    ethereum: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on Ethereum
  },
  USDC: {
    solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
    ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC on Ethereum
  },
};

export default function TransferPage() {
  const { user } = useAuth();
  const { addresses, getEncryptedKeys } = useWallet();
  const { 
    balance: solBalance, 
    tokenBalances: solTokens, 
    fetchBalance: fetchSolBalance,
    sendTransaction: sendSolTransaction,
    sendTokenTransaction: sendSolTokenTransaction,
  } = useSolana();
  const { 
    balance: ethBalance, 
    tokenBalances: ethTokens, 
    fetchBalance: fetchEthBalance,
    sendTransaction: sendEthTransaction,
    sendTokenTransaction: sendEthTokenTransaction,
  } = useEvm();

  const [direction, setDirection] = useState<'main-to-spot' | 'spot-to-main'>('main-to-spot');
  const [selectedAsset, setSelectedAsset] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [spotBalances, setSpotBalances] = useState<Balance[]>([]);
  const [spotWallets, setSpotWallets] = useState<SpotWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [spotWalletsLoading, setSpotWalletsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingWallet, setGeneratingWallet] = useState(false);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');

  const userId = user?.userId || '';
  const assets = ['USDT', 'USDC', 'ETH', 'SOL'];

  // Fetch on-chain balances when addresses are available
  useEffect(() => {
    if (addresses?.solana && addresses?.ethereum) {
      setBalancesLoading(true);
      Promise.all([
        fetchSolBalance(addresses.solana),
        fetchEthBalance(addresses.ethereum),
      ]).finally(() => setBalancesLoading(false));
    }
  }, [addresses, fetchSolBalance, fetchEthBalance]);

  useEffect(() => {
    if (userId) {
      fetchSpotWallets();
    }
  }, [userId]);

  const fetchSpotWallets = async () => {
    if (!userId) return;
    
    setSpotWalletsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/spot-wallets`);
      if (response.ok) {
        const data = await response.json();
        console.log('=== SPOT WALLETS API RESPONSE ===');
        console.log('Raw response:', JSON.stringify(data, null, 2));
        
        // Backend returns wallets as an array directly
        let walletsArray: SpotWallet[] = [];
        
        // Handle different possible response structures
        if (Array.isArray(data.wallets)) {
          console.log('Wallets is an array with', data.wallets.length, 'items');
          // If wallets is already an array of objects with asset and public_address
          walletsArray = data.wallets
            .map((w: any) => {
              console.log('Processing wallet:', JSON.stringify(w, null, 2));
              const asset = (w.asset || w.symbol || w.currency || '').toUpperCase();
              const address = w.public_address || w.publicAddress || w.address || w.wallet_address || '';
              
              console.log(`Mapped: ${asset} -> ${address}`);
              
              return {
                asset,
                public_address: address,
              };
            })
            .filter((w: SpotWallet) => w.asset && w.public_address); // Filter out invalid entries
        } else if (typeof data.wallets === 'object' && data.wallets !== null) {
          console.log('Wallets is an object');
          // If wallets is an object like { USDT: { public_address: "..." }, ... }
          walletsArray = Object.entries(data.wallets)
            .map(([asset, wallet]: [string, any]) => {
              console.log(`Processing ${asset}:`, JSON.stringify(wallet, null, 2));
              
              let address = '';
              if (typeof wallet === 'string') {
                address = wallet;
              } else if (typeof wallet === 'object' && wallet !== null) {
                address = wallet.public_address || wallet.publicAddress || wallet.address || wallet.wallet_address || '';
              }
              
              console.log(`Mapped: ${asset} -> ${address}`);
              
              return {
                asset: asset.toUpperCase(),
                public_address: address,
              };
            })
            .filter((w: SpotWallet) => w.asset && w.public_address); // Filter out invalid entries
        }
        
        const balancesArray = Array.isArray(data.balances) ? data.balances : [];
        
        console.log('=== PROCESSED WALLETS ===');
        console.log(JSON.stringify(walletsArray, null, 2));
        console.log('=== BALANCES ===');
        console.log(JSON.stringify(balancesArray, null, 2));
        
        setSpotWallets(walletsArray);
        setSpotBalances(balancesArray);
      } else {
        console.error('Failed to fetch spot wallets:', response.status);
        // If 404, wallets don't exist yet
        if (response.status === 404) {
          setSpotWallets([]);
          setSpotBalances([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch spot wallets:', err);
    } finally {
      setSpotWalletsLoading(false);
    }
  };

  const handleGenerateWallets = async () => {
    if (!userId) return;
    
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
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setSuccess('');

    if (direction === 'main-to-spot') {
      // Main to Spot: Show PIN modal
      setShowPinModal(true);
    } else {
      // Spot to Main: Execute directly via backend
      await executeSpotToMain();
    }
  };

  const executeMainToSpot = async () => {
    const pinString = pin.join('');
    if (pinString.length !== 6) return;

    setLoading(true);
    setPinError('');

    try {
      // Get the spot wallet address for the selected asset
      const spotWallet = getSpotWallet(selectedAsset);
      console.log('=== TRANSFER VALIDATION ===');
      console.log('Selected asset:', selectedAsset);
      console.log('All spot wallets:', JSON.stringify(spotWallets, null, 2));
      console.log('Found spot wallet:', JSON.stringify(spotWallet, null, 2));
      
      if (!spotWallet) {
        setPinError(`No spot wallet found for ${selectedAsset}. Please generate spot wallets first.`);
        setLoading(false);
        return;
      }

      if (!spotWallet.public_address) {
        setPinError(`Spot wallet for ${selectedAsset} has no address. Please regenerate spot wallets.`);
        setLoading(false);
        return;
      }

      // Validate the address format
      const recipientAddress = spotWallet.public_address.trim();
      if (!recipientAddress) {
        setPinError(`Invalid spot wallet address for ${selectedAsset} (empty after trim)`);
        setLoading(false);
        return;
      }

      // Additional validation for Solana addresses (base58 check)
      if (selectedAsset === 'SOL' || selectedAsset === 'USDT' || selectedAsset === 'USDC') {
        // Basic Solana address validation: should be 32-44 characters, base58
        if (recipientAddress.length < 32 || recipientAddress.length > 44) {
          setPinError(`Invalid Solana address length for ${selectedAsset}: ${recipientAddress.length} chars`);
          setLoading(false);
          return;
        }
        
        // Check for invalid base58 characters
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
        if (!base58Regex.test(recipientAddress)) {
          setPinError(`Invalid Solana address format for ${selectedAsset}. Contains non-base58 characters.`);
          setLoading(false);
          return;
        }
      }

      console.log('Validated recipient address:', recipientAddress);

      // Get encrypted keys with PIN hash
      const pinHash = CryptoJS.SHA256(pinString).toString();
      const encryptedKeys = await getEncryptedKeys(pinHash);
      if (!encryptedKeys) {
        setPinError('Invalid PIN');
        setLoading(false);
        return;
      }

      let txHash = '';
      const amountNum = parseFloat(amount);

      // Determine which blockchain to use based on asset
      if (selectedAsset === 'SOL') {
        // Send SOL using Solana context
        if (!encryptedKeys.solana?.encryptedPrivateKey) {
          setPinError('Solana wallet not available');
          setLoading(false);
          return;
        }
        txHash = await sendSolTransaction(
          encryptedKeys.solana.encryptedPrivateKey,
          pinString,
          recipientAddress,
          amountNum
        );
      } else if (selectedAsset === 'ETH') {
        // Send ETH using EVM context
        if (!encryptedKeys.ethereum?.encryptedPrivateKey) {
          setPinError('Ethereum wallet not available');
          setLoading(false);
          return;
        }
        txHash = await sendEthTransaction(
          encryptedKeys.ethereum.encryptedPrivateKey,
          pinString,
          recipientAddress,
          amountNum
        );
      } else if (selectedAsset === 'USDT' || selectedAsset === 'USDC') {
        // For stablecoins, check which chain has balance
        const solToken = solTokens.find(t => 
          t.address.toLowerCase() === TOKEN_ADDRESSES[selectedAsset].solana.toLowerCase()
        );
        const ethToken = ethTokens.find(t => 
          t.address.toLowerCase() === TOKEN_ADDRESSES[selectedAsset].ethereum.toLowerCase()
        );

        if (solToken && solToken.amount >= amountNum) {
          // Use Solana
          if (!encryptedKeys.solana?.encryptedPrivateKey) {
            setPinError('Solana wallet not available');
            setLoading(false);
            return;
          }
          txHash = await sendSolTokenTransaction(
            encryptedKeys.solana.encryptedPrivateKey,
            pinString,
            recipientAddress,
            amountNum,
            TOKEN_ADDRESSES[selectedAsset].solana,
            solToken.decimals
          );
        } else if (ethToken && ethToken.amount >= amountNum) {
          // Use Ethereum
          if (!encryptedKeys.ethereum?.encryptedPrivateKey) {
            setPinError('Ethereum wallet not available');
            setLoading(false);
            return;
          }
          txHash = await sendEthTokenTransaction(
            encryptedKeys.ethereum.encryptedPrivateKey,
            pinString,
            recipientAddress,
            amountNum,
            TOKEN_ADDRESSES[selectedAsset].ethereum,
            ethToken.decimals
          );
        } else {
          setPinError(`Insufficient ${selectedAsset} balance`);
          setLoading(false);
          return;
        }
      }

      setSuccess(`Successfully transferred ${amount} ${selectedAsset}. TX: ${txHash.slice(0, 8)}...`);
      setAmount('');
      setShowPinModal(false);
      setPin(['', '', '', '', '', '']);
      
      // Refresh balances
      if (addresses?.solana && addresses?.ethereum) {
        await Promise.all([
          fetchSolBalance(addresses.solana),
          fetchEthBalance(addresses.ethereum),
        ]);
      }
      await fetchSpotWallets();
    } catch (err) {
      console.error('Transfer error:', err);
      setPinError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const executeSpotToMain = async () => {
    setLoading(true);

    try {
      // Get the main wallet address for the selected asset
      let destinationAddress = '';
      if (selectedAsset === 'SOL') {
        destinationAddress = addresses?.solana || '';
      } else if (selectedAsset === 'ETH' || selectedAsset === 'USDT' || selectedAsset === 'USDC') {
        destinationAddress = addresses?.ethereum || '';
      }

      if (!destinationAddress) {
        setError('Main wallet address not found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          asset: selectedAsset,
          amount: parseFloat(amount),
          direction,
          destinationAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully transferred ${amount} ${selectedAsset}. TX: ${data.txHash?.slice(0, 8)}...`);
        setAmount('');
        
        // Refresh balances
        if (addresses?.solana && addresses?.ethereum) {
          await Promise.all([
            fetchSolBalance(addresses.solana),
            fetchEthBalance(addresses.ethereum),
          ]);
        }
        await fetchSpotWallets();
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err instanceof Error ? err.message : 'Transfer failed');
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

  // Get main wallet balance from on-chain data (Solana/EVM contexts)
  const getMainBalance = (asset: string): number => {
    if (asset === 'SOL') {
      return solBalance;
    } else if (asset === 'ETH') {
      return ethBalance;
    } else if (asset === 'USDT' || asset === 'USDC') {
      // Check Solana tokens first
      const solToken = solTokens.find(t => 
        t.address.toLowerCase() === TOKEN_ADDRESSES[asset].solana.toLowerCase()
      );
      if (solToken && solToken.amount > 0) {
        return solToken.amount;
      }
      
      // Check Ethereum tokens
      const ethToken = ethTokens.find(t => 
        t.address.toLowerCase() === TOKEN_ADDRESSES[asset].ethereum.toLowerCase()
      );
      if (ethToken) {
        return ethToken.amount;
      }
    }
    return 0;
  };

  // Get spot wallet balance from backend
  const getSpotBalance = (asset: string): number => {
    const balance = spotBalances.find(b => b.asset === asset);
    return balance ? parseFloat(balance.available_balance) : 0;
  };

  const getSpotWallet = (asset: string) => {
    return spotWallets.find(w => w.asset === asset);
  };

  const currentBalance = direction === 'main-to-spot' 
    ? getMainBalance(selectedAsset)
    : getSpotBalance(selectedAsset);

  const hasSpotWallets = spotWallets.length > 0;

  // PIN handlers
  const pinRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) pinRefs.current[index + 1]?.focus();
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Transfer Funds</h1>
        <p className="text-muted text-sm mt-1">
          Move funds between your main wallet and spot trading wallet
        </p>
      </div>

      {/* Wallet Setup Alert - Only show after loading completes */}
      {!spotWalletsLoading && !hasSpotWallets && (
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="ph:wallet" className="text-primary" width={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-dark dark:text-white mb-1">Setup Spot Wallets</h3>
              <p className="text-sm text-muted mb-4">
                Generate dedicated spot trading wallets to start transferring funds
              </p>
              <button
                onClick={handleGenerateWallets}
                disabled={generatingWallet}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingWallet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon icon="ph:plus-circle" width={18} />
                    Generate Spot Wallets
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transfer Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Direction Toggle */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Transfer Direction</h3>
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-4 bg-muted/30 dark:bg-white/5 p-3 rounded-xl">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  direction === 'main-to-spot' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted'
                }`}>
                  <Icon icon="ph:wallet" width={18} />
                  <span className="font-medium">Main Wallet</span>
                </div>
                <button
                  onClick={toggleDirection}
                  className="p-2 rounded-lg bg-white dark:bg-black hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon icon="ph:arrows-left-right" width={20} className="text-primary" />
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  direction === 'spot-to-main' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-muted'
                }`}>
                  <Icon icon="ph:chart-line" width={18} />
                  <span className="font-medium">Spot Wallet</span>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Selection */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Select Asset</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset}
                  onClick={() => setSelectedAsset(asset)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAsset === asset
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 dark:border-darkborder hover:border-primary/50'
                  }`}
                >
                  <img src={ASSET_ICONS[asset]} alt={asset} className="w-8 h-8 rounded-full" />
                  <span className="font-semibold text-dark dark:text-white">{asset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <h3 className="font-semibold text-dark dark:text-white mb-4">Transfer Amount</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-2 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img src={ASSET_ICONS[selectedAsset]} alt={selectedAsset} className="w-5 h-5 rounded-full" />
                    <span className="font-semibold text-dark dark:text-white">{selectedAsset}</span>
                  </div>
                </div>
                <p className="text-xs text-muted mt-2">
                  Available: {currentBalance.toFixed(6)} {selectedAsset}
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAmount((currentBalance * 0.25).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  25%
                </button>
                <button
                  onClick={() => setAmount((currentBalance * 0.5).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmount((currentBalance * 0.75).toString())}
                  className="flex-1 px-3 py-2 bg-muted/30 dark:bg-white/5 rounded-lg text-sm font-medium text-dark dark:text-white hover:bg-muted/40 dark:hover:bg-white/10 transition-colors"
                >
                  75%
                </button>
                <button
                  onClick={() => setAmount(currentBalance.toString())}
                  className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <Icon icon="ph:warning-circle" className="text-red-500 shrink-0" width={20} />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
                <Icon icon="ph:check-circle" className="text-green-500 shrink-0" width={20} />
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={loading || !hasSpotWallets || !amount}
              className="w-full mt-6 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon icon="ph:arrow-right" width={20} />
                  Transfer {direction === 'main-to-spot' ? 'to Spot' : 'to Main'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Balance Overview */}
        <div className="space-y-6">
          {/* Main Wallet Balance */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Icon icon="ph:wallet" className="text-blue-500" width={20} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">Main Wallet</h3>
                <p className="text-xs text-muted">Available Balance</p>
              </div>
            </div>
            <div className="space-y-3">
              {assets.map((asset) => (
                <div key={asset} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={ASSET_ICONS[asset]} alt={asset} className="w-6 h-6 rounded-full" />
                    <span className="text-sm font-medium text-dark dark:text-white">{asset}</span>
                  </div>
                  <span className="text-sm font-semibold text-dark dark:text-white">
                    {balancesLoading ? (
                      <span className="text-muted">...</span>
                    ) : (
                      getMainBalance(asset).toFixed(6)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spot Wallet Balance */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon icon="ph:chart-line" className="text-purple-500" width={20} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">Spot Wallet</h3>
                <p className="text-xs text-muted">Trading Balance</p>
              </div>
            </div>
            {spotWalletsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : hasSpotWallets ? (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <img src={ASSET_ICONS[asset]} alt={asset} className="w-6 h-6 rounded-full" />
                        <span className="text-sm font-medium text-dark dark:text-white">{asset}</span>
                      </div>
                      <span className="text-sm font-semibold text-dark dark:text-white">
                        {getSpotBalance(asset).toFixed(6)}
                      </span>
                    </div>
                    {getSpotWallet(asset) && (
                      <p className="text-[10px] text-muted truncate ml-8">
                        {getSpotWallet(asset)?.public_address}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">No spot wallets generated</p>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border/50 dark:border-darkborder p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="ph:info" className="text-primary" width={18} />
              <h3 className="font-semibold text-dark dark:text-white text-sm">Transfer Info</h3>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <p>• Transfers are instant and free</p>
              <p>• Spot wallets are used for trading only</p>
              <p>• Main wallet is for general storage</p>
              <p>• You can transfer back anytime</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !loading && setShowPinModal(false)} 
          />
          <div className="relative bg-white dark:bg-black border border-border/50 dark:border-darkborder rounded-2xl w-full max-w-md mx-4 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2 text-center">
              Confirm Transfer
            </h3>
            <p className="text-sm text-muted text-center mb-1">
              Transferring <span className="font-semibold text-dark dark:text-white">{amount} {selectedAsset}</span>
            </p>
            <p className="text-sm text-muted text-center mb-1">
              From <span className="font-semibold text-dark dark:text-white">Main Wallet</span> to{' '}
              <span className="font-semibold text-dark dark:text-white">Spot Wallet</span>
            </p>
            <p className="text-xs text-muted text-center mb-6">
              Enter your 6-digit PIN to authorize this transfer.
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-darkborder rounded-xl text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-sm text-red-500 text-center mb-4">{pinError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setShowPinModal(false); 
                  setPin(['', '', '', '', '', '']); 
                  setPinError(''); 
                }}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-muted/30 dark:bg-white/5 text-dark dark:text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeMainToSpot}
                disabled={pin.some((d) => !d) || loading}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
