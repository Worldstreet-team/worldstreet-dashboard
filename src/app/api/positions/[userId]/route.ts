import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://trading.watchup.site';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'OPEN';
    const limit = searchParams.get('limit') || '50';

    // Build query string
    const queryParams = new URLSearchParams({
      userId,
      status,
      limit,
    });

    const response = await fetch(
      `${BACKEND_URL}/api/positions?${queryParams.toString()}`,
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
        { error: error.message || 'Failed to fetch positions' },
        { status: response.status }
      );
    }

    const positions = await response.json();

    return NextResponse.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
