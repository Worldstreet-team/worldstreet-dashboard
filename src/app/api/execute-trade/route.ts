import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { userId, chain, tokenIn, tokenOut, amountIn, slippage } = body;
    
    if (!userId || !chain || !tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await fetch('https://trading.watchup.site/api/execute-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        chain,
        tokenIn,
        tokenOut,
        amountIn,
        slippage: slippage || 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Trade execution failed' }));
      return NextResponse.json(
        { message: errorData.message || 'Trade execution failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Execute trade API error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
