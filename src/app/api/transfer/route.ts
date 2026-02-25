import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, asset, amount, direction, destinationAddress } = body;

        // Validate required fields
        if (!userId || !asset || !amount || !direction || !destinationAddress) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, asset, amount, direction, destinationAddress' },
                { status: 400 }
            );
        }

        // Validate direction - spot-to-main and spot-to-futures are handled by backend signers
        if (direction !== 'spot-to-main' && direction !== 'spot-to-futures') {
            return NextResponse.json(
                { error: 'Invalid direction. Only "spot-to-main" and "spot-to-futures" are supported for backend signing.' },
                { status: 400 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be a positive number' },
                { status: 400 }
            );
        }

        console.log('Transfer request:', { userId, asset, amount, direction, destinationAddress });

        // Call backend API
        const backendUrl = process.env.BACKEND_URL || 'https://trading.watchup.site';
        const response = await fetch(`${backendUrl}/api/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                asset,
                amount,
                direction,
                destinationAddress
            }),
        });

        const data = await response.json();

        console.log('Backend response:', {
            status: response.status,
            data,
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Transfer failed' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            message: 'Transfer completed successfully',
            ...data,
        });
    } catch (error) {
        console.error('Transfer error:', error);
        return NextResponse.json(
            { error: 'Internal error', message: (error as Error).message },
            { status: 500 }
        );
    }
}
