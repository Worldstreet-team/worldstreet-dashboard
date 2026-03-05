import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/trade/[tradeId]/users/[userId]
 * Get a specific trade by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tradeId: string; userId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tradeId, userId } = params;

    // Verify the requesting user matches the userId
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/trade/${tradeId}/users/${userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch trade' },
        { status: response.status }
      );
    }

    const trade = await response.json();
    return NextResponse.json(trade);
  } catch (error) {
    console.error('[Trade Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
