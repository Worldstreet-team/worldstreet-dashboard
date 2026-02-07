-- =============================================
-- XTREME LIVESTREAMING DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. STREAMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.streams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stream metadata
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'trading',
    
    -- Mux integration
    mux_stream_id VARCHAR(255) UNIQUE,
    mux_playback_id VARCHAR(255),
    stream_key VARCHAR(255),
    
    -- Stream status: 'idle' (created but not live), 'active' (currently streaming), 'ended' (finished)
    status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'ended')),
    
    -- Viewer tracking
    viewer_count INTEGER NOT NULL DEFAULT 0,
    peak_viewer_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_streams_user_id ON public.streams(user_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON public.streams(status);
CREATE INDEX IF NOT EXISTS idx_streams_category ON public.streams(category);
CREATE INDEX IF NOT EXISTS idx_streams_mux_stream_id ON public.streams(mux_stream_id);

-- =============================================
-- 2. STREAM VIEWERS TABLE (for real-time tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.stream_viewers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- For anonymous viewers
    session_id VARCHAR(255),
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(stream_id, user_id),
    UNIQUE(stream_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream_id ON public.stream_viewers(stream_id);

-- =============================================
-- 3. CHAT MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.stream_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    message TEXT NOT NULL,
    
    -- User info snapshot (so we don't need joins for display)
    user_name VARCHAR(255) NOT NULL,
    user_avatar VARCHAR(500),
    
    -- Moderation
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id ON public.stream_chat_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.stream_chat_messages(created_at);

-- =============================================
-- 4. USER PROFILES EXTENSION (for streamer info)
-- =============================================
-- Add streaming-related columns to profiles if they exist, or create the table
DO $$
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_streamer') THEN
            ALTER TABLE public.profiles ADD COLUMN is_streamer BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_streams') THEN
            ALTER TABLE public.profiles ADD COLUMN total_streams INTEGER DEFAULT 0;
        END IF;
    ELSE
        -- Create profiles table if it doesn't exist
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name VARCHAR(255),
            avatar_url VARCHAR(500),
            is_streamer BOOLEAN DEFAULT FALSE,
            total_streams INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

-- STREAMS POLICIES
-- Anyone can view active/ended streams
CREATE POLICY "Anyone can view active streams" ON public.streams
    FOR SELECT USING (status IN ('active', 'ended') AND is_deleted = FALSE);

-- Users can view their own streams (any status)
CREATE POLICY "Users can view own streams" ON public.streams
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own streams
CREATE POLICY "Users can create own streams" ON public.streams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own streams
CREATE POLICY "Users can update own streams" ON public.streams
    FOR UPDATE USING (auth.uid() = user_id);

-- STREAM VIEWERS POLICIES
-- Anyone can view viewer counts
CREATE POLICY "Anyone can view stream viewers" ON public.stream_viewers
    FOR SELECT USING (TRUE);

-- Authenticated users can join as viewers
CREATE POLICY "Authenticated users can join streams" ON public.stream_viewers
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own viewer record
CREATE POLICY "Users can update own viewer record" ON public.stream_viewers
    FOR UPDATE USING (auth.uid() = user_id);

-- CHAT MESSAGES POLICIES
-- Anyone can view chat messages for a stream
CREATE POLICY "Anyone can view chat messages" ON public.stream_chat_messages
    FOR SELECT USING (is_deleted = FALSE);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages" ON public.stream_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stream owners can delete messages in their stream
CREATE POLICY "Stream owners can delete chat messages" ON public.stream_chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.streams 
            WHERE streams.id = stream_chat_messages.stream_id 
            AND streams.user_id = auth.uid()
        )
    );

-- =============================================
-- 6. REALTIME SUBSCRIPTIONS
-- =============================================
-- Enable realtime for streams table (status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;

-- Enable realtime for viewer tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_viewers;

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.streams 
        SET viewer_count = viewer_count + 1,
            peak_viewer_count = GREATEST(peak_viewer_count, viewer_count + 1)
        WHERE id = NEW.stream_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL) THEN
        UPDATE public.streams 
        SET viewer_count = GREATEST(0, viewer_count - 1)
        WHERE id = COALESCE(NEW.stream_id, OLD.stream_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for viewer count updates
DROP TRIGGER IF EXISTS trigger_update_viewer_count ON public.stream_viewers;
CREATE TRIGGER trigger_update_viewer_count
    AFTER INSERT OR UPDATE OR DELETE ON public.stream_viewers
    FOR EACH ROW EXECUTE FUNCTION update_stream_viewer_count();

-- =============================================
-- 8. SAMPLE DATA (OPTIONAL - for testing)
-- =============================================
-- Uncomment below if you want test data

-- INSERT INTO public.streams (user_id, title, category, status, viewer_count)
-- SELECT 
--     auth.uid(),
--     'Test Stream - BTC Analysis',
--     'trading',
--     'active',
--     100
-- WHERE auth.uid() IS NOT NULL;
