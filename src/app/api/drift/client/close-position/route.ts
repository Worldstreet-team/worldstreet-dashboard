import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// @ts-expect-error - Dynamic import, types will be available at runtime
import { DriftClient, Wallet } from '@drift-labs/sdk';
import { decryptWithPIN } from '@/lib/wallet/encryption';
import { connectDB } from '@/lib/mongodb';
import DashboardProfile from '@/models/DashboardProfile';

export async function POST(request: NextRequest) {
  try {
    const { userId, pin, marketIndex } = await request.json();
    
    if (!userId || !pin || marketIndex === undefined) {
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
    
    // Get position
    const driftUser = client.getUser();
    const position = driftUser.getPerpPosition(marketIndex);
    
    if (!position || position.baseAssetAmount.toNumber() === 0) {
      await client.unsubscribe();
      return NextResponse.json(
        { success: false, error: 'No position found' },
        { status: 404 }
      );
    }
    
    // Close position by placing opposite order
    const baseAmount = Math.abs(position.baseAssetAmount.toNumber());
    const direction = position.baseAssetAmount.toNumber() > 0 ? 'short' : 'long';
    
    const orderParams = {
      orderType: 'market',
      marketIndex,
      direction,
      baseAssetAmount: baseAmount,
      price: 0,
      reduceOnly: true,
    };
    
    const txSignature = await client.placePerpOrder(orderParams);
    
    // Wait for confirmation
    await connection.confirmTransaction(txSignature, 'confirmed');
    
    // Cleanup
    await client.unsubscribe();
    
    return NextResponse.json({
      success: true,
      data: { txSignature }
    });
    
  } catch (error) {
    console.error('[Drift Close Position API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to close position' 
      },
      { status: 500 }
    );
  }
}
