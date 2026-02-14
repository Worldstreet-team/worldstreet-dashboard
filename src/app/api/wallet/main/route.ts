import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";
import { getAuthUser } from "@/lib/auth";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// ── Constants ──────────────────────────────────────────────────────────────

const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

// ── Types ──────────────────────────────────────────────────────────────────

export interface MainWalletResponse {
  success: boolean;
  wallet?: {
    symbol: "USDT";
    network: "solana";
    address: string;
    balance: number;
    balanceRaw: string;
  };
  message?: string;
}

// ── Helper: Get authenticated user ─────────────────────────────────────────

// Uses shared Clerk auth helper from @/lib/auth

// ── Helper: Fetch USDT balance from Solana ─────────────────────────────────

async function getUSDTBalance(solanaAddress: string): Promise<{ balance: number; balanceRaw: string }> {
  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const owner = new PublicKey(solanaAddress);
    const mintPubkey = new PublicKey(USDT_MINT);

    // Get all token accounts for this owner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Find USDT account
    for (const { account } of tokenAccounts.value) {
      const parsed = account.data.parsed;
      if (parsed?.info?.mint === USDT_MINT) {
        const rawAmount = parsed.info.tokenAmount.amount;
        const uiAmount = parsed.info.tokenAmount.uiAmount ?? 0;
        return {
          balance: uiAmount,
          balanceRaw: rawAmount,
        };
      }
    }

    // No USDT account found - balance is 0
    return { balance: 0, balanceRaw: "0" };
  } catch (error) {
    console.error("Error fetching USDT balance:", error);
    return { balance: 0, balanceRaw: "0" };
  }
}

// ── GET /api/wallet/main ───────────────────────────────────────────────────

/**
 * Returns the user's main wallet information (USDT on Solana).
 * 
 * This endpoint is designed to be consumed by other microservices
 * to check the user's spendable balance.
 * 
 * Response: {
 *   success: boolean,
 *   wallet: {
 *     symbol: "USDT",
 *     network: "solana",
 *     address: string,
 *     balance: number,      // Human-readable (e.g., 100.50)
 *     balanceRaw: string,   // Raw amount in smallest unit
 *   }
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse<MainWalletResponse>> {
  try {
    // Verify authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user profile with wallet addresses
    const profile = await DashboardProfile.findOne({ authUserId: authUser.userId });
    
    if (!profile || !profile.walletsGenerated || !profile.wallets?.solana?.address) {
      return NextResponse.json(
        { success: false, message: "Wallet not set up" },
        { status: 404 }
      );
    }

    const solanaAddress = profile.wallets.solana.address;

    // Fetch USDT balance from Solana network
    const { balance, balanceRaw } = await getUSDTBalance(solanaAddress);

    return NextResponse.json({
      success: true,
      wallet: {
        symbol: "USDT",
        network: "solana",
        address: solanaAddress,
        balance,
        balanceRaw,
      },
    });
  } catch (error) {
    console.error("Error in /api/wallet/main:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
