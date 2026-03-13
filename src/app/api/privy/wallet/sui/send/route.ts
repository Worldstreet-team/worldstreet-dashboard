import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendSui } from "@/lib/privy/sui";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/wallet/sui/send
 * Send SUI from user's Privy wallet using Clerk authentication
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Sui Send] Starting transaction request');

    // 1. Authenticate with Clerk and get JWT
    const { userId, getToken } = await auth();

    if (!userId) {
      console.error('[Sui Send] No user ID found in Clerk session');
      return NextResponse.json(
        { error: "Unauthorized - No active session found" },
        { status: 401 }
      );
    }

    console.log('[Sui Send] Clerk user authenticated:', userId);

    // Get the Clerk JWT token for Privy authorization
    let clerkJwt: string | null = null;
    try {
      clerkJwt = await getToken();
      console.log('[Sui Send] Clerk JWT obtained:', clerkJwt ? '✓' : '✗');
    } catch (tokenError) {
      console.error('[Sui Send] Failed to get Clerk token:', tokenError);
    }

    // JWT is required for Privy authorization
    if (!clerkJwt) {
      console.error('[Sui Send] No Clerk JWT available - cannot authorize transaction');
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
      console.error('[Sui Send] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { to, amount } = requestBody;

    // Validate required fields
    if (!to || !amount) {
      console.error('[Sui Send] Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        { status: 400 }
      );
    }

    // Validate Sui address (starts with 0x and is 64 hex chars)
    if (!/^0x[a-fA-F0-9]{64}$/.test(to)) {
      console.error('[Sui Send] Invalid Sui address format:', to);
      return NextResponse.json(
        { error: "Invalid Sui address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('[Sui Send] Invalid amount:', amount);
      return NextResponse.json(
        { error: "Invalid amount - must be a positive number" },
        { status: 400 }
      );
    }

    console.log('[Sui Send] Request validated - to:', to, 'amount:', amountNum);

    // 3. Get user's email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error('[Sui Send] No email found for Clerk user:', userId);
      return NextResponse.json(
        { error: "No email found for user" },
        { status: 400 }
      );
    }

    console.log('[Sui Send] User email:', email);

    // 4. Connect to database and find user's wallet by email
    await connectDB();

    // Query by email (following the get-wallet pattern)
    const userWallet = await UserWallet.findOne({ email });

    if (!userWallet) {
      console.error('[Sui Send] No wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Wallet not found for this user",
          hint: "Please create a wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    // Check if Sui wallet exists
    if (!userWallet.wallets?.sui) {
      console.error('[Sui Send] No Sui wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Sui wallet not found",
          hint: "Please create a Sui wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    const walletId = userWallet.wallets.sui.walletId;

    if (!walletId) {
      console.error('[Sui Send] Sui wallet ID is missing in database');
      return NextResponse.json(
        { error: "Sui wallet ID not found in database" },
        { status: 500 }
      );
    }

    console.log('[Sui Send] Found wallet ID:', walletId);
    console.log('[Sui Send] Wallet address:', userWallet.wallets.sui.address);

    // 5. Send the transaction using Privy with Clerk JWT
    console.log('[Sui Send] Calling sendSui with wallet:', walletId);
    
    let result;
    try {
      console.log("CLERK JWT: ", clerkJwt)
      result = await sendSui(walletId, to, amount.toString(), clerkJwt);
      console.log('[Sui Send] Transaction successful:', result.digest);
    } catch (sendError: any) {
      console.error('[Sui Send] sendSui failed:', sendError);
      return NextResponse.json(
        { 
          error: "Failed to send transaction",
          details: sendError.message || "Unknown error occurred"
        },
        { status: 500 }
      );
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      digest: result.digest,
      status: result.status,
      from: userWallet.wallets.sui.address,
      to,
      amount: amountNum,
      explorerUrl: `https://suiscan.xyz/mainnet/tx/${result.digest}`
    });

  } catch (error: any) {
    console.error('[Sui Send] Unexpected error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: "Authentication failed", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to send SUI transaction",
        details: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}
