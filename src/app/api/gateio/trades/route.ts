import { NextRequest, NextResponse } from "next/server";

const GATEIO_API_BASE = 'https://api.gateio.ws';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const symbol = searchParams.get('symbol') || 'BTC_USDT';
        const limit = searchParams.get('limit') || '50';

        const targetUrl = `${GATEIO_API_BASE}/api/v4/spot/trades?currency_pair=${symbol}&limit=${limit}`;

        const res = await fetch(targetUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) throw new Error("Gate.io trades fetch failed");

        const data = await res.json();
        
        // Transform Gate.io trades to unified format if needed
        // Gate.io: [{"id":"123","create_time":"123456789","side":"buy","amount":"1.0","price":"1.0"}]
        
        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        console.error('[Gate.io Trades API] Error:', error);
        return NextResponse.json({ 
            success: false,
            error: error.message 
        }, { status: 502 });
    }
}
