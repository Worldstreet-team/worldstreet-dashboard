/**
 * Transaction Monitoring API Route
 * Starts monitoring blockchain transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { transactionMonitor } from '@/services/spot/TransactionMonitor';

// POST - Start monitoring a transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { txHash, fromChainId, toChainId } = body;

    if (!txHash || !fromChainId || !toChainId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start monitoring in background
    transactionMonitor.startMonitoring(
      txHash,
      fromChainId,
      toChainId,
      session.user.email
    );

    return NextResponse.json({ success: true, monitoring: txHash });
  } catch (error) {
    console.error('[Monitor API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start monitoring' },
      { status: 500 }
    );
  }
}

// GET - Get monitored transactions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const monitored = transactionMonitor.getMonitoredTransactions();

    return NextResponse.json({ transactions: monitored });
  } catch (error) {
    console.error('[Monitor API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitored transactions' },
      { status: 500 }
    );
  }
}
