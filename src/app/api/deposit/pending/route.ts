import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import { getAuthUser } from "@/lib/auth";

// GET /api/deposit/pending — return user's most recent in-progress deposit

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const deposit = await Deposit.findOne({
      userId: authUser.userId,
      status: {
        $in: [
          "pending",
          "awaiting_verification",
          "payment_failed",
          "verifying",
          "payment_confirmed",
          "sending_usdt",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!deposit) {
      return NextResponse.json({ success: false, message: "No pending deposit" });
    }

    return NextResponse.json({ success: true, deposit });
  } catch (error) {
    console.error("GET /api/deposit/pending error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
