import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { getDepositManager, initializeDriftServices } from '@/services/drift';
import { handleApiError } from '@/lib/errors/apiErrorHandler';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { amount } = body;
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }
    
    await connectDB();
    await initializeDriftServices();
    
    const depositManager = getDepositManager();
    const result = await depositManager.depositCollateral(userId, amount);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleApiError(error);
  }
}
