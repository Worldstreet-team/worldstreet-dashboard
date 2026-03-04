import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// @ts-expect-error - Dynamic import, types will be available at runtime
import { DriftClient, Wallet } from '@drift-labs/sdk';
import { decryptWithPIN } from '@/lib/wallet/encryption';
import { connectDB } from '@/lib/mongodb';
import DashboardProfile from '@/models/DashboardProfile';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId, pin, amount } = await request.json();
    
    if (!userId || !pin || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get user's encrypted wallet
    const profile = await DashboardProfile.findOne({ authUserId: userId });
    if (!profile || !profile.wallets?.solana?.encryptedPrivateKey) {
      return NextResponse.json(
        { success: false, error: 'Solana wallet not found' },
        { status: 404 }
      );
    }
    
    // Decrypt private key
    const decryptedPrivateKey = decryptWithPIN(
      profile.wallets.solana.encryptedPrivateKey,
      pin
    );
    
    // Create keypair
    const secretKey = new Uint8Array(Buffer.from(decryptedPrivateKey, 'base64'));
    const keypair = Keypair.fromSecretKey(secretKey);
    
    // Initialize connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Create Drift client with gRPC
    const wallet = new Wallet(keypair);
    const DRIFT_PROGRAM_ID = process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    const client = new DriftClient({
      connection,
      wallet,
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      accountSubscription: {
        type: 'websocket',
        resubTimeoutMs: 30000,
      },
      subAccountIds: [0]
    });
    
    // Subscribe
    await client.subscribe();
    
    // Deposit USDC
    const txSignature = await client.deposit(
      amount * 1e6, // Convert to USDC base units
      0, // USDC market index
      client.getUser().getUserAccountPublicKey()
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(txSignature, 'confirmed');
    
    // Cleanup
    try {
      await client.unsubscribe();
    } catch (unsubErr) {
      // Ignore unsubscribe errors
      console.log('[Drift Deposit API] Unsubscribe error (ignored):', unsubErr);
    }
    
    return NextResponse.json({
      success: true,
      data: { txSignature }
    });
    
  } catch (error) {
    console.error('[Drift Deposit API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to deposit collateral' 
      },
      { status: 500 }
    );
  }
}
