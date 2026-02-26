import { NextRequest, NextResponse } from 'next/server';

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
    return 'Insufficient funds. Please check your balance and try again.';
  }

  // Gas fee errors
  if (
    combinedError.includes('gas') ||
    combinedError.includes('fee') ||
    combinedError.includes('lamport') ||
    combinedError.includes('wei')
  ) {
    return 'Insufficient gas fees. Please ensure you have enough native tokens (SOL/ETH) to cover transaction fees.';
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
    return 'Invalid wallet address. Please verify the destination address.';
  }

  // Wallet/key errors
  if (
    combinedError.includes('wallet') ||
    combinedError.includes('private key') ||
    combinedError.includes('signer')
  ) {
    return 'Wallet error. Please ensure your wallet is properly configured.';
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
        const body = await request.json();
        const { userId, asset, amount, direction, destinationAddress } = body;

        // Validate required fields
        if (!userId || !asset || !amount || !direction || !destinationAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, asset, amount, direction, destinationAddress' },
                { status: 400 }
            );
        }

        // Validate direction - spot-to-main and spot-to-futures are handled by backend signers
        if (direction !== 'spot-to-main' && direction !== 'spot-to-futures') {
            return NextResponse.json(
                { error: 'Invalid direction. Only "spot-to-main" and "spot-to-futures" are supported for backend signing.' },
                { status: 400 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be a positive number' },
                { status: 400 }
            );
        }

        console.log('Transfer request:', { userId, asset, amount, direction, destinationAddress });

        // Call backend API
        const backendUrl = process.env.BACKEND_URL || 'https://trading.watchup.site';
        const response = await fetch(`${backendUrl}/api/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                asset,
                amount,
                direction,
                destinationAddress
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
            message: 'Transfer completed successfully',
            ...data,
        });
    } catch (error) {
        console.error('Transfer error:', error);
        const sanitizedError = sanitizeError(error);
        return NextResponse.json(
            { error: sanitizedError },
            { status: 500 }
        );
    }
}
