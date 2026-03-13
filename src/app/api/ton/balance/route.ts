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

    // Use GetBlock.io TON RPC endpoint
    const response = await fetch(
      `https://go.getblock.io/8a928018fe2741ed90779091f68c571d/getAddressInformation?address=${address}`
    );

    if (!response.ok) {
      throw new Error(`TON API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch balance from GetBlock TON API');
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