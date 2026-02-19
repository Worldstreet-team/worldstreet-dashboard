import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const targetUrl = "https://api.kucoin.com/api/v1/market/allTickers";
        const res = await fetch(targetUrl, {
            signal: AbortSignal.timeout(5000),
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) throw new Error("KuCoin ticker fetch failed");

        const json = await res.json();
        return NextResponse.json(json);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 502 });
    }
}
