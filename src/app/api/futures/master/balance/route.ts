import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMasterWalletManager, initializeDriftServices } from '@/services/drift';
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
    
    // Ensure services are initialized
    await initializeDriftServices();
    
    const masterWalletManager = getMasterWalletManager();
    const balance = await masterWalletManager.getBalance();
    const address = masterWalletManager.getAddress();
    
    return NextResponse.json({
      success: true,
      data: {
        address,
        balance
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
