import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "BTCUSDC";
    const limit = searchParams.get("limit") || "50";

    // Format symbols for different exchanges
    const binanceSymbol = symbol.replace("/", "").toUpperCase();
    const kucoinSymbol = symbol.includes("/") ? symbol.replace("/", "-") : `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    const gateSymbol = symbol.includes("/") ? symbol.replace("/", "_") : `${symbol.slice(0, 3)}_${symbol.slice(3)}`;

    const urls = [
        `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`,
        `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${kucoinSymbol}`,
        `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${gateSymbol}`
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                const data = await res.json();

                // Normalizing response format
                if (url.includes("binance")) {
                    return NextResponse.json({
                        success: true,
                        source: "binance",
                        bids: data.bids,
                        asks: data.asks
                    });
                } else if (url.includes("kucoin")) {
                    return NextResponse.json({
                        success: true,
                        source: "kucoin",
                        bids: data.data.bids,
                        asks: data.data.asks
                    });
                } else if (url.includes("gateio")) {
                    return NextResponse.json({
                        success: true,
                        source: "gate",
                        bids: data.bids,
                        asks: data.asks
                    });
                }
            }
        } catch (e) {
            console.warn(`Orderbook fetch failed for ${url}`);
        }
    }

    return NextResponse.json({ success: false, error: "Failed to fetch orderbook from all providers" }, { status: 502 });
}
