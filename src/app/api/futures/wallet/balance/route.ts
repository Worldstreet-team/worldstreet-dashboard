import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const BASE_API_URL = 'https://trading.watchup.site';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana mainnet

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First, get the wallet address from backend
    const walletResponse = await fetch(
      `${BASE_API_URL}/api/futures/wallet?userId=${userId}&chain=solana`
    );

    if (!walletResponse.ok) {
      if (walletResponse.status === 404) {
        return NextResponse.json(
          { error: 'Futures wallet not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch wallet address');
    }

    const walletData = await walletResponse.json();
    const walletAddress = walletData.walletAddress;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address not found' },
        { status: 404 }
      );
    }

    // Connect to Solana RPC
    const rpcUrl = process.env.NEXT_PUBLIC_SOL_RPC || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get wallet public key
    const walletPubkey = new PublicKey(walletAddress);

    // Get SOL balance
    const solBalance = await connection.getBalance(walletPubkey);
    const solBalanceInSol = solBalance / 1e9; // Convert lamports to SOL

    // Get USDC token account
    const usdcMint = new PublicKey(USDC_MINT);
    const usdcTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      walletPubkey
    );

    // Get USDC balance
    let usdcBalance = 0;
    let usdcExists = false;
    
    try {
      const tokenAccountInfo = await connection.getTokenAccountBalance(usdcTokenAccount);
      if (tokenAccountInfo.value) {
        usdcBalance = parseFloat(tokenAccountInfo.value.uiAmount?.toString() || '0');
        usdcExists = true;
      }
    } catch (error) {
      // Token account doesn't exist yet
      console.log('USDC token account not found, balance is 0');
    }

    return NextResponse.json({
      balance: usdcBalance,
      usdtBalance: usdcBalance, // USDC is used as USDT equivalent
      usdcBalance: usdcBalance,
      solBalance: solBalanceInSol,
      walletAddress: walletAddress,
      tokenAccount: usdcTokenAccount.toBase58(),
      exists: usdcExists,
      balances: {
        USDC: {
          balance: usdcBalance,
          tokenAccount: usdcTokenAccount.toBase58(),
          exists: usdcExists,
        },
        SOL: {
          balance: solBalanceInSol,
        },
      },
    });
  } catch (error) {
    console.error('Wallet balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance', details: (error as Error).message },
      { status: 500 }
    );
  }
}
