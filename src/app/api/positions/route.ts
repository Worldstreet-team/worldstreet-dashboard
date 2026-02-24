import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const BACKEND_URL = 'https://trading.watchup.site';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'OPEN';
    const limit = searchParams.get('limit') || '50';

    console.log('[Positions API] Fetching positions:', {
      userId: authUser.userId,
      status,
      limit
    });

    const response = await fetch(
      `${BACKEND_URL}/api/positions?userId=${authUser.userId}&status=${status}&limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Positions API] Backend error:', response.status, errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch positions from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Positions API] Backend response:', JSON.stringify(data, null, 2));

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Positions API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
