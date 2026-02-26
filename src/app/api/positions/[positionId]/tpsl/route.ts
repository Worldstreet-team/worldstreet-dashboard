import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BASE_API_URL = 'https://trading.watchup.site';

// GET - Fetch TP/SL order for a position
export async function GET(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { positionId } = params;

    const response = await fetch(
      `${BASE_API_URL}/api/positions/${positionId}/tpsl?userId=${userId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: true, data: null },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: data.message || 'Failed to fetch TP/SL order' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('TP/SL fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TP/SL order' },
      { status: 500 }
    );
  }
}

// POST - Set or update TP/SL order
export async function POST(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { positionId } = params;
    const body = await request.json();
    const { takeProfitPrice, stopLossPrice } = body;

    // Validate that at least one price is provided
    if (!takeProfitPrice && !stopLossPrice) {
      return NextResponse.json(
        { error: 'At least one of takeProfitPrice or stopLossPrice must be provided' },
        { status: 400 }
      );
    }

    console.log('Setting TP/SL:', { positionId, userId, takeProfitPrice, stopLossPrice });

    const response = await fetch(
      `${BASE_API_URL}/api/positions/${positionId}/tpsl`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          takeProfitPrice: takeProfitPrice || undefined,
          stopLossPrice: stopLossPrice || undefined,
        }),
      }
    );

    const data = await response.json();

    console.log('Backend response:', {
      status: response.status,
      data,
    });

    if (!response.ok) {
      let errorMessage = data.message || data.error || 'Failed to set TP/SL';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('greater than entry price')) {
        errorMessage = 'Take profit price must be greater than entry price';
      } else if (errorMessage.includes('less than entry price')) {
        errorMessage = 'Stop loss price must be less than entry price';
      } else if (errorMessage.includes('already closed')) {
        errorMessage = 'Cannot set TP/SL for a closed position';
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || `TP/SL ${data.data?.action || 'set'} successfully`,
      data: data.data,
    });
  } catch (error) {
    console.error('TP/SL set error:', error);
    return NextResponse.json(
      { error: 'Failed to set TP/SL. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel TP/SL order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { positionId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { positionId } = params;

    console.log('Cancelling TP/SL:', { positionId, userId });

    const response = await fetch(
      `${BASE_API_URL}/api/positions/${positionId}/tpsl`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to cancel TP/SL' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'TP/SL cancelled successfully',
    });
  } catch (error) {
    console.error('TP/SL cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel TP/SL. Please try again.' },
      { status: 500 }
    );
  }
}
