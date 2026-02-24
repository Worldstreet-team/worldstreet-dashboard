import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

const BACKEND_URL = 'https://trading.watchup.site';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Verify the user can only access their own balances
    if (authUser.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[Balances API] Fetching balances for user:', userId);

    const response = await fetch(
      `${BACKEND_URL}/api/users/${userId}/balances`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Balances API] Backend error:', response.status, errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch balances from backend' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Balances API] Backend response:', JSON.stringify(data, null, 2));

    // Return the data directly as the backend already returns the correct format
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Balances API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}