import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for better compatibility with Mux SDK
export const runtime = 'nodejs';

// POST /api/streams - Create a new stream
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Stream creation is disabled because authentication has been removed.' },
    { status: 403 }
  );
}

// GET /api/streams - Get all active streams
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('streams')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('viewer_count', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status === 'active') {
      query = query.eq('status', 'active');
    } else if (status === 'all') {
      query = query.in('status', ['active', 'idle']);
    }

    // Filter by category
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: streams, error, count } = await query;

    if (error) {
      console.error('Error fetching streams:', error);
      // If table doesn't exist yet, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          streams: [],
          total: 0,
          warning: 'Streams table not set up yet. Please run the database migration.',
        });
      }
      return NextResponse.json(
        { error: 'Failed to fetch streams' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      streams: streams || [],
      total: count || 0,
    });

  } catch (error) {
    console.error('Error fetching streams:', error);
    // Return empty array for any error to prevent UI from breaking
    return NextResponse.json({
      streams: [],
      total: 0,
    });
  }
}
