import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/services/spot/quoteService';

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
      fromAddress,
      toAddress,
      slippage
    } = body;

    // Log the incoming request
    console.log('[Quote API] Handled by QuoteService:', { userId, fromChain, toChain, tokenIn, tokenOut, amountIn, fromAddress });

    if (!tokenIn || !tokenOut || !amountIn || !fromChain) {
      return NextResponse.json(
        { message: 'Missing required fields (tokenIn, tokenOut, amountIn, fromChain)' },
        { status: 400 }
      );
    }

    // Validate fromAddress is provided and not zero address
    if (!fromAddress || fromAddress === "0x0000000000000000000000000000000000000000" || fromAddress === "0x0") {
      return NextResponse.json(
        { message: '/fromAddress Zero address is provided. Please connect your wallet first.' },
        { status: 400 }
      );
    }

    // Call our refined local service
    const quoteResponse = await fetchQuote({
      fromChain,
      toChain: toChain || fromChain,
      fromToken: tokenIn,
      toToken: tokenOut,
      fromAmount: amountIn,
      fromAddress,
      toAddress: toAddress || fromAddress,
      slippageOverride: slippage
    });

    const { quote } = quoteResponse;

    // Transform to match frontend expectations
    const transformedData = {
      expectedOutput: quote.estimate.toAmount,
      toAmountMin: quote.estimate.toAmountMin,
      priceImpact: quote.estimate.data?.priceImpact || 0,
      gasEstimate: quote.estimate.gasCosts?.[0]?.amount || '0',
      route: {
        tool: quote.tool,
        toolDetails: quote.toolDetails,
        type: 'lifi',
        fromChainId: fromChain, // Pass back original IDs for UI consistency
        toChainId: toChain || fromChain,
      },
      executionData: quote.transactionRequest,
      _raw: quote
    };

    console.log('[Quote API] Success: Quote via', quote.tool);
    return NextResponse.json(transformedData);

  } catch (error: any) {
    console.error('[Quote API] QuoteService Error:', error.message);
    return NextResponse.json(
      { message: error.message || 'Internal error in Quote API', error: String(error) },
      { status: 500 }
    );
  }
}
