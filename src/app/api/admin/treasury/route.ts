import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import TreasuryWallet from "@/models/TreasuryWallet";
import { connectDB } from "@/lib/mongodb";
import {
  generateSolanaTreasuryWallet,
  generateEthTreasuryWallet,
  getSolBalance,
  getUsdtBalance,
  getEthBalance,
  getEthUsdtBalance,
} from "@/lib/treasury";

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").filter(Boolean);


export async function GET() {
  try {
    const user = await currentUser();
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all treasuries, sorted by createdAt descending
    const treasuries = await TreasuryWallet.find({}).sort({ createdAt: -1 }).exec();

    // Calculate balances for each
    const balances: Array<{
      network: string;
      balance: number;
      usdtBalance: number;
      isActive: boolean;
    }> = [];

    for (const treasury of treasuries) {
      try {
        let balance = 0;
        let usdtBalance = 0;

        if (treasury.network === "solana") {
          balance = await getSolBalance(treasury.publicKey);
          usdtBalance = await getUsdtBalance(treasury.publicKey);
        } else if (treasury.network === "ethereum") {
          balance = await getEthBalance(treasury.publicKey);
          usdtBalance = await getEthUsdtBalance(treasury.publicKey);
        }

        // Update balance in DB
        await TreasuryWallet.findByIdAndUpdate(treasury._id, { balance, usdtBalance });

        balances.push({
          network: treasury.network,
          balance,
          usdtBalance,
          isActive: treasury.isActive,
        });
      } catch (err) {
        console.error(`Failed to fetch balance for ${treasury.network}:`, err);
        balances.push({
          network: treasury.network,
          balance: 0,
          usdtBalance: 0,
          isActive: treasury.isActive,
        });
      }
    }

    return NextResponse.json({
      treasuries,
      balances,
    });
  } catch (err) {
    console.error("Treasury GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user || !ADMIN_EMAILS.includes(user.emailAddresses[0]?.emailAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { network } = await req.json();
    if (!["solana", "ethereum"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be 'solana' or 'ethereum'" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if wallet already exists for this network
    const existing = await TreasuryWallet.findOne({ network, isActive: true });
    if (existing) {
      return NextResponse.json(
        { error: `Active ${network} treasury wallet already exists` },
        { status: 400 }
      );
    }

    let wallet;
    if (network === "solana") {
      wallet = await generateSolanaTreasuryWallet();
    } else {
      wallet = await generateEthTreasuryWallet();
    }

    const treasuryDoc = new TreasuryWallet({
      network,
      publicKey: wallet.address,
      balance: 0,
      usdtBalance: 0,
      isActive: true,
    });

    await treasuryDoc.save();

    return NextResponse.json(
      { success: true, wallet: treasuryDoc },
      { status: 201 }
    );
  } catch (err) {
    console.error("Treasury POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
