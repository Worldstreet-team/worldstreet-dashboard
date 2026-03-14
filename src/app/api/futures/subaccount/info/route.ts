import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { UserWallet } from "@/models/UserWallet";
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
    
    await connectDB();
    
    const userWallet = await UserWallet.findOne({ clerkUserId: userId });
    
    if (!userWallet) {
      return NextResponse.json({
        success: false,
        error: 'Wallet not found'
      }, { status: 404 });
    }
    
    const address = userWallet.tradingWallet?.address || userWallet.wallets?.ethereum?.address;
    
    if (!address) {
       return NextResponse.json({
        success: false,
        error: 'Address not found'
      }, { status: 404 });
    }

    const accountState = await hyperliquid.getAccount(address);
    const summary = accountState?.crossMarginSummary || {};
    
    return NextResponse.json({
      success: true,
      data: {
        userId,
        address,
        accountValue: parseFloat(summary.accountValue || "0"),
        withdrawable: parseFloat(accountState?.withdrawable || "0"),
        totalMarginUsed: parseFloat(summary.totalMarginUsed || "0"),
        totalRawUsd: parseFloat(accountState?.marginSummary?.accountValue || "0"),
        unrealizedPnl: accountState?.assetPositions?.reduce((acc: number, p: any) => acc + parseFloat(p.position.unrealizedPnl || "0"), 0) || 0,
        positions: accountState?.assetPositions || [],
        isHyperliquid: true
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
