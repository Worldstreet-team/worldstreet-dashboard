import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { UserWallet } from "@/models/UserWallet";
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
    
    // For Hyperliquid, we ensure the user has a trading wallet setup
    let userWallet = await UserWallet.findOne({ clerkUserId: userId });
    
    if (!userWallet) {
        // In a real flow, this might trigger wallet creation
        return NextResponse.json({
            success: false,
            error: 'No wallet record found. Please initialize your trading wallet first.'
        }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Hyperliquid account ready',
      data: {
        address: userWallet.tradingWallet?.address || userWallet.wallets?.ethereum?.address,
        isTradingWallet: !!userWallet.tradingWallet?.address
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
