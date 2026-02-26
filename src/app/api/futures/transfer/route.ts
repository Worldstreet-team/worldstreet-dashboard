import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

// Helper function to sanitize and categorize errors
function sanitizeError(error: any, backendResponse?: any): string {
  const errorMessage = error?.message || error?.toString() || '';
  const backendError = backendResponse?.error || backendResponse?.message || '';
  const combinedError = `${errorMessage} ${backendError}`.toLowerCase();

  // Insufficient funds errors
  if (
    combinedError.includes('insufficient') ||
    combinedError.includes('not enough') ||
    combinedError.includes('balance') ||
    combinedError.includes('exceed')
  ) {
    return 'Insufficient funds in futures wallet. Please deposit more funds or reduce the transfer amount.';
  }

  // Gas fee errors
  if (
    combinedError.includes('gas') ||
    combinedError.includes('fee') ||
    combinedError.includes('lamport') ||
    combinedError.includes('wei')
  ) {
    return 'Insufficient gas fees. Please ensure your futures wallet has at least 0.01 SOL for transaction fees.';
  }

  // Network/connection errors
  if (
    combinedError.includes('network') ||
    combinedError.includes('timeout') ||
    combinedError.includes('connection') ||
    combinedError.includes('econnrefused') ||
    combinedError.includes('fetch failed')
  ) {
    return 'Network error. Please check your connection and try again.';
  }

  // Invalid address errors
  if (
    combinedError.includes('invalid address') ||
    combinedError.includes('invalid recipient') ||
    combinedError.includes('malformed')
  ) {
    return 'Invalid destination address. Please verify the wallet address.';
  }

  // Wallet/key errors
  if (
    combinedError.includes('wallet not found') ||
    combinedError.includes('no wallet') ||
    combinedError.includes('private key') ||
    combinedError.includes('signer')
  ) {
    return 'Futures wallet not found or not properly configured. Please create a futures wallet first.';
  }

  // Transaction errors
  if (
    combinedError.includes('transaction failed') ||
    combinedError.includes('tx failed') ||
    combinedError.includes('reverted')
  ) {
    return 'Transaction failed. This may be due to network congestion or insufficient gas. Please try again.';
  }

  // Rate limiting
  if (
    combinedError.includes('rate limit') ||
    combinedError.includes('too many requests')
  ) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Blockchain specific errors
  if (combinedError.includes('blockhash')) {
    return 'Transaction expired. Please try again.';
  }

  if (combinedError.includes('nonce')) {
    return 'Transaction nonce error. Please refresh and try again.';
  }

  // Return backend error if it's descriptive enough
  if (backendError && backendError.length > 10 && !backendError.includes('failed')) {
    return backendError;
  }

  // Default fallback
  return 'Transfer failed. Please try again or contact support if the issue persists.';
}

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
      const sanitizedError = sanitizeError(data, data);
      return NextResponse.json(
        { error: sanitizedError },
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
    const sanitizedError = sanitizeError(error);
    return NextResponse.json(
      { error: sanitizedError },
      { status: 500 }
    );
  }
}
