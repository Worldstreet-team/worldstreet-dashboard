import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { verifyPIN, decryptWithPIN } from "@/lib/wallet/encryption";

// TRC20 ABI for token transfers
const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "who", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
];

/**
 * POST /api/tron/send-token
 * 
 * Send TRC20 tokens (backend signs transaction)
 * 
 * Body: {
 *   pin: string,
 *   recipient: string,
 *   amount: number,
 *   tokenAddress: string,
 *   decimals: number
 * }
 */
export async function POST(request: NextRequest) {
  let privateKey: string | null = null;

  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pin, recipient, amount, tokenAddress, decimals } = body;

    // Validate inputs
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
      );
    }

    if (!recipient || typeof recipient !== "string") {
      return NextResponse.json(
        { success: false, message: "Recipient address is required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400 }
      );
    }

    if (!tokenAddress || typeof tokenAddress !== "string") {
      return NextResponse.json(
        { success: false, message: "Token address is required" },
        { status: 400 }
      );
    }

    if (typeof decimals !== "number") {
      return NextResponse.json(
        { success: false, message: "Token decimals is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user profile
    const profile = await DashboardProfile.findOne({
      authUserId: authUser.userId,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if Tron wallet exists
    if (!profile.wallets?.tron?.address) {
      return NextResponse.json(
        { success: false, message: "Tron wallet not found" },
        { status: 404 }
      );
    }

    // Verify PIN
    const pinValid = verifyPIN(pin, profile.walletPinHash);
    if (!pinValid) {
      return NextResponse.json(
        { success: false, message: "Invalid PIN" },
        { status: 401 }
      );
    }

    // Decrypt private key
    privateKey = decryptWithPIN(
      profile.wallets.tron.encryptedPrivateKey,
      pin
    );

    // Initialize TronWeb
    const TronWeb = (await import("tronweb")).default;
    const tronWeb = new TronWeb({
      fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.shasta.trongrid.io",
      privateKey: privateKey,
    });

    // Validate addresses
    if (!TronWeb.isAddress(recipient)) {
      return NextResponse.json(
        { success: false, message: "Invalid recipient address" },
        { status: 400 }
      );
    }

    if (!TronWeb.isAddress(tokenAddress)) {
      return NextResponse.json(
        { success: false, message: "Invalid token address" },
        { status: 400 }
      );
    }

    // Get token contract
    const contract = await tronWeb.contract(TRC20_ABI, tokenAddress);

    // Check token balance
    const balance = await contract.balanceOf(profile.wallets.tron.address).call();
    const balanceAmount = Number(balance.toString()) / Math.pow(10, decimals);

    if (balanceAmount < amount) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient token balance. Available: ${balanceAmount}`,
        },
        { status: 400 }
      );
    }

    // Check TRX balance for fees
    const trxBalance = await tronWeb.trx.getBalance(profile.wallets.tron.address);
    if (trxBalance < 15_000_000) {
      // Need ~15 TRX for fees
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient TRX for transaction fees (need ~15 TRX)",
        },
        { status: 400 }
      );
    }

    // Calculate raw amount
    const rawAmount = Math.floor(amount * Math.pow(10, decimals));

    // Get token symbol
    let tokenSymbol = "TOKEN";
    try {
      tokenSymbol = await contract.symbol().call();
    } catch {
      // Ignore if symbol() fails
    }

    // Send token transfer
    const txId = await contract.transfer(recipient, rawAmount).send({
      feeLimit: 100_000_000, // 100 TRX max fee
      callValue: 0,
      shouldPollResponse: true,
      privateKey: privateKey,
    });

    // Return transaction details
    return NextResponse.json({
      success: true,
      txHash: txId,
      explorerUrl: `https://tronscan.org/#/transaction/${txId}`,
      from: profile.wallets.tron.address,
      to: recipient,
      amount,
      token: tokenSymbol,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[POST /api/tron/send-token] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Token transfer failed",
      },
      { status: 500 }
    );
  } finally {
    // CRITICAL: Clear private key from memory
    if (privateKey) {
      privateKey = null;
    }
  }
}
