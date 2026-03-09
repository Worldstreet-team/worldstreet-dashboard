/**
 * Spot Positions API Route
 * Handles fetching and managing spot positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SpotPosition from '@/models/SpotPosition';
import PositionHistory from '@/models/PositionHistory';

// GET - Fetch positions
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair');
    const status = searchParams.get('status') || 'OPEN';

    const query: any = { userId: authUser.userId };
    if (pair) {
      query.pair = pair;
    }
    if (status) {
      query.status = status.toUpperCase();
    }

    const positions = await SpotPosition.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('[Spot Positions API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}

// PATCH - Update position (TP/SL)
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { positionId, takeProfitPrice, stopLossPrice } = body;

    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID required' },
        { status: 400 }
      );
    }

    const position = await SpotPosition.findOne({
      _id: positionId,
      userId: authUser.userId,
    });

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    if (takeProfitPrice !== undefined) {
      position.takeProfitPrice = takeProfitPrice;
    }
    if (stopLossPrice !== undefined) {
      position.stopLossPrice = stopLossPrice;
    }

    position.updatedAt = new Date();
    await position.save();

    return NextResponse.json({ success: true, position });
  } catch (error) {
    console.error('[Spot Positions API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update position' },
      { status: 500 }
    );
  }
}
