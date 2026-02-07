import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for better compatibility
export const runtime = 'nodejs';

// GET /api/streams/[id]/chat - Get chat messages for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination (get messages before this timestamp)

    let query = supabase
      .from('stream_chat_messages')
      .select('*')
      .eq('stream_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching chat messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Reverse to show oldest first (for display)
    return NextResponse.json({
      messages: (messages || []).reverse(),
    });

  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/streams/[id]/chat - Send a chat message
export async function POST(
  _request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Chat sending is disabled because authentication has been removed.' },
    { status: 403 }
  );
}

// DELETE /api/streams/[id]/chat?messageId=xxx - Delete a chat message (for stream owner)
export async function DELETE(
  _request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Chat moderation is disabled because authentication has been removed.' },
    { status: 403 }
  );
}
