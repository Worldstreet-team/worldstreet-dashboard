import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ton/balance?address=<ton_address>
 * Get TON balance for an address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    console.log('[TON Balance API] Fetching balance for:', address);

    // Use TON Center API to get balance
    const response = await fetch(
      `https://toncenter.com/api/v2/getAddressInformation?address=${address}`
    );

    if (!response.ok) {
      throw new Error(`TON API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch balance from TON API');
    }

    const balanceInNanoTon = data.result?.balance || '0';
    const balanceInTon = parseFloat(balanceInNanoTon) / 1e9;

    console.log('[TON Balance API] Balance:', balanceInTon, 'TON');

    return NextResponse.json({
      success: true,
      balance: balanceInTon,
      balanceInNanoTon: balanceInNanoTon,
      address
    });
  } catch (error: any) {
    console.error('[TON Balance API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch TON balance', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}