export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '1min';
    const startAt = searchParams.get('startAt') || '0';
    const endAt = searchParams.get('endAt') || '0';

    if (!['1min', '5min'].includes(type)) {
      return Response.json(
        { error: "Interval forbidden. Use '1min' or '5min' only." },
        { status: 400 }
      );
    }

    const url = `https://trading.watchup.site/api/market/${symbol}/klines?type=${type}&startAt=${startAt}&endAt=${endAt}`;
    console.log('Fetching klines from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch' }));
      console.error('Backend error:', error);
      return Response.json(error, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return Response.json(
      { error: 'Failed to fetch market data', message: (error as Error).message },
      { status: 500 }
    );
  }
}
