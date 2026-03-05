/**
 * Transaction Monitoring API Route
 * Starts monitoring blockchain transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { transactionMonitor } from '@/services/spot/TransactionMonitor';

// POST - Start monitoring a transaction
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
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
      authUser.userId
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
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
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
