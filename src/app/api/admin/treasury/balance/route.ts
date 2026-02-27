import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getTreasuryBalance } from "@/lib/treasury";

// ── Admin auth ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.P2P_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

async function getAdminUser() {
  const user = await getAuthUser();
  if (!user) return null;
  const email = (user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;
  return user;
}

// ── GET: Fetch treasury wallet balance ─────────────────────────────────────

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const treasuryAddress = process.env.TREASURY_WALLET_ADDRESS;
    if (!treasuryAddress) {
      return NextResponse.json({
        success: false,
        message: "Treasury wallet not configured. Generate a wallet first.",
      }, { status: 404 });
    }

    const balance = await getTreasuryBalance();

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error("Treasury balance error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
