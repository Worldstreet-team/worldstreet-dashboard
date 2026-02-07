import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for better compatibility
export const runtime = 'nodejs';

// GET /api/streams/[id] - Get stream details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: stream, error } = await supabase
      .from('streams')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ stream });

  } catch (error) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/streams/[id] - Update stream (end stream, update title, etc.)
export async function PATCH(
  _request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Stream updates are disabled because authentication has been removed.' },
    { status: 403 }
  );
}

// DELETE /api/streams/[id] - Soft delete a stream
export async function DELETE(
  _request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Stream deletion is disabled because authentication has been removed.' },
    { status: 403 }
  );
}
