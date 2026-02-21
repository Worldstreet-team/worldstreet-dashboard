import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      fromChain,
      toChain,
      tokenIn,
      tokenOut,
      amountIn,
      slippage
    } = body;

    // Log the incoming request
    console.log('[Quote API] Request:', { userId, fromChain, toChain, tokenIn, tokenOut, amountIn, slippage });

    if (!userId || !tokenIn || !tokenOut || !amountIn || !fromChain) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const backendPayload = {
      userId,
      fromChain,
      toChain: toChain || fromChain,
      tokenIn,
      tokenOut,
      amountIn,
      slippage: slippage ?? 0.005
    };

    console.log('[Quote API] Sending to backend:', backendPayload);

    const response = await fetch('https://trading.watchup.site/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    });

    const data = await response.json();
    console.log('[Quote API] Backend response:', { status: response.status, data });

    if (!response.ok) {
      // Backend returns errors in 'error' field, not 'message'
      const errorMessage = data.error || data.message || 'Quote failed';
      console.error('[Quote API] Backend error:', errorMessage);
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    // Transform backend response to match frontend expectations
    const transformedData = {
      expectedOutput: data.expectedOut || data.expectedOutput || '0',
      priceImpact: data.priceImpact || 0,
      platformFee: '0', // Calculate if needed: amountIn * 0.003
      gasEstimate: data.gasEstimate || '0',
      route: data.route,
      executionData: data.executionData,
      toAmountMin: data.toAmountMin
    };

    console.log('[Quote API] Transformed response:', transformedData);
    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('[Quote API] Internal error:', error);
    return NextResponse.json(
      { message: 'Internal error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
