import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SpotTransaction from "@/models/SpotTransaction";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { symbol, side, type, price, amount, total, fee, status, txHash, stopLoss, takeProfit } = body;

        if (!symbol || !side || !type || !price || !amount || !total) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400 }
            );
        }

        await connectDB();

        const transaction = await SpotTransaction.create({
            userId: authUser.userId,
            symbol,
            side,
            type,
            price: Number(price),
            amount: Number(amount),
            total: Number(total),
            stopLoss: stopLoss ? Number(stopLoss) : undefined,
            takeProfit: takeProfit ? Number(takeProfit) : undefined,
            fee: Number(fee || 0),
            status: status || "PENDING",
            txHash,
        });

        return NextResponse.json({ success: true, data: transaction });
    } catch (error) {
        console.error("[POST /api/trades/transaction] Error:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
