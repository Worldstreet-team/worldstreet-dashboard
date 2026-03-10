import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { convertRawToDisplay } from "@/lib/wallet/amounts";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const SOL_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC ||
  "https://solana-mainnet.g.alchemy.com/v2/m15B-STIDlwShr712rmVB";

// USDT on Solana (SPL Token)
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has Solana wallet
    if (!user.wallets?.solana?.address) {
      return NextResponse.json({
        success: true,
        balance: 0,
        address: null,
        message: "No Solana wallet found",
      });
    }

    const solanaAddress = user.wallets.solana.address;
    const connection = new Connection(SOL_RPC);
    const pubKey = new PublicKey(solanaAddress);

    let usdtBalance = 0;

    try {
      // Fetch token accounts for both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection
          .getParsedTokenAccountsByOwner(pubKey, {
            programId: TOKEN_PROGRAM_ID,
          })
          .catch(() => ({ value: [] })),
        connection
          .getParsedTokenAccountsByOwner(pubKey, {
            programId: TOKEN_2022_PROGRAM_ID,
          })
          .catch(() => ({ value: [] })),
      ]);

      const allAccounts = [
        ...tokenAccounts.value,
        ...token2022Accounts.value,
      ];

      // Find USDT token account
      for (const account of allAccounts) {
        const parsedData = account.account.data.parsed;
        if (!parsedData || parsedData.type !== "account") continue;

        const info = parsedData.info;
        const mint = info.mint;

        if (mint === USDT_MINT) {
          const rawBalance = info.tokenAmount.amount;
          usdtBalance = parseFloat(convertRawToDisplay(rawBalance, USDT_DECIMALS));
          break;
        }
      }
    } catch (error) {
      console.error("Error fetching USDT balance:", error);
      // Return 0 balance instead of error
    }

    return NextResponse.json({
      success: true,
      userId,
      balance: usdtBalance,
      address: solanaAddress,
      mint: USDT_MINT,
      decimals: USDT_DECIMALS,
    });
  } catch (error) {
    console.error("USDT balance API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch USDT balance",
      },
      { status: 500 }
    );
  }
}
