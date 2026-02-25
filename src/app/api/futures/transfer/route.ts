import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { destinationAddress, amount } = body;

    // Validate required fields
    if (!destinationAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: destinationAddress, amount' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    console.log('Futures wallet transfer request:', { userId, destinationAddress, amount });

    // Call backend API - matches the documentation exactly
    const response = await fetch(`${BASE_API_URL}/api/futures/wallet/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        destinationAddress: destinationAddress.trim(),
        amount: amountNum.toString(),
      }),
    });

    const data = await response.json();

    console.log('Backend response:', {
      status: response.status,
      data,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Transfer failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Transfer completed successfully',
      txHash: data.txHash,
      explorerUrl: data.explorerUrl,
      amount: data.amount,
      from: data.from,
      to: data.to,
    });
  } catch (error) {
    console.error('Futures wallet transfer error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
