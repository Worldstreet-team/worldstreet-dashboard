import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana mainnet

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get wallet address from query params
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Connect to Solana RPC
    const rpcUrl = process.env.NEXT_PUBLIC_SOL_RPC || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Get wallet public key
    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

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
