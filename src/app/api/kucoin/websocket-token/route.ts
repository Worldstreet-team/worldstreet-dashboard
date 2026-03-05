import { NextResponse } from 'next/server';

const KUCOIN_API_BASE = 'https://api.kucoin.com';

/**
 * GET /api/kucoin/websocket-token
 * 
 * Fetches WebSocket connection token from KuCoin
 * Required for establishing WebSocket connections
 */
export async function GET() {
  try {
    const response = await fetch(
      `${KUCOIN_API_BASE}/api/v1/bullet-public`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`KuCoin API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('[WebSocket Token API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch WebSocket token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
