"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Stream, CreateStreamResponse } from "@/types/stream";
import StreamPlayer from "./StreamPlayer";
import StreamChat from "./StreamChat";

const categories = [
  { id: "all", name: "All", icon: "solar:widget-bold-duotone" },
  { id: "trading", name: "Trading", icon: "solar:chart-bold-duotone" },
  { id: "analysis", name: "Analysis", icon: "solar:graph-bold-duotone" },
  { id: "p2p", name: "P2P", icon: "solar:users-group-rounded-bold-duotone" },
  { id: "defi", name: "DeFi", icon: "solar:safe-circle-bold-duotone" },
  { id: "education", name: "Education", icon: "solar:book-bold-duotone" },
];

export default function XtremePage() {
  const [activeTab, setActiveTab] = useState<"watch" | "stream">("watch");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [streamTitle, setStreamTitle] = useState("");
  const [streamCategory, setStreamCategory] = useState("trading");
  const [userName] = useState("Guest");
  const [userId] = useState<string | null>(null);
  
  // Streaming state
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [isLoadingMyStream, setIsLoadingMyStream] = useState(false);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [streamCredentials, setStreamCredentials] = useState<{
    rtmpUrl: string;
    streamKey: string;
  } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  
  // Watch streams state
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  
  // Copy states
  const [copiedRtmp, setCopiedRtmp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const supabase = createClient();

  // Auth removed: keep guest identity for display purposes.

  // Fetch live streams
  const fetchLiveStreams = useCallback(async () => {
    setIsLoadingStreams(true);
    try {
      const params = new URLSearchParams({ status: 'active' });
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/streams?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setLiveStreams(data.streams || []);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setIsLoadingStreams(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (activeTab === 'watch') {
      fetchLiveStreams();
      
      // Also poll every 10 seconds to catch new streams
      const interval = setInterval(fetchLiveStreams, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchLiveStreams]);

  // Check for user's existing stream when switching to "Go Live" tab
  const fetchMyStream = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingMyStream(true);
    try {
      const { data: myStream, error } = await supabase
        .from('streams')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['idle', 'active'])
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && myStream) {
        setCurrentStream(myStream);
        // If stream exists, set credentials from the stored stream key
        if (myStream.stream_key) {
          setStreamCredentials({
            rtmpUrl: 'rtmps://global-live.mux.com:443/app',
            streamKey: myStream.stream_key,
          });
        }
      }
    } catch {
      // No existing stream found - that's fine
    } finally {
      setIsLoadingMyStream(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (activeTab === 'stream' && userId) {
      fetchMyStream();
    }
  }, [activeTab, userId, fetchMyStream]);

  // Poll Mux for stream status when stream is idle (waiting for OBS)
  useEffect(() => {
    if (!currentStream || currentStream.status !== 'idle') return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/streams/${currentStream.id}/status`);
        const data = await response.json();
        
        if (data.stream && data.stream.status !== currentStream.status) {
          setCurrentStream(data.stream);
        }
      } catch (error) {
        console.error('Error polling stream status:', error);
      }
    };

    // Poll every 5 seconds when waiting for OBS
    const interval = setInterval(pollStatus, 5000);
    
    // Also poll immediately
    pollStatus();

    return () => clearInterval(interval);
  }, [currentStream?.id, currentStream?.status]);

  // Subscribe to real-time stream updates
  useEffect(() => {
    const channel = supabase
      .channel('streams-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedStream = payload.new as Stream;
            
            // Update current stream if it's ours
            if (currentStream && currentStream.id === updatedStream.id) {
              setCurrentStream(updatedStream);
            }
            
            // Update live streams list
            setLiveStreams(prev => {
              if (updatedStream.status === 'active') {
                const exists = prev.some(s => s.id === updatedStream.id);
                if (exists) {
                  return prev.map(s => s.id === updatedStream.id ? updatedStream : s);
                }
                return [...prev, updatedStream];
              } else {
                return prev.filter(s => s.id !== updatedStream.id);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentStream]);

  // Create a new stream
  const handleStartStream = async () => {
    if (!streamTitle.trim()) return;
    
    setIsCreatingStream(true);
    setStreamError(null);
    
    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: streamTitle.trim(),
          category: streamCategory,
        }),
      });
      
      const data: CreateStreamResponse = await response.json();
      
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to create stream');
      }
      
      setCurrentStream(data.stream);
      setStreamCredentials({
        rtmpUrl: data.rtmpUrl,
        streamKey: data.streamKey,
      });
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to create stream');
    } finally {
      setIsCreatingStream(false);
    }
  };

  // End the current stream
  const handleStopStream = async () => {
    if (!currentStream) return;
    
    try {
      await fetch(`/api/streams/${currentStream.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });
      
      setCurrentStream(null);
      setStreamCredentials(null);
      setStreamTitle("");
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, type: 'rtmp' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'rtmp') {
      setCopiedRtmp(true);
      setTimeout(() => setCopiedRtmp(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const filteredStreamers = selectedCategory === "all" 
    ? liveStreams 
    : liveStreams.filter(s => s.category.toLowerCase() === selectedCategory);

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="mr-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <Icon icon="solar:arrow-left-bold" className="h-5 w-5" />
              </Link>
              <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Icon icon="solar:play-stream-bold" className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  Xtreme Live
                  <Badge variant="destructive" className="animate-pulse bg-red-600 hover:bg-red-600 text-white text-[10px] uppercase tracking-wider">LIVE</Badge>
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Watch & stream live trading sessions
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6 p-1 bg-zinc-200 dark:bg-zinc-800/50 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("watch")}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-all text-sm flex items-center gap-2",
                activeTab === "watch"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Icon icon="solar:eye-bold" className={cn("h-4 w-4", activeTab === "watch" ? "text-red-600" : "")} />
              Watch Streams
            </button>
            <button
              onClick={() => setActiveTab("stream")}
              className={cn(
                "px-4 py-2 rounded-md font-medium transition-all text-sm flex items-center gap-2",
                activeTab === "stream"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Icon icon="solar:videocamera-record-bold" className={cn("h-4 w-4", activeTab === "stream" ? "text-red-600" : "")} />
              Go Live
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-white dark:bg-zinc-950">
          {activeTab === "watch" ? (
            <div className="space-y-6">
              {/* Categories Filter */}
              <div className="flex gap-2 flex-wrap border-b border-zinc-100 dark:border-zinc-800 pb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                      selectedCategory === cat.id
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <Icon icon={cat.icon} className="h-3.5 w-3.5" />
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Live Streamers Grid */}
              {isLoadingStreams ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedStream ? (
                // Watching a specific stream
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <StreamPlayer
                      playbackId={selectedStream.mux_playback_id || ''}
                      title={selectedStream.title}
                      streamerName={(selectedStream.profiles as { full_name: string | null })?.full_name || 'Streamer'}
                      viewerCount={selectedStream.viewer_count}
                      isLive={selectedStream.status === 'active'}
                      className="aspect-video"
                    />
                    <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <h3 className="font-bold text-zinc-900 dark:text-white text-lg mb-1">{selectedStream.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <span>{(selectedStream.profiles as { full_name: string | null })?.full_name || 'Streamer'}</span>
                        <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                        <span className="capitalize">{selectedStream.category}</span>
                        <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                        <span>{selectedStream.viewer_count} viewers</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedStream(null)}
                        className="mt-4"
                      >
                        <Icon icon="solar:arrow-left-bold" className="mr-2 h-4 w-4" />
                        Back to Streams
                      </Button>
                    </div>
                  </div>
                  <div className="lg:col-span-1 h-[500px]">
                    <StreamChat 
                      streamId={selectedStream.id}
                      isStreamOwner={selectedStream.user_id === userId}
                    />
                  </div>
                </div>
              ) : (
                // Stream grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStreamers.map((streamer) => (
                    <div
                      key={streamer.id}
                      onClick={() => setSelectedStream(streamer)}
                      className="group relative rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-zinc-900">
                        {streamer.mux_playback_id ? (
                          <img
                            src={`https://image.mux.com/${streamer.mux_playback_id}/thumbnail.jpg?time=0`}
                            alt={streamer.title}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon icon="solar:videocamera-bold-duotone" className="h-12 w-12 text-zinc-700" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 duration-300">
                          <div className="bg-red-600/90 text-white rounded-full p-4 shadow-lg backdrop-blur-sm">
                            <Icon icon="solar:play-bold" className="h-8 w-8 ml-1" />
                          </div>
                        </div>
                        
                        {/* Live Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <Badge variant="destructive" className="bg-red-600 text-white hover:bg-red-700 font-bold border-0 flex items-center gap-1.5 px-2 py-0.5">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                            LIVE
                          </Badge>
                          <span className="bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-md border border-white/10">
                            {streamer.viewer_count.toLocaleString()} viewers
                          </span>
                        </div>
                        {/* Category Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm capitalize">
                            {streamer.category}
                          </span>
                        </div>
                      </div>

                      {/* Streamer Info */}
                      <div className="p-4 flex gap-3">
                        <div className="relative">
                          {(streamer.profiles as { avatar_url: string | null })?.avatar_url ? (
                            <img
                              src={(streamer.profiles as { avatar_url: string | null }).avatar_url!}
                              alt={(streamer.profiles as { full_name: string | null })?.full_name || 'Streamer'}
                              className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-zinc-800 object-cover bg-zinc-200 dark:bg-zinc-800"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-zinc-800 bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-bold">
                              {((streamer.profiles as { full_name: string | null })?.full_name || 'S').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-zinc-900 dark:text-white truncate text-sm mb-1 leading-tight group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                            {streamer.title}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                            {(streamer.profiles as { full_name: string | null })?.full_name || 'Streamer'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredStreamers.length === 0 && !isLoadingStreams && !selectedStream && (
                <div className="text-center py-16 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
                  <div className="bg-zinc-100 dark:bg-zinc-800 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon icon="solar:broadcast-line-duotone" className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No live streams found</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Be the first to start streaming in this category!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {isLoadingMyStream ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking for active streams...</p>
                  </div>
                </div>
              ) : !currentStream ? (
                <div className="max-w-2xl mx-auto">
                  {/* Error Message */}
                  {streamError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Icon icon="solar:danger-triangle-bold" className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-700 dark:text-red-400">{streamError}</p>
                      </div>
                    </div>
                  )}

                  {/* Stream Setup */}
                  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm mb-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-md flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-2xl font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          Hi, {userName} <span className="text-xl">👋</span>
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Setup your stream details below</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="stream-title" className="text-zinc-700 dark:text-zinc-300 font-medium">
                          Stream Title
                        </Label>
                        <Input
                          id="stream-title"
                          placeholder="e.g. Live Bitcoin Analysis & Trading Strategies"
                          value={streamTitle}
                          onChange={(e) => setStreamTitle(e.target.value)}
                          className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-red-500 focus:border-red-500 h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-zinc-700 dark:text-zinc-300 font-medium">Category</Label>
                        <div className="flex gap-2 flex-wrap">
                          {categories.filter(c => c.id !== "all").map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setStreamCategory(cat.id)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border",
                                streamCategory === cat.id
                                  ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              )}
                            >
                              <Icon icon={cat.icon} className={cn("h-4 w-4", streamCategory === cat.id ? "text-red-600" : "text-zinc-400")} />
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stream Guidelines */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 mb-6">
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                      <Icon icon="solar:shield-check-bold" className="h-4 w-4 text-zinc-500" />
                      Streaming Guidelines
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <li className="flex items-center gap-2">
                        <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
                        Educational content
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
                        Respectful interaction
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon icon="solar:forbidden-circle-bold" className="h-4 w-4 text-red-500 shrink-0" />
                        No financial advice
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon icon="solar:forbidden-circle-bold" className="h-4 w-4 text-red-500 shrink-0" />
                        No private keys
                      </li>
                    </ul>
                  </div>

                  {/* Go Live Button */}
                  <Button
                    onClick={handleStartStream}
                    disabled={!streamTitle.trim() || isCreatingStream}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl text-lg shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    {isCreatingStream ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Stream...
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:videocamera-record-bold" className="mr-2 h-5 w-5" />
                        Start Streaming
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stream Header - Show current stream info */}
                  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xl font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-lg">{currentStream.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <Badge
                            variant={currentStream.status === 'active' ? 'destructive' : 'secondary'}
                            className={cn(
                              "text-[10px] uppercase tracking-wider",
                              currentStream.status === 'active' 
                                ? "bg-green-600 hover:bg-green-700" 
                                : "bg-amber-600 hover:bg-amber-700"
                            )}
                          >
                            {currentStream.status === 'active' ? 'LIVE' : 'WAITING'}
                          </Badge>
                          <span className="capitalize">{currentStream.category}</span>
                          {currentStream.status === 'active' && (
                            <>
                              <span className="w-1 h-1 bg-zinc-400 rounded-full"></span>
                              <span>{currentStream.viewer_count} viewers</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stream Created - Show RTMP Credentials */}
                  {streamCredentials && currentStream.status === 'idle' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <Icon icon="solar:monitor-bold" className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white text-lg">Connect Your Streaming Software</h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            Use OBS Studio, Streamlabs, or any RTMP-compatible software to stream. Copy the credentials below.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* RTMP URL */}
                        <div>
                          <Label className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">Server URL</Label>
                          <div className="mt-1.5 flex gap-2">
                            <Input
                              value={streamCredentials.rtmpUrl}
                              readOnly
                              className="bg-white dark:bg-zinc-900 font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(streamCredentials.rtmpUrl, 'rtmp')}
                              className="shrink-0"
                            >
                              {copiedRtmp ? (
                                <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-green-600" />
                              ) : (
                                <Icon icon="solar:copy-bold" className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Stream Key */}
                        <div>
                          <Label className="text-zinc-700 dark:text-zinc-300 font-medium text-sm">Stream Key</Label>
                          <div className="mt-1.5 flex gap-2">
                            <Input
                              value={streamCredentials.streamKey}
                              readOnly
                              type="password"
                              className="bg-white dark:bg-zinc-900 font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(streamCredentials.streamKey, 'key')}
                              className="shrink-0"
                            >
                              {copiedKey ? (
                                <Icon icon="solar:check-circle-bold" className="h-4 w-4 text-green-600" />
                              ) : (
                                <Icon icon="solar:copy-bold" className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                            <Icon icon="solar:shield-warning-bold" className="h-3.5 w-3.5" />
                            Keep your stream key private. Never share it publicly.
                          </p>
                        </div>
                      </div>

                      {/* OBS Instructions */}
                      <div className="mt-6 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-amber-200 dark:border-amber-800/50">
                        <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                          <Icon icon="solar:document-text-bold" className="h-4 w-4 text-amber-600" />
                          Quick Setup for OBS
                        </h4>
                        <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                          <li>Open OBS Studio → Settings → Stream</li>
                          <li>Service: <strong>Custom</strong></li>
                          <li>Paste the Server URL and Stream Key above</li>
                          <li>Click &quot;Start Streaming&quot; in OBS</li>
                        </ol>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        Waiting for stream connection...
                      </div>
                    </div>
                  )}

                  {/* Stream is Active */}
                  {currentStream.status === 'active' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 space-y-4">
                        {/* Stream Preview */}
                        {currentStream.mux_playback_id && (
                          <StreamPlayer
                            playbackId={currentStream.mux_playback_id}
                            title={currentStream.title}
                            streamerName={userName}
                            viewerCount={currentStream.viewer_count}
                            isLive={true}
                            className="aspect-video"
                          />
                        )}

                        {/* Stream Info */}
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <div>
                              <p className="font-semibold text-green-800 dark:text-green-300">You&apos;re Live!</p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                {currentStream.viewer_count} viewer{currentStream.viewer_count !== 1 ? 's' : ''} watching
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chat */}
                      <div className="lg:col-span-1 h-[500px]">
                        <StreamChat streamId={currentStream.id} isStreamOwner={true} />
                      </div>
                    </div>
                  )}

                  {/* End Stream Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={handleStopStream}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                      <Icon icon="solar:stop-bold" className="mr-2 h-4 w-4" />
                      End Stream
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
