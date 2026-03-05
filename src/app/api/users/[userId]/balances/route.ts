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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const assets = searchParams.get('assets');
    const chain = searchParams.get('chain');

    console.log('[Balances API] Fetching balances for user:', userId, { assets, chain });

    // Build backend URL with query parameters
    const backendUrl = new URL(`${BACKEND_URL}/api/users/${userId}/balances`);
    if (assets) {
      backendUrl.searchParams.set('assets', assets);
    }
    if (chain) {
      backendUrl.searchParams.set('chain', chain);
    }

    console.log('[Balances API] Backend URL:', backendUrl.toString());

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

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

    // Ensure we always return an array or object with balances array
    const balances = Array.isArray(data) ? data : data.balances || [];
    
    // If no balances found, return empty array with proper structure
    if (balances.length === 0 && assets) {
      console.log('[Balances API] No balances found, returning zero balances for requested assets');
      const requestedAssets = assets.split(',');
      const zeroBalances = requestedAssets.map(asset => ({
        asset: asset.toUpperCase(),
        chain: chain || 'evm',
        available_balance: '0',
        locked_balance: '0',
        total_balance: '0'
      }));
      return NextResponse.json({ balances: zeroBalances });
    }

    // Return the data in consistent format
    return NextResponse.json(Array.isArray(data) ? { balances: data } : data);
  } catch (error) {
    console.error('[Balances API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}