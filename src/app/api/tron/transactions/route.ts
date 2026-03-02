import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/tron/transactions
 * 
 * Get transaction history for the authenticated user's Tron wallet
 * 
 * Query params:
 *   - limit: number of transactions to return (default: 20)
 *   - offset: pagination offset (default: 0)
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch transactions from TronGrid API
    const trongridUrl = `https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN/v1/accounts/${address}/transactions?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(trongridUrl);
    
    if (!response.ok) {
      throw new Error("Failed to fetch transactions from TronGrid");
    }

    const data = await response.json();

    // Parse and format transactions
    const transactions = (data.data || []).map((tx: any) => {
      const type = tx.raw_data?.contract?.[0]?.type || "unknown";
      const value = tx.raw_data?.contract?.[0]?.parameter?.value || {};
      
      let parsedTx: any = {
        hash: tx.txID,
        type: type.toLowerCase(),
        status: tx.ret?.[0]?.contractRet === "SUCCESS" ? "confirmed" : "failed",
        timestamp: new Date(tx.block_timestamp).toISOString(),
        explorerUrl: `https://tronscan.org/#/transaction/${tx.txID}`,
      };

      // Parse based on transaction type
      if (type === "TransferContract") {
        parsedTx.from = value.owner_address;
        parsedTx.to = value.to_address;
        parsedTx.amount = (value.amount || 0) / 1_000_000; // Convert Sun to TRX
        parsedTx.token = null;
      } else if (type === "TriggerSmartContract") {
        // Token transfer
        parsedTx.from = value.owner_address;
        parsedTx.to = value.contract_address;
        parsedTx.token = "TOKEN"; // Would need to decode to get actual token
      }

      return parsedTx;
    });

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        total: data.meta?.total || 0,
        limit,
        offset,
        hasMore: data.meta?.page_size === limit,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/tron/transactions] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}
