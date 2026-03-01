import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

// TRC20 ABI for balance queries
const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "who", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

// Popular TRC20 tokens
const POPULAR_TOKENS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    decimals: 6,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
    decimals: 6,
  },
];

/**
 * GET /api/tron/balance
 * 
 * Get TRX and TRC20 token balances for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
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

    const address = profile.wallets.tron.address;

    // Initialize TronWeb (read-only, no private key needed)
    const TronWeb = (await import("tronweb")).default;
    const tronWeb = new TronWeb({
      fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
    });

    // Get TRX balance
    const trxBalance = await tronWeb.trx.getBalance(address);
    const trx = trxBalance / 1_000_000; // Convert Sun to TRX

    // Get TRC20 token balances
    const tokens = [];

    for (const token of POPULAR_TOKENS) {
      try {
        const contract = await tronWeb.contract(TRC20_ABI, token.address);
        const balance = await contract.balanceOf(address).call();
        const amount = Number(balance.toString()) / Math.pow(10, token.decimals);

        tokens.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: amount,
          decimals: token.decimals,
          usdValue: amount, // For stablecoins, balance ≈ USD value
        });
      } catch (error) {
        console.error(`Error fetching ${token.symbol} balance:`, error);
        // Continue with other tokens
      }
    }

    return NextResponse.json({
      success: true,
      address,
      balance: {
        trx,
        tokens,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/tron/balance] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch balance",
      },
      { status: 500 }
    );
  }
}
