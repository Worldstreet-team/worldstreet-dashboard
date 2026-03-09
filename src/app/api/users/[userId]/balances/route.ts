import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_URL = 'https://trading.watchup.site';

/**
 * GET /api/users/[userId]/balances
 * Fetches real-time blockchain balances from backend
 * Backend returns ALL balances for the user with RPC-fetched amounts
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

    // Verify the user can only access their own balances
    if (clerkUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('[Balances API] Fetching balances from backend for user:', userId);

    // Call backend API - it returns ALL balances with real-time RPC data
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/balances`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Balances API] Backend error:', response.status, errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch balances from backend', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Balances API] Backend response:', JSON.stringify(data, null, 2));

    // Backend returns array of balance objects directly
    // Each object has: { asset, chain, available_balance, locked_balance, tokenAddress }
    const balances = Array.isArray(data) ? data : [];
    
    if (balances.length === 0) {
      console.warn('[Balances API] No wallets found for user');
      return NextResponse.json({ balances: [] });
    }

    // Return in consistent format
    return NextResponse.json({ balances });
  } catch (error) {
    console.error('[Balances API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}