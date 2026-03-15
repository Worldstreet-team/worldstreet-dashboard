import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { bridgeToHyperliquid } from "@/lib/hyperliquid/bridge";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

// Admin backend configuration
const ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

/**
 * POST /api/spot/deposit/bridge
 * Auto-trigger Hyperliquid bridge after disbursement
 * 
 * This endpoint is called either:
 * 1. By polling when deposit status becomes 'disbursed'
 * 2. By webhook from admin backend (future enhancement)
 * 
 * Flow:
 * 1. Verify USDC arrived in trading wallet
 * 2. Bridge USDC to Hyperliquid using shared utility
 * 3. Update admin backend with bridge status
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, getToken } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { depositId, amount } = await request.json();

    if (!depositId) {
      return NextResponse.json({ 
        success: false, 
        error: "depositId is required" 
      }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "amount is required" 
      }, { status: 400 });
    }

    console.log(`[Spot Deposit Bridge] Triggering bridge for deposit ${depositId}, amount: ${amount}`);

    await connectDB();

    // Look up user's trading wallet
    let userWallet = await UserWallet.findOne({ clerkUserId: authUserId });
    
    if (!userWallet) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;

      if (email) {
        userWallet = await UserWallet.findOne({ email });
      }
    }

    if (!userWallet || !userWallet.tradingWallet?.address || !userWallet.tradingWallet?.walletId) {
      return NextResponse.json({
        success: false,
        error: "Trading wallet not found",
        details: "No Arbitrum trading wallet found for user"
      }, { status: 404 });
    }

    const tradingWalletAddress = userWallet.tradingWallet.address;
    const tradingWalletId = userWallet.tradingWallet.walletId;

    console.log(`[Spot Deposit Bridge] Using trading wallet: ${tradingWalletAddress}`);

    // Verify USDC balance in trading wallet
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http()
    });

    try {
      const balance = await publicClient.readContract({
        address: ARBITRUM_USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [tradingWalletAddress as `0x${string}`]
      });

      const balanceUsdc = Number(balance) / 1e6; // Convert from 6 decimals
      console.log(`[Spot Deposit Bridge] Trading wallet USDC balance: ${balanceUsdc}`);

      if (balanceUsdc < amount) {
        return NextResponse.json({
          success: false,
          error: "Insufficient USDC balance in trading wallet",
          details: `Expected ${amount} USDC, found ${balanceUsdc} USDC`
        }, { status: 400 });
      }
    } catch (error) {
      console.error('[Spot Deposit Bridge] Failed to check balance:', error);
      // Continue anyway - balance check is not critical
    }

    // Get Clerk JWT for authorization
    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ success: false, error: "Failed to get auth token" }, { status: 401 });
    }

    // Update admin backend - set status to 'bridging'
    if (ADMIN_API_KEY) {
      try {
        await fetch(`${ADMIN_BACKEND_URL}/api/deposits/${depositId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ADMIN_API_KEY
          },
          body: JSON.stringify({ 
            status: 'bridging',
            message: 'Bridging USDC to Hyperliquid'
          })
        });
      } catch (error) {
        console.warn('[Spot Deposit Bridge] Failed to update admin status to bridging:', error);
      }
    }

    // Bridge USDC to Hyperliquid using shared utility
    const bridgeResult = await bridgeToHyperliquid({
      walletId: tradingWalletId,
      amount,
      asset: 'USDC',
      clerkJwt
    });

    if (!bridgeResult.success) {
      // Update admin backend with failure
      if (ADMIN_API_KEY) {
        try {
          await fetch(`${ADMIN_BACKEND_URL}/api/deposits/${depositId}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ADMIN_API_KEY
            },
            body: JSON.stringify({ 
              status: 'failed',
              errorMessage: `Bridge failed: ${bridgeResult.error}`
            })
          });
        } catch (error) {
          console.warn('[Spot Deposit Bridge] Failed to update admin status to failed:', error);
        }
      }

      return NextResponse.json({
        success: false,
        error: bridgeResult.error,
        details: bridgeResult.details
      }, { status: 500 });
    }

    console.log(`[Spot Deposit Bridge] Bridge successful! TxHash: ${bridgeResult.txHash}`);

    // Update admin backend with success
    if (ADMIN_API_KEY) {
      try {
        await fetch(`${ADMIN_BACKEND_URL}/api/deposits/${depositId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ADMIN_API_KEY
          },
          body: JSON.stringify({ 
            status: 'bridge_completed',
            bridgeTxHash: bridgeResult.txHash,
            message: 'Successfully bridged to Hyperliquid'
          })
        });
      } catch (error) {
        console.warn('[Spot Deposit Bridge] Failed to update admin status to completed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        bridgeTxHash: bridgeResult.txHash,
        amount,
        tradingWalletAddress,
        message: "Successfully bridged to Hyperliquid"
      }
    });

  } catch (error: any) {
    console.error("[Spot Deposit Bridge] Error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to bridge to Hyperliquid",
      details: error.message
    }, { status: 500 });
  }
}