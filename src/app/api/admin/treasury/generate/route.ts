import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// ── Admin auth ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;
  return user;
}

// ── POST: Generate a new treasury keypair ──────────────────────────────────

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // Generate a new Solana keypair
    const keypair = Keypair.generate();
    const publicAddress = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);

    // NOTE: We intentionally do NOT store the private key.
    // The admin must copy it and set it in the .env file manually.

    return NextResponse.json({
      success: true,
      wallet: {
        address: publicAddress,
        privateKey: privateKey, // Shown ONCE — admin must save it
      },
      message: "Treasury wallet generated. Copy the private key and set it as TREASURY_PRIVATE_KEY in your .env file. This key will not be shown again.",
    });
  } catch (error) {
    console.error("Treasury generate error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
