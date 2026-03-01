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

    if (!data.success) {
      throw new Error(data.message || "External API returned error");
    }

    // Return the balance data
    return NextResponse.json({
      success: true,
      address: data.address,
      balance: {
        trx: parseFloat(data.balance?.trx || "0"),
        sun: data.balance?.sun || "0",
      },
      network: data.network,
      timestamp: data.timestamp,
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
