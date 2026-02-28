import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/wallet/setup
 * 
 * Save wallet data after client-side generation.
 * The wallets are generated and encrypted in the browser (self-custodial),
 * so the server never sees raw private keys.
 * 
 * Body: {
 *   pin: string (raw),
 *   pinHash: string (PBKDF2 hash for verification),
 *   wallets: {
 *     solana: { address, encryptedPrivateKey },
 *     ethereum: { address, encryptedPrivateKey },
 *     bitcoin: { address, encryptedPrivateKey }
 *   }
 * }
 * 
 * ⚠️ WARNING: If user loses PIN, funds are LOST FOREVER.
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
    const { pinHash, wallets } = body;

    // Validate required fields
    if (!pinHash || typeof pinHash !== "string") {
      return NextResponse.json(
        { success: false, message: "PIN hash is required" },
        { status: 400 }
      );
    }

    if (!wallets || !wallets.solana || !wallets.ethereum || !wallets.bitcoin || !wallets.tron) {
      return NextResponse.json(
        { success: false, message: "All wallet data is required" },
        { status: 400 }
      );
    }

    // Validate each wallet has address and encrypted key
    for (const chain of ["solana", "ethereum", "bitcoin", "tron"] as const) {
      const wallet = wallets[chain];
      if (!wallet.address || !wallet.encryptedPrivateKey) {
        return NextResponse.json(
          { success: false, message: `Invalid ${chain} wallet data` },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // Check if wallets are already generated (prevent overwriting)
    const existingProfile = await DashboardProfile.findOne({
      authUserId: authUser.userId,
    });

    if (existingProfile?.walletsGenerated) {
      return NextResponse.json(
        {
          success: false,
          message: "Wallets already exist. Cannot regenerate wallets.",
        },
        { status: 409 }
      );
    }

    // Update profile with wallet data
    const profile = await DashboardProfile.findOneAndUpdate(
      { authUserId: authUser.userId },
      {
        $set: {
          wallets: {
            solana: {
              address: wallets.solana.address,
              encryptedPrivateKey: wallets.solana.encryptedPrivateKey,
            },
            ethereum: {
              address: wallets.ethereum.address,
              encryptedPrivateKey: wallets.ethereum.encryptedPrivateKey,
            },
            bitcoin: {
              address: wallets.bitcoin.address,
              encryptedPrivateKey: wallets.bitcoin.encryptedPrivateKey,
            },
            tron: {
              address: wallets.tron.address,
              encryptedPrivateKey: wallets.tron.encryptedPrivateKey,
            },
          },
          walletPinHash: pinHash,
          walletsGenerated: true,
        },
      },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    // Return success with addresses only (not encrypted keys)
    return NextResponse.json({
      success: true,
      message: "Wallets created successfully",
      wallets: {
        solana: { address: wallets.solana.address },
        ethereum: { address: wallets.ethereum.address },
        bitcoin: { address: wallets.bitcoin.address },
        tron: { address: wallets.tron.address },
      },
    });
  } catch (error) {
    console.error("[POST /api/wallet/setup] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/setup
 * 
 * Check if wallets are already set up.
 * Returns wallet addresses (not encrypted keys) if they exist.
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

    const profile = await DashboardProfile.findOne({
      authUserId: authUser.userId,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.walletsGenerated) {
      return NextResponse.json({
        success: true,
        walletsGenerated: false,
        wallets: null,
      });
    }

    // Return addresses only (never expose encrypted keys via GET)
    return NextResponse.json({
      success: true,
      walletsGenerated: true,
      wallets: {
        solana: { address: profile.wallets?.solana?.address || "" },
        ethereum: { address: profile.wallets?.ethereum?.address || "" },
        bitcoin: { address: profile.wallets?.bitcoin?.address || "" },
        tron: { address: profile.wallets?.tron?.address || "" },
      },
    });
  } catch (error) {
    console.error("[GET /api/wallet/setup] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
