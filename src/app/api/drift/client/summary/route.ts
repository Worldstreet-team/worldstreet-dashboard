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
    const { userId, pin } = await request.json();
    
    if (!userId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or pin' },
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
    
    // Initialize connection with gRPC WebSocket
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
    
    // Subscribe to account updates
    await client.subscribe();
    
    // Wait briefly for data to load (reduced to avoid rate limiting)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get account summary
    const driftUser = client.getUser();
    
    let accountData;
    try {
      accountData = driftUser.getUserAccount();
    } catch (err) {
      // Account not initialized yet
      try {
        await client.unsubscribe();
      } catch (unsubErr) {
        // Ignore unsubscribe errors
        console.log('[Drift Summary API] Unsubscribe error (ignored):', unsubErr);
      }
      return NextResponse.json({
        success: true,
        data: {
          initialized: false,
          publicAddress: keypair.publicKey.toBase58(),
          subaccountId: 0,
          totalCollateral: 0,
          freeCollateral: 0,
          unrealizedPnl: 0,
          leverage: 0,
          marginRatio: 0,
          openPositions: 0,
          openOrders: 0,
        }
      });
    }
    
    const spotPosition = driftUser.getSpotPosition(0);
    const perpPositions = driftUser.getPerpPositions();
    
    const totalCollateral = spotPosition ? Number(spotPosition.scaledBalance) / 1e6 : 0;
    const freeCollateral = driftUser.getFreeCollateral ? Number(driftUser.getFreeCollateral()) / 1e6 : 0;
    
    let unrealizedPnl = 0;
    let openPositions = 0;
    
    if (perpPositions && Array.isArray(perpPositions)) {
      for (const position of perpPositions) {
        if (position.baseAssetAmount && position.baseAssetAmount.toNumber() !== 0) {
          openPositions++;
          unrealizedPnl += Number(position.unrealizedPnl || 0) / 1e6;
        }
      }
    }
    
    const leverage = totalCollateral > 0 ? (totalCollateral - freeCollateral) / totalCollateral : 0;
    const marginRatio = totalCollateral > 0 ? freeCollateral / totalCollateral : 0;
    
    // Cleanup
    try {
      await client.unsubscribe();
    } catch (unsubErr) {
      // Ignore unsubscribe errors
      console.log('[Drift Summary API] Unsubscribe error (ignored):', unsubErr);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        initialized: true,
        subaccountId: 0,
        publicAddress: keypair.publicKey.toBase58(),
        totalCollateral,
        freeCollateral,
        unrealizedPnl,
        leverage,
        marginRatio,
        openPositions,
        openOrders: 0,
      }
    });
    
  } catch (error) {
    console.error('[Drift Summary API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch summary' 
      },
      { status: 500 }
    );
  }
}
