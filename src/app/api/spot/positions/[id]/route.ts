/**
 * Individual Spot Position API Route
 * Handles fetching and closing specific positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import SpotPosition from '@/models/SpotPosition';
import PositionHistory from '@/models/PositionHistory';

// GET - Fetch single position with history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const position = await SpotPosition.findOne({
      _id: params.id,
      userId: session.user.email,
    }).lean();

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    // Fetch position history
    const history = await PositionHistory.find({
      positionId: params.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ position, history });
  } catch (error) {
    console.error('[Spot Position API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position' },
      { status: 500 }
    );
  }
}

// DELETE - Close position manually
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const position = await SpotPosition.findOne({
      _id: params.id,
      userId: session.user.email,
      status: 'OPEN',
    });

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found or already closed' },
        { status: 404 }
      );
    }

    // Mark as closed
    position.status = 'CLOSED';
    position.closedAt = new Date();
    position.totalAmount = '0';
    await position.save();

    return NextResponse.json({ success: true, position });
  } catch (error) {
    console.error('[Spot Position API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to close position' },
      { status: 500 }
    );
  }
}
