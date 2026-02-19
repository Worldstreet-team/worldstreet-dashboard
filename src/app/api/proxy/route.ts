import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate that it's an allowed exchange URL to prevent open proxying
    const allowedHosts = ["api.binance.com", "api.kucoin.com", "api.gateio.ws"];
    try {
        const parsedUrl = new URL(targetUrl);
        if (!allowedHosts.includes(parsedUrl.host)) {
            return NextResponse.json({ error: "Hostname not allowed" }, { status: 403 });
        }

        const response = await fetch(targetUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Remote server returned ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[Proxy Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
