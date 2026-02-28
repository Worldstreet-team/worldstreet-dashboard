import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { verifyPIN } from "@/lib/wallet/encryption";

/**
 * POST /api/wallet/add-tron
 * 
 * Add Tron wallet to existing user account.
 * This endpoint allows users who already have SOL/ETH/BTC wallets
 * to generate and add a Tron wallet separately.
 * 
 * Body: {
 *   pin: string (for verification),
 *   tronWallet: {
 *     address: string,
 *     encryptedPrivateKey: string
 *   }
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
    const { pin, tronWallet } = body;

    // Validate required fields
    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
      );
    }

    if (!tronWallet || !tronWallet.address || !tronWallet.encryptedPrivateKey) {
      return NextResponse.json(
        { success: false, message: "Invalid Tron wallet data" },
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
          success: false,
          message: "Tron wallet already exists",
        },
        { status: 409 }
      );
    }

    // Add Tron wallet
    profile.wallets = profile.wallets || {};
    profile.wallets.tron = {
      address: tronWallet.address,
      encryptedPrivateKey: tronWallet.encryptedPrivateKey,
    };

    await profile.save();

    return NextResponse.json({
      success: true,
      message: "Tron wallet added successfully",
      wallet: {
        tron: { address: tronWallet.address },
      },
    });
  } catch (error) {
    console.error("[POST /api/wallet/add-tron] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
