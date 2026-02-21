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

    if (!userId || !tokenIn || !tokenOut || !amountIn || !fromChain) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const response = await fetch('https://trading.watchup.site/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fromChain,
        toChain: toChain || fromChain,
        tokenIn,
        tokenOut,
        amountIn,
        slippage: slippage ?? 0.005
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Quote failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { message: 'Internal error', error: (error as Error).message },
      { status: 500 }
    );
  }
}