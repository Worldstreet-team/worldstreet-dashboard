import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import FeeAuditLog from '@/models/FeeAuditLog';
import { handleApiError } from '@/lib/errors/apiErrorHandler';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await connectDB();
    
    // Calculate fee summary
    const logs = await FeeAuditLog.find({});
    
    const totalFeesCollected = logs.reduce((sum, log) => sum + log.feeAmount, 0);
    const numberOfDeposits = logs.length;
    const averageFeeAmount = numberOfDeposits > 0 ? totalFeesCollected / numberOfDeposits : 0;
    const lastFeeTimestamp = logs.length > 0 
      ? logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        totalFeesCollected,
        numberOfDeposits,
        averageFeeAmount,
        lastFeeTimestamp
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
