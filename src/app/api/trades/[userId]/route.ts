import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://trading.watchup.site';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';

    // Build query string
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    queryParams.append('limit', limit);

    const response = await fetch(
      `${BACKEND_URL}/api/trades/${userId}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch trade history' },
        { status: response.status }
      );
    }

    const trades = await response.json();

    return NextResponse.json({
      success: true,
      data: trades,
    });
  } catch (error) {
    console.error('Error fetching trade history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade history' },
      { status: 500 }
    );
  }
}
