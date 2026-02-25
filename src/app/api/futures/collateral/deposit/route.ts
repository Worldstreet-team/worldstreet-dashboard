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
    const { chain, amount } = body;

    if (!chain || !amount) {
      return NextResponse.json(
        { error: 'Chain and amount are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BASE_API_URL}/api/futures/collateral/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        chain,
        amount: amount.toString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to deposit collateral' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      { 
        message: data.message,
        amount: data.amount,
        txHash: data.txHash,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Deposit collateral API error:', error);
    return NextResponse.json(
      { error: 'Failed to deposit collateral' },
      { status: 500 }
    );
  }
}
