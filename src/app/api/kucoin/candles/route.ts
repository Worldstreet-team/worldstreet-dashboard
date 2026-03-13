import { NextRequest, NextResponse } from 'next/server';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WorldStreet/1.0)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok && response.status === 429 && retries > 0) {
      console.log(`[KuCoin] Rate limited, retrying in ${RETRY_DELAY}ms (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    
    return response;
  } catch (error: any) {
    if (retries > 0 && (error.name === 'TypeError' || error.code === 'ENOTFOUND')) {
      console.log(`[KuCoin] Network error, retrying in ${RETRY_DELAY}ms (${retries} retries left):`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || '1hour';
    const limit = searchParams.get('limit') || '100';

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetchWithRetry(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}&type=${type}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Kucoin API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Kucoin data format
    // Kucoin returns: [time, open, close, high, low, volume, turnover]
    if (data.data && Array.isArray(data.data)) {
      const candles = data.data.map((kline: string[]) => ({
        time: Math.floor(parseInt(kline[0]) / 1000), // Convert ms to seconds
        open: parseFloat(kline[1]),
        close: parseFloat(kline[2]),
        high: parseFloat(kline[3]),
        low: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        turnover: parseFloat(kline[6]),
      }));

      return NextResponse.json({
        code: '200000',
        data: candles,
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Kucoin candles:', error);
    
    // Return more specific error information
    const errorMessage = error.code === 'ENOTFOUND' 
      ? 'Network connectivity issue - unable to reach KuCoin API'
      : error.message || 'Failed to fetch candles';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        retryable: error.code === 'ENOTFOUND' || error.name === 'TypeError'
      },
      { status: 500 }
    );
  }
}
