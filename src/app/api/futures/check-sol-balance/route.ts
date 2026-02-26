import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const REQUIRED_SOL_BALANCE = 0.05; // Minimum SOL required for initialization (~$5-6)

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's futures wallet address
    const BASE_API_URL = 'https://trading.watchup.site';
    const walletResponse = await fetch(
      `${BASE_API_URL}/api/futures/wallet?userId=${userId}&chain=solana`
    );

    if (!walletResponse.ok) {
      if (walletResponse.status === 404) {
        return NextResponse.json({
          hasWallet: false,
          hasSufficientSol: false,
          requiredSol: REQUIRED_SOL_BALANCE,
          currentSol: 0,
          message: 'Futures wallet not found. Please create one first.',
        });
      }
      throw new Error('Failed to fetch wallet');
    }

    const walletData = await walletResponse.json();
    const walletAddress = walletData.walletAddress;

    if (!walletAddress) {
      return NextResponse.json({
        hasWallet: false,
        hasSufficientSol: false,
        requiredSol: REQUIRED_SOL_BALANCE,
        currentSol: 0,
        message: 'Wallet address not found',
      });
    }

    // Check SOL balance
    const rpcUrl = process.env.NEXT_PUBLIC_SOL_RPC || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const walletPubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(walletPubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    const hasSufficientSol = solBalance >= REQUIRED_SOL_BALANCE;

    return NextResponse.json({
      hasWallet: true,
      hasSufficientSol,
      requiredSol: REQUIRED_SOL_BALANCE,
      currentSol: solBalance,
      shortfall: hasSufficientSol ? 0 : REQUIRED_SOL_BALANCE - solBalance,
      walletAddress,
      message: hasSufficientSol 
        ? 'Sufficient SOL balance for futures trading'
        : `Need ${(REQUIRED_SOL_BALANCE - solBalance).toFixed(4)} more SOL for initialization fees`,
    });
  } catch (error) {
    console.error('SOL balance check error:', error);
    return NextResponse.json(
      { error: 'Failed to check SOL balance', details: (error as Error).message },
      { status: 500 }
    );
  }
}
