import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreasuryWallet from "@/models/TreasuryWallet";
import { getAuthUser } from "@/lib/auth";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  encryptPrivateKey,
  getSolBalance,
  getUsdtBalance,
} from "@/lib/treasury";

// ── Admin emails ───────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase());

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  return user;
}

// ── GET /api/admin/treasury — Get active treasury info + balances ───────────

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    await connectDB();

    const wallet = await TreasuryWallet.findOne({
      isActive: true,
      network: "solana",
    }).lean();

    if (!wallet) {
      return NextResponse.json({
        success: true,
        wallet: null,
        message: "No treasury wallet configured",
      });
    }

    // Fetch live balances
    const [solBalance, usdtBalance] = await Promise.all([
      getSolBalance(wallet.address).catch(() => 0),
      getUsdtBalance(wallet.address).catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        network: wallet.network,
        isActive: wallet.isActive,
        createdBy: wallet.createdBy,
        createdAt: wallet.createdAt,
        solBalance,
        usdtBalance,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/treasury error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/admin/treasury — Generate a new treasury wallet ──────────────

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Check encryption key is configured
    const encKey = process.env.TREASURY_ENCRYPTION_KEY;
    if (!encKey || encKey.length !== 64) {
      return NextResponse.json(
        {
          success: false,
          message:
            "TREASURY_ENCRYPTION_KEY is not configured. Add a 64-char hex string to your environment variables.",
        },
        { status: 500 }
      );
    }

    await connectDB();

    // Generate new Solana keypair
    const keypair = Keypair.generate();
    const publicAddress = keypair.publicKey.toBase58();
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    // Encrypt the private key
    const encrypted = encryptPrivateKey(privateKeyBase58);

    // Deactivate any existing treasury wallets
    await TreasuryWallet.updateMany(
      { isActive: true, network: "solana" },
      { $set: { isActive: false } }
    );

    // Save new wallet
    await TreasuryWallet.create({
      address: publicAddress,
      encryptedPrivateKey: encrypted.encryptedPrivateKey,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      network: "solana",
      isActive: true,
      createdBy: admin.email,
    });

    // Return the private key ONCE so admin can back it up
    return NextResponse.json({
      success: true,
      wallet: {
        address: publicAddress,
        privateKey: privateKeyBase58,
        network: "solana",
      },
      message:
        "Treasury wallet generated. SAVE THE PRIVATE KEY NOW — it will not be shown again.",
    });
  } catch (error) {
    console.error("POST /api/admin/treasury error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
