import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Admin backend configuration
const ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * GET /api/spot/deposit/status?depositId=xxx
 * Poll admin backend for deposit status
 * 
 * Returns current stage for real-time UI updates:
 * - initiated: Deposit request created, waiting for USDT
 * - detected: USDT transfer detected on-chain
 * - disbursing: Treasury sending Arb USDC to trading wallet
 * - disbursed: Arb USDC arrived in trading wallet
 * - bridging: Trading wallet sending USDC to Hyperliquid bridge
 * - completed: Funds credited to Hyperliquid account
 * - failed: Error occurred
 * - expired: 24h timeout reached
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const depositId = searchParams.get('depositId');

    if (!depositId) {
      return NextResponse.json({ 
        success: false, 
        error: "depositId parameter is required" 
      }, { status: 400 });
    }

    if (!ADMIN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Admin backend not configured"
      }, { status: 500 });
    }

    console.log(`[Spot Deposit Status] Checking status for deposit ${depositId}`);

    // Call admin backend to get deposit status
    const adminResponse = await fetch(`${ADMIN_BACKEND_URL}/api/deposits/${depositId}/status`, {
      method: 'GET',
      headers: {
        'x-api-key': ADMIN_API_KEY
      }
    });

    if (!adminResponse.ok) {
      if (adminResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: "Deposit not found"
        }, { status: 404 });
      }

      const errorData = await adminResponse.json().catch(() => ({}));
      console.error('[Spot Deposit Status] Admin backend error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: "Failed to get deposit status",
        details: errorData.error || `Admin backend returned ${adminResponse.status}`
      }, { status: 500 });
    }

    const adminData = await adminResponse.json();
    console.log(`[Spot Deposit Status] Admin response:`, adminData);

    // Map admin backend status to our frontend stages
    const deposit = adminData.data || adminData;
    let stage = 'initiated';
    let message = 'Waiting for USDT transfer';
    let estimatedTimeRemaining = '2-5 minutes';

    switch (deposit.status?.toLowerCase()) {
      case 'pending':
        stage = 'initiated';
        message = 'Waiting for USDT transfer';
        estimatedTimeRemaining = '2-5 minutes';
        break;
      
      case 'detected':
        stage = 'detected';
        message = 'USDT transfer detected, processing...';
        estimatedTimeRemaining = '1-2 minutes';
        break;
      
      case 'disbursing':
        stage = 'disbursing';
        message = 'Sending USDC to your trading wallet';
        estimatedTimeRemaining = '30-60 seconds';
        break;
      
      case 'disbursed':
      case 'completed':
        // Check if we need to trigger HL bridge
        stage = 'disbursed';
        message = 'USDC received, bridging to Hyperliquid...';
        estimatedTimeRemaining = '30-60 seconds';
        break;
      
      case 'bridging':
        stage = 'bridging';
        message = 'Bridging to Hyperliquid...';
        estimatedTimeRemaining = '30 seconds';
        break;
      
      case 'bridge_completed':
      case 'final_completed':
        stage = 'completed';
        message = 'Deposit completed! Funds available for trading';
        estimatedTimeRemaining = null;
        break;
      
      case 'failed':
      case 'error':
        stage = 'failed';
        message = deposit.errorMessage || 'Deposit failed';
        estimatedTimeRemaining = null;
        break;
      
      case 'expired':
        stage = 'expired';
        message = 'Deposit expired (24h timeout)';
        estimatedTimeRemaining = null;
        break;
      
      default:
        stage = 'initiated';
        message = 'Processing...';
        estimatedTimeRemaining = '2-5 minutes';
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        stage,
        message,
        estimatedTimeRemaining,
        amount: deposit.requestedAmount,
        depositChain: deposit.depositChain,
        treasuryAddress: deposit.treasuryAddress,
        txHash: deposit.txHash || null,
        bridgeTxHash: deposit.bridgeTxHash || null,
        createdAt: deposit.createdAt,
        updatedAt: deposit.updatedAt,
        expiresAt: deposit.expiresAt,
        // Raw admin data for debugging
        adminStatus: deposit.status,
        adminData: process.env.NODE_ENV === 'development' ? deposit : undefined
      }
    });

  } catch (error: any) {
    console.error("[Spot Deposit Status] Error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to get deposit status",
      details: error.message
    }, { status: 500 });
  }
}