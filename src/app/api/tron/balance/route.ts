import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

// External balance API
const EXTERNAL_BALANCE_API = 
  process.env.TRON_BALANCE_API || 
  "https://trading.watchup.site/api/tron/balance";

/**
 * GET /api/tron/balance
 * 
 * Get TRX balance for the authenticated user's Tron wallet
 * This proxies the request to the external balance API
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

    // Call external balance API
    const response = await fetch(`${EXTERNAL_BALANCE_API}/${address}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[tron/balance] External API error:", errorText);
      throw new Error("Failed to fetch balance from external service");
    }

    const data = await response.json();
    console.log("[tron/balance] External API response:", data);

    if (!data.success) {
      throw new Error(data.message || "External API returned error");
    }

    // Parse TRX balance
    const trxBalance = parseFloat(data.trx?.balance || "0");
    const trxInSun = data.trx?.balanceInSun || "0";

    // Parse token balances
    const tokens = (data.tokens || []).map((token: any) => ({
      symbol: token.symbol,
      name: token.name,
      contractAddress: token.contractAddress,
      balance: parseFloat(token.balance || "0"),
      decimals: token.decimals || 6,
      error: token.error,
    }));

    // Return the balance data
    return NextResponse.json({
      success: true,
      address: data.address,
      balance: {
        trx: trxBalance,
        trxInSun: trxInSun,
        tokens: tokens,
      },
      network: data.network || "mainnet",
      timestamp: data.timestamp || new Date().toISOString(),
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
