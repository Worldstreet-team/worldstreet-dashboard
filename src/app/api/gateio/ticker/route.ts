import { NextRequest, NextResponse } from "next/server";

const GATEIO_API_BASE = 'https://api.gateio.ws';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol'); // e.g. BTC_USDT

        let targetUrl = `${GATEIO_API_BASE}/api/v4/spot/tickers`;
        if (symbol) {
            targetUrl += `?currency_pair=${symbol}`;
        }

        const res = await fetch(targetUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) throw new Error("Gate.io ticker fetch failed");

        const data = await res.json();
        
        // If symbol was provided, data is a single item inside an array (usually) or a single object
        // Gate.io returns [{...}, {...}] for all, or [{...}] if currency_pair is set.
        
        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        console.error('[Gate.io Ticker API] Error:', error);
        return NextResponse.json({ 
            success: false,
            error: error.message 
        }, { status: 502 });
    }
}
