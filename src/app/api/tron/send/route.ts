import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { verifyPIN, decryptWithPIN } from "@/lib/wallet/encryption";

/**
 * POST /api/tron/send
 * 
 * Send TRX to another address (backend signs transaction)
 * 
 * Body: {
 *   pin: string,
 *   recipient: string,
 *   amount: number (in TRX)
 * }
 */
export async function POST(request: NextRequest) {
  let privateKey: string | null = null;

  try {
    const authUser = await getAuthUser();
    console.log("AUTH USER: ", authUser)
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pin, recipient, amount } = body;

    // Validate inputs
    // if (!pin || typeof pin !== "string") {
    //   return NextResponse.json(
    //     { success: false, message: "PIN is required" },
    //     { status: 400 }
    //   );
    // }

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
    // const pinValid = verifyPIN(pin, profile.walletPinHash);
    // if (!pinValid) {
    //   return NextResponse.json(
    //     { success: false, message: "Invalid PIN" },
    //     { status: 401 }
    //   );
    // }

    // Decrypt private key
    privateKey = decryptWithPIN(
      profile.wallets.tron.encryptedPrivateKey,
      pin
    );

    console.log("Private Key: ", privateKey)

    // Initialize TronWeb
    const TronWeb = (await import("tronweb")).default;
    const tronWeb = new TronWeb({
      fullHost: "https://tron-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN",
      privateKey: privateKey,
    });

    // Validate recipient address
    if (!tronWeb.isAddress(recipient)) {
      return NextResponse.json(
        { success: false, message: "Invalid recipient address" },
        { status: 400 }
      );
    }

    // Convert TRX to Sun
    const amountSun = tronWeb.toSun(amount);

    // Build transaction (will fail if insufficient balance)
    const tx = await tronWeb.transactionBuilder.sendTrx(
      recipient,
      amountSun,
      profile.wallets.tron.address
    );

    // Sign transaction
    const signedTx = await tronWeb.trx.sign(tx, privateKey);

    // Broadcast transaction
    const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

    // Check if transaction was successful
    if (!receipt.result) {
      throw new Error(receipt.message || "Transaction failed");
    }

    const txHash = receipt.txid || receipt.transaction?.txID;

    // Return transaction details
    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `https://tronscan.org/#/transaction/${txHash}`,
      from: profile.wallets.tron.address,
      to: recipient,
      amount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[POST /api/tron/send] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Transaction failed",
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
