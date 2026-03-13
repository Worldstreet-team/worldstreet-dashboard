import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendEth } from "@/lib/privy/ethereum";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/wallet/ethereum/send
 * Send ETH from user's Privy wallet using Clerk authentication
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Ethereum Send] Starting transaction request');

    // 1. Authenticate with Clerk and get JWT
    const { userId, getToken } = await auth();

    if (!userId) {
      console.error('[Ethereum Send] No user ID found in Clerk session');
      return NextResponse.json(
        { error: "Unauthorized - No active session found" },
        { status: 401 }
      );
    }

    console.log('[Ethereum Send] Clerk user authenticated:', userId);

    // Get the Clerk JWT token for Privy authorization
    let clerkJwt: string | null = null;
    try {
      clerkJwt = await getToken();
      console.log('[Ethereum Send] Clerk JWT obtained:', clerkJwt ? '✓' : '✗');
    } catch (tokenError) {
      console.error('[Ethereum Send] Failed to get Clerk token:', tokenError);
    }

    // JWT is required for Privy authorization
    if (!clerkJwt) {
      console.error('[Ethereum Send] No Clerk JWT available - cannot authorize transaction');
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
      console.error('[Ethereum Send] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { to, amount } = requestBody;

    // Validate required fields
    if (!to || !amount) {
      console.error('[Ethereum Send] Missing required fields');
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        { status: 400 }
      );
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      console.error('[Ethereum Send] Invalid Ethereum address format:', to);
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('[Ethereum Send] Invalid amount:', amount);
      return NextResponse.json(
        { error: "Invalid amount - must be a positive number" },
        { status: 400 }
      );
    }

    console.log('[Ethereum Send] Request validated - to:', to, 'amount:', amountNum);

    // 3. Get user's email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      console.error('[Ethereum Send] No email found for Clerk user:', userId);
      return NextResponse.json(
        { error: "No email found for user" },
        { status: 400 }
      );
    }

    console.log('[Ethereum Send] User email:', email);

    // 4. Connect to database and find user's wallet by email
    await connectDB();

    // Query by email (following the get-wallet pattern)
    const userWallet = await UserWallet.findOne({ email });

    if (!userWallet) {
      console.error('[Ethereum Send] No wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Wallet not found for this user",
          hint: "Please create a wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    // Check if Ethereum wallet exists
    if (!userWallet.wallets?.ethereum) {
      console.error('[Ethereum Send] No Ethereum wallet found for email:', email);
      return NextResponse.json(
        { 
          error: "Ethereum wallet not found",
          hint: "Please create an Ethereum wallet first by calling /api/privy/get-wallet?email=" + email
        },
        { status: 404 }
      );
    }

    const walletId = userWallet.wallets.ethereum.walletId;

    if (!walletId) {
      console.error('[Ethereum Send] Ethereum wallet ID is missing in database');
      return NextResponse.json(
        { error: "Ethereum wallet ID not found in database" },
        { status: 500 }
      );
    }

    console.log('[Ethereum Send] Found wallet ID:', walletId);
    console.log('[Ethereum Send] Wallet address:', userWallet.wallets.ethereum.address);

    // 5. Send the transaction using Privy with Clerk JWT
    console.log('[Ethereum Send] Calling sendEth with wallet:', walletId);
    
    let result;
    try {
      result = await sendEth(walletId, to, amount.toString(), clerkJwt);
      console.log('[Ethereum Send] Transaction successful:', result.transactionHash);
    } catch (sendError: any) {
      console.error('[Ethereum Send] sendEth failed:', sendError);
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
      transactionHash: result.transactionHash,
      status: result.status,
      from: userWallet.wallets.ethereum.address,
      to,
      amount: amountNum
    });

  } catch (error: any) {
    console.error('[Ethereum Send] Unexpected error:', error);
    
    // Handle specific error types
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: "Authentication failed", details: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to send ETH transaction",
        details: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
}
