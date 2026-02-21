import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';

// Encryption utilities
const ENCRYPTION_KEY = Buffer.from(process.env.WALLET_ENCRYPTION_KEY || '', 'hex');
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Wallet generation functions
async function generateEthereumWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

async function generateSolanaWallet() {
  const keypair = Keypair.generate();
  return {
    address: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
}

// GET - Fetch spot wallets and balances
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  try {
    const response = await fetch(
      `https://trading.watchup.site/api/users/${userId}/spot-wallets`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch spot wallets' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching spot wallets:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Generate spot wallets
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  try {
    // Generate wallets
    const ethWallet = await generateEthereumWallet();
    const solWallet = await generateSolanaWallet();

    const assets = [
      { symbol: 'ETH', chain: 'evm', wallet: ethWallet },
      { symbol: 'USDT', chain: 'evm', wallet: ethWallet },
      { symbol: 'USDC', chain: 'evm', wallet: ethWallet },
      { symbol: 'SOL', chain: 'sol', wallet: solWallet },
    ];

    const walletData = assets.map((asset) => ({
      asset: asset.symbol,
      publicAddress: asset.wallet.address,
      encryptedPrivateKey: encrypt(asset.wallet.privateKey),
    }));

    // Send to backend
    const response = await fetch(
      `https://trading.watchup.site/api/users/${userId}/spot-wallets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets: walletData }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create spot wallets' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: 'Spot wallets created successfully',
      userId,
      wallets: walletData.map((w) => ({
        asset: w.asset,
        public_address: w.publicAddress,
      })),
    });
  } catch (error) {
    console.error('Error creating spot wallets:', error);
    return NextResponse.json(
      { error: 'Failed to create spot wallets', message: (error as Error).message },
      { status: 500 }
    );
  }
}
