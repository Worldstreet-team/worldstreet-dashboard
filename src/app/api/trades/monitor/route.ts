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

        const { symbol, currentPrice } = await req.json();

        if (!symbol || !currentPrice) {
            return NextResponse.json({ success: false, message: "Missing current price data" }, { status: 400 });
        }

        await connectDB();

        // Find all OPEN trades for this user and symbol
        const openTrades = await SpotTransaction.find({
            userId: authUser.userId,
            symbol: symbol,
            status: "OPEN",
        });

        const results = [];

        for (const trade of openTrades) {
            let trigger = false;
            let reason = "";

            // Logic for BUY trades (Long)
            if (trade.side === "buy") {
                if (trade.takeProfit && currentPrice >= trade.takeProfit) {
                    trigger = true;
                    reason = "Take Profit";
                } else if (trade.stopLoss && currentPrice <= trade.stopLoss) {
                    trigger = true;
                    reason = "Stop Loss";
                }
            }
            // Logic for SELL trades (Short)
            else if (trade.side === "sell") {
                if (trade.takeProfit && currentPrice <= trade.takeProfit) {
                    trigger = true;
                    reason = "Take Profit";
                } else if (trade.stopLoss && currentPrice >= trade.stopLoss) {
                    trigger = true;
                    reason = "Stop Loss";
                }
            }

            if (trigger) {
                // Calculate PnL (simple version)
                const pnl = trade.side === "buy"
                    ? (currentPrice - trade.price) * trade.amount
                    : (trade.price - currentPrice) * trade.amount;

                trade.status = "CLOSED";
                trade.exitPrice = currentPrice;
                trade.pnl = Math.round(pnl * 100) / 100; // 2 decimal places
                await trade.save();

                results.push({ id: trade._id, reason, pnl });
            }
        }

        return NextResponse.json({ success: true, closedCount: results.length, details: results });
    } catch (error) {
        console.error("[POST /api/trades/monitor] Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
