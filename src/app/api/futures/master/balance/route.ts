import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { hyperliquid } from '@/lib/hyperliquid/simple';
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
    
    // For Hyperliquid, we can use a master wallet address from env
    const masterAddress = process.env.HYPERLIQUID_MASTER_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    const accountState = await hyperliquid.getAccount(masterAddress);
    
    const accountValue = accountState?.crossMarginSummary?.accountValue || "0";
    const withdrawable = accountState?.withdrawable || "0";
    
    return NextResponse.json({
      success: true,
      data: {
        address: masterAddress,
        balance: parseFloat(accountValue),
        withdrawable: parseFloat(withdrawable)
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
