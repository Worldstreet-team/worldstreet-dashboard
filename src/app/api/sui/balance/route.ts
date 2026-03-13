import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sui/balance?address=0x...
 * Get SUI balance for a given address
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

    // Validate Sui address format (0x followed by 64 hex characters)
    if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid Sui address format' },
        { status: 400 }
      );
    }

    const suiRpcUrl = "https://sui-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

    console.log('[Sui Balance] Fetching balance for address:', address);

    // Call Sui RPC to get balance
    const response = await fetch(suiRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getBalance',
        params: [address, '0x2::sui::SUI'] // SUI coin type
      })
    });

    if (!response.ok) {
      throw new Error(`Sui RPC request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error('[Sui Balance] RPC error:', data.error);
      throw new Error(data.error.message || 'Failed to fetch balance from Sui RPC');
    }

    const balanceInMist = data.result?.totalBalance || '0';
    const balanceInSui = parseFloat(balanceInMist) / 1e9; // Convert MIST to SUI

    console.log('[Sui Balance] Balance fetched:', balanceInSui, 'SUI');

    return NextResponse.json({
      success: true,
      address,
      balance: balanceInSui,
      balanceInMist: balanceInMist,
      coinType: '0x2::sui::SUI'
    });

  } catch (error: any) {
    console.error('[Sui Balance] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch SUI balance',
        details: error.message 
      },
      { status: 500 }
    );
  }
}