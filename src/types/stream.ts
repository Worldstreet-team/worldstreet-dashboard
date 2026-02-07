// Stream types for Xtreme Livestreaming
export interface Stream {
  id: string;
  user_id: string;
  title: string;
  category: string;
  mux_stream_id: string | null;
  mux_playback_id: string | null;
  stream_key: string | null;
  status: 'idle' | 'active' | 'ended';
  viewer_count: number;
  peak_viewer_count: number;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  is_deleted: boolean;
  // Joined profile data
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface StreamViewer {
  id: string;
  stream_id: string;
  user_id: string | null;
  session_id: string | null;
  joined_at: string;
  left_at: string | null;
}

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  message: string;
  user_name: string;
  user_avatar: string | null;
  is_deleted: boolean;
  created_at: string;
}

// API Response types
export interface CreateStreamResponse {
  stream: Stream;
  rtmpUrl: string;
  rtmpIngestUrl: string;
  streamKey: string;
}

export interface StreamsListResponse {
  streams: Stream[];
  total: number;
}

// Request types
export interface CreateStreamRequest {
  title: string;
  category: string;
}

export interface SendChatMessageRequest {
  streamId: string;
  message: string;
}
