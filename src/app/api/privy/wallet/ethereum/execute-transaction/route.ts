import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendEthereumTransaction } from "@/lib/privy/ethereum";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/wallet/ethereum/execute-transaction
 * Execute a generic Ethereum transaction from user's Privy wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ error: "Authentication token not available" }, { status: 401 });
    }

    const { to, value, data, chainId, gasLimit } = await request.json();

    if (!to || !chainId) {
      return NextResponse.json({ error: "Missing required fields: to, chainId" }, { status: 400 });
    }

    // Connect to database to get walletId
    await connectDB();
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkClient = await currentUser();
    const email = clerkClient?.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const userWallet = await UserWallet.findOne({ email });
    if (!userWallet?.wallets?.ethereum?.walletId) {
      return NextResponse.json({ error: "Ethereum wallet not found" }, { status: 404 });
    }

    const walletId = userWallet.wallets.ethereum.walletId;

    // Send transaction via Privy
    const result = await sendEthereumTransaction(
      walletId,
      {
        to,
        value: value || "0x0",
        data: data || "0x",
        chain_id: Number(chainId),
        gas: gasLimit,
      },
      clerkJwt
    );

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      status: result.status
    });

  } catch (error: any) {
    console.error('[Execute Transaction] Error:', error);
    return NextResponse.json({ 
      error: "Failed to execute transaction", 
      details: error.message 
    }, { status: 500 });
  }
}
