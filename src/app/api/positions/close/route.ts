import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://trading.watchup.site';

export async function POST(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const body = await request.json();
    const { userId } = body;
    const { positionId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!positionId) {
      return NextResponse.json(
        { error: 'positionId is required' },
        { status: 400 }
      );
    }

    const url = `${BACKEND_BASE_URL}/api/positions/${positionId}/close`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to close position' }));
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Failed to close position' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error closing position:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
