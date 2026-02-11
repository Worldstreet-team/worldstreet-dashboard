import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { verifyToken } from "@/lib/auth-service";
import { verifyPIN } from "@/lib/wallet/encryption";

/**
 * Helper: extract and verify the authenticated user from the request cookies.
 */
async function getAuthUser(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  if (!accessToken) return null;

  const result = await verifyToken(accessToken);
  if (result.success && result.data?.user) {
    return result.data.user;
  }
  return null;
}

/**
 * POST /api/wallet/keys
 * 
 * Retrieve encrypted private keys for signing transactions.
 * Requires PIN verification via the stored hash.
 * 
 * The actual decryption happens CLIENT-SIDE with the user's PIN.
 * This endpoint validates the PIN matches and returns the encrypted blobs.
 * 
 * Body: { pin: string }
 * 
 * Returns: { wallets: { solana, ethereum, bitcoin } } with encryptedPrivateKey
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
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
      return NextResponse.json(
        { success: false, message: "Wallets not set up yet" },
        { status: 400 }
      );
    }

    // Verify the PIN against stored hash using proper verification
    if (!profile.walletPinHash || !verifyPIN(pin, profile.walletPinHash)) {
      return NextResponse.json(
        { success: false, message: "Incorrect PIN" },
        { status: 401 }
      );
    }

    // Return encrypted keys (decryption happens client-side)
    return NextResponse.json({
      success: true,
      wallets: {
        solana: {
          address: profile.wallets?.solana?.address || "",
          encryptedPrivateKey: profile.wallets?.solana?.encryptedPrivateKey || "",
        },
        ethereum: {
          address: profile.wallets?.ethereum?.address || "",
          encryptedPrivateKey: profile.wallets?.ethereum?.encryptedPrivateKey || "",
        },
        bitcoin: {
          address: profile.wallets?.bitcoin?.address || "",
          encryptedPrivateKey: profile.wallets?.bitcoin?.encryptedPrivateKey || "",
        },
      },
    });
  } catch (error) {
    console.error("[POST /api/wallet/keys] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
