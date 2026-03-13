import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendSol } from "@/lib/privy/solana";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/wallet/solana/send
 * Send SOL from user's Privy wallet using Clerk authentication
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Solana Send] Starting transaction request');

    // 1. Authenticate with Clerk and get JWT
    const { userId, getToken } = await auth();

    if (!userId) {
      console.error('[Solana Send] No user ID found in Clerk session');
      return NextResponse.json(
        { error: "Unauthorized - No active session found" },
        { status: 401 }
      );
    }

    console.log('[Solana Send] Clerk user authenticated:', userId);

    // Get the Clerk JWT token for Privy authorization
    let clerkJwt: string | null = null;
    try {
      clerkJwt = await getToken();
      console.log('[Solana Send] Clerk JWT obtained:', clerkJwt ? '✓' : '✗');
    } catch (tokenError) {
      console.error('[Solana Send] Failed to get Clerk token:', tokenError);
    }

    // JWT is required for Privy authorization
    if (!clerkJwt) {
      console.error('[Solana Send] No Clerk JWT available - cannot authorize transaction');
      return NextResponse.json(
        { error: "Authentication token not available" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('[Solana Send] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { to, amount } = requestBody;

    // Validate required fields
    if (!to || !amount) {
      console.error('[Solana Send] Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        { status: 400 }
      );
    }

    // Validate Solana address (basic check)
    if (typeof to !== 'string' || to.length < 32 || to.length > 44) {
      console.error('[Solana Send] Invalid Solana address format:', to);
      return NextResponse.json(
        { error: "Invalid Solana address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('[Solana Send] Invalid amount:', amount);
      return NextResponse.json(
        { error: "Invalid amount - must be a positive number" },
        { status: 400 }
      );
    }

    console.log('[Solana Send] Request validated - to:', to, 'amount:', amountNum);

    // 3. Get user's email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error('[Solana Send] No email found for Clerk user:', userId);
      return NextResponse.json(
        { error: "No email found for user" },
        { status: 400 }
      );
    }

    console.log('[Solana Send] User email:', email);

    // 4. Connect to database and find user's wallet by email
    await connectDB();

    // Query by email (following the get-wallet pattern)
    const userWallet = await UserWallet.findOne({ email });

    if (!userWallet) {
      console.error('[Solana Send] No wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Wallet not found for this user",
          hint: "Please create a wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    // Check if Solana wallet exists
    if (!userWallet.wallets?.solana) {
      console.error('[Solana Send] No Solana wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Solana wallet not found",
          hint: "Please create a Solana wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    const walletId = userWallet.wallets.solana.walletId;

    if (!walletId) {
      console.error('[Solana Send] Solana wallet ID is missing in database');
      return NextResponse.json(
        { error: "Solana wallet ID not found in database" },
        { status: 500 }
      );
    }

    console.log('[Solana Send] Found wallet ID:', walletId);
    console.log('[Solana Send] Wallet address:', userWallet.wallets.solana.address);

    // 4. Send the transaction using Privy with Clerk JWT
    console.log('[Solana Send] Calling sendSol with wallet:', walletId);
    
    let result;
    try {
      result = await sendSol(walletId, to, amount.toString(), clerkJwt);
      console.log('[Solana Send] Transaction successful:', result.signature);
    } catch (sendError: any) {
      console.error('[Solana Send] sendSol failed:', sendError);
      return NextResponse.json(
        { 
          error: "Failed to send transaction",
          details: sendError.message || "Unknown error occurred"
        },
        { status: 500 }
      );
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      signature: result.signature,
      status: result.status,
      from: userWallet.wallets.solana.address,
      to,
      amount: amountNum
    });

  } catch (error: any) {
    console.error('[Solana Send] Unexpected error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: "Authentication failed", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to send SOL transaction",
        details: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}
