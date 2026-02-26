import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function POST(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { positionId } = params;
    const body = await request.json();
    const { slippage = 0.005 } = body;

    // Validate slippage
    if (slippage < 0 || slippage > 0.5) {
      return NextResponse.json(
        { error: 'Slippage must be between 0 and 0.5 (0-50%)' },
        { status: 400 }
      );
    }

    console.log('Closing position:', { positionId, userId, slippage });

    // Call backend API to sell and close position
    const response = await fetch(
      `${BASE_API_URL}/api/positions/${positionId}/sell-and-close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          slippage,
        }),
      }
    );

    const data = await response.json();

    console.log('Backend response:', {
      status: response.status,
      data,
    });

    if (!response.ok) {
      // Sanitize error messages
      let errorMessage = data.message || data.error || 'Failed to close position';
      
      // Provide user-friendly error messages
      if (data.code === 'INSUFFICIENT_BALANCE') {
        errorMessage = 'Insufficient balance to close position. You may need more tokens for gas fees.';
      } else if (data.code === 'POSITION_CLOSED') {
        errorMessage = 'This position is already closed.';
      } else if (data.code === 'POSITION_NOT_FOUND') {
        errorMessage = 'Position not found.';
      } else if (data.code === 'WALLET_NOT_FOUND') {
        errorMessage = 'Wallet not found. Please ensure your wallet is set up.';
      } else if (data.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please try again.';
      } else if (data.code === 'TRANSACTION_FAILED') {
        errorMessage = 'Transaction failed. This may be due to slippage or network issues.';
      }

      return NextResponse.json(
        { error: errorMessage, code: data.code },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.isPartialSell 
        ? 'Position partially closed due to insufficient balance'
        : 'Position closed successfully',
      isPartialSell: data.isPartialSell,
      position: data.position,
      balanceInfo: data.balanceInfo,
      trade: data.trade,
      explorerUrl: data.explorerUrl,
      timestamp: data.timestamp,
    });
  } catch (error) {
    console.error('Position close error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to close position. Please try again.',
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
