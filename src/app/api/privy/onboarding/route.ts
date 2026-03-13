import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";
import { createPrivyUser } from "@/lib/privy/users";
import { createUserWallets } from "@/lib/privy/wallets";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";

/**
 * POST /api/privy/onboarding
 * Create Privy user and wallets for authenticated Clerk user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Clerk JWT
    const { userId, token } = await verifyClerkJWT(request);

    // Connect to database
    await connectDB();

    // Check if user already has wallets
    let userWallet = await UserWallet.findOne({ clerkUserId: userId });
    if (userWallet) {
      return NextResponse.json({
        success: true,
        wallets: {
          ethereum: userWallet.wallets.ethereum.address,
          solana: userWallet.wallets.solana.address
        },
        message: "Wallets already exist"
      });
    }

    // Create Privy user
    const privyUserId = await createPrivyUser(userId);

    // Create wallets
    const wallets = await createUserWallets(privyUserId);

    // Save to database
    userWallet = await UserWallet.create({
      clerkUserId: userId,
      privyUserId,
      wallets: {
        ethereum: {
          walletId: wallets.ethereum.id,
          address: wallets.ethereum.address
        },
        solana: {
          walletId: wallets.solana.id,
          address: wallets.solana.address
        }
      }
    });

    return NextResponse.json({
      success: true,
      wallets: {
        ethereum: wallets.ethereum.address,
        solana: wallets.solana.address
      }
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create wallets" },
      { status: 500 }
    );
  }
}
