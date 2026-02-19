import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SpotTransaction from "@/models/SpotTransaction";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { tradeId, exitPrice } = await req.json();

        if (!tradeId) {
            return NextResponse.json({ success: false, message: "Missing trade ID" }, { status: 400 });
        }

        await connectDB();

        const trade = await SpotTransaction.findOne({
            _id: tradeId,
            userId: authUser.userId,
            status: "OPEN",
        });

        if (!trade) {
            return NextResponse.json({ success: false, message: "Trade not found or already closed" }, { status: 404 });
        }

        // Fetch current price if not provided (though in a real app we'd fetch it from an exchange)
        const finalExitPrice = exitPrice || trade.price; // Fallback to entry price if not provided, though ideally we pass current price

        const pnl = trade.side === "buy"
            ? (finalExitPrice - trade.price) * trade.amount
            : (trade.price - finalExitPrice) * trade.amount;

        trade.status = "CLOSED";
        trade.exitPrice = finalExitPrice;
        trade.pnl = Math.round(pnl * 100) / 100;
        await trade.save();

        return NextResponse.json({ success: true, data: trade });
    } catch (error) {
        console.error("[POST /api/trades/close] Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
