import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/wallets/[asset]/users/[userId]/address
 * Single asset lookup for a user
 * Query param: chain (optional, defaults to 'evm')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { asset: string; userId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { asset, userId } = params;
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'evm';

    // Verify the requesting user matches the userId
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/wallets/${asset}/users/${userId}/address?chain=${chain}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch wallet address' },
        { status: response.status }
      );
    }

    const wallet = await response.json();
    return NextResponse.json(wallet);
  } catch (error) {
    console.error('[Wallet Address API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
