import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";

// Admin backend configuration
const ADMIN_BACKEND_URL = process.env.ADMIN_BACKEND_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.warn('[Spot Deposit] ADMIN_API_KEY not configured - deposit initiation will fail');
}

interface DepositInitiateRequest {
  amount: number;
  depositChain: 'ethereum' | 'solana';
  depositFromAddress: string; // User's external wallet address (where they'll send USDT from)
}

/**
 * POST /api/spot/deposit/initiate
 * Initiate a spot deposit request
 * 
 * Flow:
 * 1. Authenticate user via Clerk
 * 2. Look up user's Arbitrum trading wallet address
 * 3. Call admin backend to create DepositRequest
 * 4. Return treasury address for user to send USDT to
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { amount, depositChain, depositFromAddress }: DepositInitiateRequest = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid amount" 
      }, { status: 400 });
    }

    if (amount < 5) {
      return NextResponse.json({ 
        success: false, 
        error: "Minimum deposit is 5 USDC equivalent. Below this amount will be lost forever on Hyperliquid bridge." 
      }, { status: 400 });
    }

    if (!['ethereum', 'solana'].includes(depositChain)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid deposit chain. Must be 'ethereum' or 'solana'" 
      }, { status: 400 });
    }

    if (!depositFromAddress) {
      return NextResponse.json({ 
        success: false, 
        error: "depositFromAddress is required" 
      }, { status: 400 });
    }

    console.log(`[Spot Deposit] Initiating deposit for user ${authUserId}: ${amount} USDT from ${depositChain}`);

    await connectDB();

    // Look up user's trading wallet (destination for disbursement)
    let userWallet = await UserWallet.findOne({ clerkUserId: authUserId });
    
    // Fallback: try by email if not found by Clerk ID
    if (!userWallet) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;

      if (email) {
        userWallet = await UserWallet.findOne({ email });
        
        // Link clerkUserId for future lookups
        if (userWallet && !userWallet.clerkUserId) {
          userWallet.clerkUserId = authUserId;
          await userWallet.save();
        }
      }
    }

    if (!userWallet || !userWallet.tradingWallet?.address) {
      return NextResponse.json({
        success: false,
        error: "Trading wallet not found. Please set up your trading wallet first.",
        details: "No Arbitrum trading wallet address found for user"
      }, { status: 404 });
    }

    const tradingWalletAddress = userWallet.tradingWallet.address;
    console.log(`[Spot Deposit] Using trading wallet: ${tradingWalletAddress}`);

    // Call admin backend to create DepositRequest
    const adminPayload = {
      userId: authUserId,
      userWalletAddress: tradingWalletAddress, // Arbitrum trading wallet (destination)
      depositFromAddress, // User's external wallet (source)
      chain: 'arbitrum', // Final destination chain
      requestedToken: 'USDC',
      requestedAmount: amount,
      depositChain, // Source chain (ethereum/solana)
      depositToken: 'USDT' // Source token
    };

    console.log(`[Spot Deposit] Calling admin backend:`, adminPayload);

    const adminResponse = await fetch(`${ADMIN_BACKEND_URL}/api/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ADMIN_API_KEY!
      },
      body: JSON.stringify(adminPayload)
    });

    if (!adminResponse.ok) {
      const errorData = await adminResponse.json().catch(() => ({}));
      console.error('[Spot Deposit] Admin backend error:', errorData);
      
      return NextResponse.json({
        success: false,
        error: "Failed to create deposit request",
        details: errorData.error || `Admin backend returned ${adminResponse.status}`
      }, { status: 500 });
    }

    const adminData = await adminResponse.json();
    console.log(`[Spot Deposit] Admin backend response:`, adminData);

    // Extract treasury address from admin response
    const treasuryAddress = adminData.treasuryAddress || adminData.data?.treasuryAddress;
    const depositId = adminData.id || adminData.data?.id;

    if (!treasuryAddress) {
      return NextResponse.json({
        success: false,
        error: "Failed to get treasury address from admin backend",
        details: "Treasury address missing in admin response"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        depositId,
        treasuryAddress,
        amount,
        depositChain,
        depositToken: 'USDT',
        destinationChain: 'arbitrum',
        destinationToken: 'USDC',
        tradingWalletAddress,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
        instructions: {
          step1: `Send exactly ${amount} USDT to ${treasuryAddress} on ${depositChain}`,
          step2: "Wait for automatic processing (2-5 minutes)",
          step3: "Funds will appear in your Hyperliquid spot balance"
        }
      }
    });

  } catch (error: any) {
    console.error("[Spot Deposit] Error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to initiate deposit",
      details: error.message
    }, { status: 500 });
  }
}