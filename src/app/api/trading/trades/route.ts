import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "BTCUSDC";
    const limit = searchParams.get("limit") || "50";

    const binanceSymbol = symbol.replace("/", "").toUpperCase();
    const kucoinSymbol = symbol.includes("/") ? symbol.replace("/", "-") : `${symbol.slice(0, 3)}-${symbol.slice(3)}`;

    try {
        // Try Binance first
        const bRes = await fetch(`https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=${limit}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (bRes.ok) {
            const data = await bRes.json();
            const mapped = data.map((t: any) => ({
                id: String(t.id),
                price: t.price,
                amount: t.qty,
                side: t.isBuyerMaker ? "sell" : "buy",
                time: t.time
            }));
            return NextResponse.json({ success: true, source: "binance", data: mapped });
        }

        // Try KuCoin fallback
        const kRes = await fetch(`https://api.kucoin.com/api/v1/market/histories?symbol=${kucoinSymbol}`, {
            signal: AbortSignal.timeout(5000)
        });

        if (kRes.ok) {
            const data = await kRes.json();
            const mapped = data.data.map((t: any) => ({
                id: t.sequence || String(t.time),
                price: t.price,
                amount: t.size,
                side: t.side,
                time: Math.floor(t.time / 1000000) // ns to ms
            }));
            return NextResponse.json({ success: true, source: "kucoin", data: mapped.slice(0, limit) });
        }

    } catch (e) {
        console.error("Market trades fetch failed", e);
    }

    return NextResponse.json({ success: false, error: "Failed to fetch market trades" }, { status: 502 });
}
