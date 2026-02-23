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
    const limit = searchParams.get('limit') || '50';

    console.log('[Trade History API] Fetching history for user:', authUser.userId);

    // First try to get from the existing quote/execute history endpoint
    // This might be a different endpoint on your backend
    const response = await fetch(
      `${BACKEND_URL}/api/users/${authUser.userId}/trades?limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Trade History API] Backend error:', response.status, errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch trade history from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Trade History API] Backend response:', JSON.stringify(data, null, 2));

    // Return the data directly as the backend already returns the correct format
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trade History API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}