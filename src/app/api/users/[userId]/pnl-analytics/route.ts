import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/users/[userId]/pnl-analytics
 * Get user PnL analytics (total realized PnL, win rate, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Verify the requesting user matches the userId
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/users/${userId}/pnl-analytics`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch PnL analytics' },
        { status: response.status }
      );
    }

    const analytics = await response.json();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[PnL Analytics API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
