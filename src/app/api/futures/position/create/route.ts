import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { getPositionManager, initializeDriftServices } from '@/services/drift';
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
    const params = body;
    
    await connectDB();
    await initializeDriftServices();
    
    const positionManager = getPositionManager();
    const result = await positionManager.createPosition(userId, params);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleApiError(error);
  }
}
