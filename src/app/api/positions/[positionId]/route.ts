import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/positions/[positionId]
 * Get specific position by ID
 * Query param: userId (required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { positionId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify the requesting user matches the userId
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/positions/${positionId}?userId=${userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch position' },
        { status: response.status }
      );
    }

    const position = await response.json();
    return NextResponse.json(position);
  } catch (error) {
    console.error('[Position Detail API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
