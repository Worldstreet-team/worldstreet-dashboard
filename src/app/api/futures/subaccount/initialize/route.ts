import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import { getSubaccountManager, initializeDriftServices } from '@/services/drift';
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
    
    await connectDB();
    await initializeDriftServices();
    
    const subaccountManager = getSubaccountManager();
    const subaccountInfo = await subaccountManager.initializeSubaccount(userId);
    
    return NextResponse.json({
      success: true,
      data: subaccountInfo
    });
  } catch (error) {
    return handleApiError(error);
  }
}
