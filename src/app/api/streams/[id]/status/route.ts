import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Mux SDK
export const runtime = 'nodejs';

// GET /api/streams/[id]/status - Check Mux for actual stream status and sync
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get stream from database
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

    // If stream is already ended, just return it
    if (stream.status === 'ended') {
      return NextResponse.json({ stream, muxStatus: 'ended' });
    }

    // Check Mux for actual status
    if (stream.mux_stream_id && process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) {
      try {
        const Mux = (await import('@mux/mux-node')).default;
        const mux = new Mux({
          tokenId: process.env.MUX_TOKEN_ID,
          tokenSecret: process.env.MUX_TOKEN_SECRET,
        });

        const muxStream = await mux.video.liveStreams.retrieve(stream.mux_stream_id);
        const muxStatus = muxStream.status; // 'idle' | 'active' | 'disabled'

        // Sync status if different
        if (muxStatus === 'active' && stream.status !== 'active') {
          const { data: updatedStream } = await supabase
            .from('streams')
            .update({
              status: 'active',
              started_at: stream.started_at || new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

          return NextResponse.json({ 
            stream: updatedStream || stream, 
            muxStatus,
            synced: true 
          });
        } else if (muxStatus === 'idle' && stream.status === 'active') {
          // Stream went offline
          const { data: updatedStream } = await supabase
            .from('streams')
            .update({ status: 'idle' })
            .eq('id', id)
            .select()
            .single();

          return NextResponse.json({ 
            stream: updatedStream || stream, 
            muxStatus,
            synced: true 
          });
        }

        return NextResponse.json({ stream, muxStatus, synced: false });
      } catch (muxError) {
        console.error('Error checking Mux status:', muxError);
        // Return stream data even if Mux check fails
        return NextResponse.json({ stream, muxStatus: 'unknown' });
      }
    }

    return NextResponse.json({ stream, muxStatus: 'unknown' });

  } catch (error) {
    console.error('Error checking stream status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
