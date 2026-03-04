import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// @ts-expect-error - Dynamic import, types will be available at runtime
import { DriftClient, Wallet } from '@drift-labs/sdk';
import { decryptWithPIN } from '@/lib/wallet/encryption';
import { connectDB } from '@/lib/mongodb';
import DashboardProfile from '@/models/DashboardProfile';

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
        type: 'grpc',
        grpcConfigs: [{
          endpoint: process.env.NEXT_PUBLIC_YELLOWSTONE_GRPC_ENDPOINT || 'https://solana-mainnet.g.alchemy.com/',
          token: process.env.NEXT_PUBLIC_YELLOWSTONE_GRPC_TOKEN,
        }],
      },
      subAccountIds: [0]
    });
    
    // Subscribe to account updates
    await client.subscribe();
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get positions
    const driftUser = client.getUser();
    
    let accountData;
    try {
      accountData = driftUser.getUserAccount();
    } catch (err) {
      // Account not initialized yet
      await client.unsubscribe();
      return NextResponse.json({
        success: true,
        data: { positions: [] }
      });
    }
    
    const perpPositions = driftUser.getPerpPositions();
    const positionsList = [];
    
    if (perpPositions && Array.isArray(perpPositions)) {
      for (const position of perpPositions) {
        const baseAmount = position.baseAssetAmount ? position.baseAssetAmount.toNumber() : 0;
        if (baseAmount === 0) continue;
        
        const direction = baseAmount > 0 ? 'long' : 'short';
        const market = client.getPerpMarketAccount(position.marketIndex);
        
        positionsList.push({
          marketIndex: position.marketIndex,
          direction,
          baseAmount: Math.abs(baseAmount) / 1e9,
          quoteAmount: Math.abs(position.quoteAssetAmount.toNumber()) / 1e6,
          entryPrice: Number(position.quoteEntryAmount) / Math.abs(baseAmount),
          unrealizedPnl: Number(position.unrealizedPnl || 0) / 1e6,
          leverage: market ? Number(market.marginRatioInitial) / 10000 : 1
        });
      }
    }
    
    // Cleanup
    await client.unsubscribe();
    
    return NextResponse.json({
      success: true,
      data: { positions: positionsList }
    });
    
  } catch (error) {
    console.error('[Drift Positions API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch positions' 
      },
      { status: 500 }
    );
  }
}
