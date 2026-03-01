import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

/**
 * GET /api/tron/transaction/:txHash
 * 
 * Get status and details of a specific transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { txHash: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { txHash } = params;

    if (!txHash) {
      return NextResponse.json(
        { success: false, message: "Transaction hash is required" },
        { status: 400 }
      );
    }

    // Initialize TronWeb (read-only)
    const TronWeb = (await import("tronweb")).default;
    const tronWeb = new TronWeb({
      fullHost: process.env.NEXT_PUBLIC_TRON_RPC || "https://api.trongrid.io",
    });

    // Get transaction details
    const tx = await tronWeb.trx.getTransaction(txHash);
    
    if (!tx || !tx.txID) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Get transaction info (includes block number, fees, etc.)
    const txInfo = await tronWeb.trx.getTransactionInfo(txHash);

    // Parse transaction details
    const type = tx.raw_data?.contract?.[0]?.type || "unknown";
    const value = tx.raw_data?.contract?.[0]?.parameter?.value || {};
    
    let parsedTx: any = {
      hash: tx.txID,
      status: txInfo.receipt?.result === "SUCCESS" ? "confirmed" : "failed",
      blockNumber: txInfo.blockNumber || null,
      timestamp: tx.raw_data?.timestamp 
        ? new Date(tx.raw_data.timestamp).toISOString() 
        : null,
    };

    // Parse based on transaction type
    if (type === "TransferContract") {
      parsedTx.from = value.owner_address;
      parsedTx.to = value.to_address;
      parsedTx.amount = (value.amount || 0) / 1_000_000; // Convert Sun to TRX
      parsedTx.fee = (txInfo.fee || 0) / 1_000_000;
    } else if (type === "TriggerSmartContract") {
      parsedTx.from = value.owner_address;
      parsedTx.to = value.contract_address;
      parsedTx.fee = (txInfo.fee || 0) / 1_000_000;
    }

    // Calculate confirmations (approximate)
    const currentBlock = await tronWeb.trx.getCurrentBlock();
    const confirmations = parsedTx.blockNumber 
      ? currentBlock.block_header.raw_data.number - parsedTx.blockNumber 
      : 0;

    parsedTx.confirmations = confirmations;

    return NextResponse.json({
      success: true,
      transaction: parsedTx,
    });
  } catch (error: any) {
    console.error("[GET /api/tron/transaction/:txHash] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch transaction",
      },
      { status: 500 }
    );
  }
}
