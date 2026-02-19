import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from "@/lib/mongodb";
import SpotTransaction from "@/models/SpotTransaction";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser();
        if (!authUser) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        await connectDB();

        // Build Query
        const query: any = { userId: authUser.userId };
        if (symbol) query.symbol = symbol;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [trades, total] = await Promise.all([
            SpotTransaction.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SpotTransaction.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data: trades.map((t: any) => ({
                id: t._id,
                symbol: t.symbol,
                side: t.side,
                price: t.price,
                amount: t.amount,
                total: t.total,
                stopLoss: t.stopLoss,
                takeProfit: t.takeProfit,
                fee: t.fee,
                status: t.status,
                pnl: t.pnl || 0,
                timestamp: t.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                pages: totalPages
            }
        });
    } catch (error) {
        console.error('Trade History API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
