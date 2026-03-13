import { NextRequest, NextResponse } from 'next/server';
import { sendTon } from '@/lib/privy/ton';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/privy/wallet/ton/send
 * Send TON using Privy wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { to, amount } = await request.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: to, amount' },
        { status: 400 }
      );
    }

    console.log('[TON Send API] Sending', amount, 'TON to', to);

    // Get user's Clerk JWT for Privy authorization
    const clerkJwt = request.headers.get('authorization')?.replace('Bearer ', '') || '';
    
    if (!clerkJwt) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    // Get user's TON wallet from database
    // This would need to be implemented to get the walletId
    // For now, return an error indicating TON sends are not yet supported
    
    return NextResponse.json(
      { 
        error: 'TON transactions not yet supported via Privy',
        details: 'TON is a Tier 2 chain that requires custom implementation'
      },
      { status: 501 }
    );

    // Future implementation:
    // const walletId = await getUserTonWalletId(userId);
    // const result = await sendTon(walletId, to, amount, clerkJwt);
    // return NextResponse.json({
    //   success: true,
    //   transactionHash: result.hash,
    //   status: result.status
    // });

  } catch (error: any) {
    console.error('[TON Send API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send TON transaction', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}