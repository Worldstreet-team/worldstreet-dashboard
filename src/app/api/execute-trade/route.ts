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
    console.log('[Execute Trade API] Request:', { userId, fromChain, toChain, tokenIn, tokenOut, amountIn, slippage });
    
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

    console.log('[Execute Trade API] Sending to backend:', backendPayload);

    const response = await fetch('https://trading.watchup.site/api/execute-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload)
    });

    const data = await response.json();
    console.log('[Execute Trade API] Backend response:', { status: response.status, data });

    if (!response.ok) {
      // Backend returns errors in 'error' field, not 'message'
      const errorMessage = data.error || data.message || 'Trade execution failed';
      console.error('[Execute Trade API] Backend error:', errorMessage);
      
      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    // Log position information if available
    if (data.position) {
      console.log('[Execute Trade API] Position created/updated:', data.position);
    } else {
      console.warn('[Execute Trade API] No position data in response - backend may not be creating positions');
    }

    // Return the backend response (should include txHash, success, position, etc.)
    console.log('[Execute Trade API] Success:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Execute Trade API] Internal error:', error);
    return NextResponse.json(
      { message: 'Internal error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
