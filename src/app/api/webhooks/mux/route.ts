import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Force Node.js runtime for crypto
export const runtime = 'nodejs';

// Mux webhook event types we care about
type MuxWebhookEvent = {
  type: string;
  data: {
    id: string;
    status?: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    stream_key?: string;
    [key: string]: unknown;
  };
};

// Verify Mux webhook signature
function verifyMuxSignature(rawBody: string, signature: string | null): boolean {
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  
  // Skip verification if no secret is configured (development mode)
  if (!webhookSecret || webhookSecret === 'your_webhook_signing_secret_here') {
    console.warn('MUX_WEBHOOK_SECRET not configured - skipping signature verification');
    return true;
  }
  
  if (!signature) {
    console.error('No mux-signature header present');
    return false;
  }
  
  // Mux signature format: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));
  
  if (!timestampPart || !signaturePart) {
    console.error('Invalid signature format');
    return false;
  }
  
  const timestamp = timestampPart.split('=')[1];
  const expectedSignature = signaturePart.split('=')[1];
  
  // Create the signed payload
  const signedPayload = `${timestamp}.${rawBody}`;
  
  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(signedPayload);
  const calculatedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  );
}

// Create admin Supabase client for webhooks (bypasses RLS)
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// POST /api/webhooks/mux - Handle Mux webhook events
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('mux-signature');
    
    // Verify webhook signature
    if (!verifyMuxSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event: MuxWebhookEvent = JSON.parse(rawBody);
    
    console.log('Received Mux webhook:', event.type);

    const supabase = createAdminClient();

    switch (event.type) {
      // Stream has started (streamer connected via RTMP)
      case 'video.live_stream.active': {
        const muxStreamId = event.data.id;
        
        const { error } = await supabase
          .from('streams')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('mux_stream_id', muxStreamId);

        if (error) {
          console.error('Error updating stream to active:', error);
        } else {
          console.log(`Stream ${muxStreamId} is now active`);
        }
        break;
      }

      // Stream has become idle (streamer disconnected)
      case 'video.live_stream.idle': {
        const muxStreamId = event.data.id;
        
        // Don't end the stream, just mark as idle (allows reconnection)
        const { error } = await supabase
          .from('streams')
          .update({
            status: 'idle',
          })
          .eq('mux_stream_id', muxStreamId)
          .eq('status', 'active'); // Only if currently active

        if (error) {
          console.error('Error updating stream to idle:', error);
        } else {
          console.log(`Stream ${muxStreamId} is now idle`);
        }
        break;
      }

      // Stream has been deleted/disabled
      case 'video.live_stream.deleted':
      case 'video.live_stream.disabled': {
        const muxStreamId = event.data.id;
        
        const { error } = await supabase
          .from('streams')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('mux_stream_id', muxStreamId);

        if (error) {
          console.error('Error ending stream:', error);
        } else {
          console.log(`Stream ${muxStreamId} has ended`);
        }
        break;
      }

      // Stream connected (initial connection)
      case 'video.live_stream.connected': {
        console.log(`Stream ${event.data.id} connected`);
        break;
      }

      // Stream disconnected
      case 'video.live_stream.disconnected': {
        console.log(`Stream ${event.data.id} disconnected`);
        break;
      }

      default:
        console.log(`Unhandled Mux event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing Mux webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Mux sends webhooks as POST requests, but we also support GET for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Mux webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
