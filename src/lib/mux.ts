import Mux from '@mux/mux-node';

// Initialize Mux client with server-side credentials
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export default mux;

// Helper to generate playback URL
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Helper to generate thumbnail URL
export function getThumbnailUrl(playbackId: string, options?: { time?: number; width?: number; height?: number }): string {
  const params = new URLSearchParams();
  if (options?.time) params.append('time', options.time.toString());
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  
  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
}

// Stream status types
export type StreamStatus = 'idle' | 'active' | 'ended';

// Stream categories
export const STREAM_CATEGORIES = [
  { id: 'trading', name: 'Trading', icon: 'solar:chart-bold-duotone' },
  { id: 'analysis', name: 'Analysis', icon: 'solar:graph-bold-duotone' },
  { id: 'p2p', name: 'P2P', icon: 'solar:users-group-rounded-bold-duotone' },
  { id: 'defi', name: 'DeFi', icon: 'solar:safe-circle-bold-duotone' },
  { id: 'education', name: 'Education', icon: 'solar:book-bold-duotone' },
] as const;

export type StreamCategory = typeof STREAM_CATEGORIES[number]['id'];
