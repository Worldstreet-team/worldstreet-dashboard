import { NextResponse } from 'next/server';

/**
 * Get KuCoin WebSocket connection token
 * This endpoint fetches a token required for WebSocket connections
 */
export async function GET() {
  try {
    const response = await fetch(
      'https://api.kucoin.com/api/v1/bullet-public',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`KuCoin API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching KuCoin WebSocket token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WebSocket token' },
      { status: 500 }
    );
  }
}
