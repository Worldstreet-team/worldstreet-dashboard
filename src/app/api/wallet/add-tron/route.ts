import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { verifyPIN, encryptWithPIN } from "@/lib/wallet/encryption";

// External wallet generation service
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || "https://trading.watchup.site/api/generate-wallet";

/**
 * POST /api/wallet/add-tron
 * 
 * Add Tron wallet to existing user account.
 * This endpoint calls the external wallet generation service,
 * then encrypts and stores the wallet.
 * 
 * Body: {
 *   pin: string (for verification and encryption)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pin } = body;

    // Validate required fields
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get existing profile
    const profile = await DashboardProfile.findOne({
      authUserId: authUser.userId,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if wallets are generated
    if (!profile.walletsGenerated) {
      return NextResponse.json(
        {
          success: false,
          message: "Please set up your main wallets first",
        },
        { status: 400 }
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

    // Check if Tron wallet already exists
    if (profile.wallets?.tron?.address) {
      return NextResponse.json(
        {
          success: true,
          message: "Tron wallet already exists",
          wallet: {
            tron: { address: profile.wallets.tron.address },
          },
          address: profile.wallets.tron.address,
        },
        { status: 200 }
      );
    }

    // Call external wallet generation service
    console.log("[add-tron] Calling external wallet service for TRC wallet generation");
    
    const walletResponse = await fetch(WALLET_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chain: "trc",
      }),
    });

    if (!walletResponse.ok) {
      const errorText = await walletResponse.text();
      console.error("[add-tron] Wallet service error:", errorText);
      throw new Error("Failed to generate wallet from external service");
    }

    const walletData = await walletResponse.json();

    // Validate response
    if (!walletData.success || !walletData.address || !walletData.privateKey) {
      console.error("[add-tron] Invalid wallet service response:", walletData);
      throw new Error("Invalid response from wallet generation service");
    }

    console.log("[add-tron] Wallet generated successfully:", walletData.address);

    // Encrypt the private key with user's PIN
    const encryptedPrivateKey = encryptWithPIN(walletData.privateKey, pin);

    // Add Tron wallet to profile
    profile.wallets = profile.wallets || {};
    profile.wallets.tron = {
      address: walletData.address,
      encryptedPrivateKey: encryptedPrivateKey,
    };

    await profile.save();

    console.log("[add-tron] Tron wallet saved to database");

    return NextResponse.json({
      success: true,
      message: "Tron wallet added successfully",
      wallet: {
        tron: { address: walletData.address },
      },
      address: walletData.address, // For backward compatibility
    });
  } catch (error: any) {
    console.error("[POST /api/wallet/add-tron] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}
