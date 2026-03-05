import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/users/[userId]/tpsl-orders
 * Get all TP/SL orders for a user
 * Query param: status (ACTIVE, TRIGGERED, CANCELLED, FAILED)
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Verify the requesting user matches the userId
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    let url = `${BACKEND_URL}/api/users/${userId}/tpsl-orders`;
    if (status) {
      url += `?status=${status}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch TP/SL orders' },
        { status: response.status }
      );
    }

    const orders = await response.json();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('[TP/SL Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
