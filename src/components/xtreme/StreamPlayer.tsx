"use client";

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface StreamPlayerProps {
  playbackId: string;
  title?: string;
  streamerName?: string;
  viewerCount?: number;
  isLive?: boolean;
  autoPlay?: boolean;
  className?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({
  playbackId,
  title,
  streamerName,
  viewerCount = 0,
  isLive = true,
  autoPlay = true,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    setIsLoading(true);
    setError(null);

    // Check if HLS is supported natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay blocked, mute and try again
            video.muted = true;
            setIsMuted(true);
            video.play().catch(console.error);
          });
        }
      });
    } else if (Hls.isSupported()) {
      // Use HLS.js for other browsers
      const hls = new Hls({
        lowLatencyMode: true,
        enableWorker: true,
        backBufferLength: 90,
      });
      
      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(console.error);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error. Stream may be offline.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error. Attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError('Stream unavailable');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      setError('Your browser does not support HLS playback');
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackId, playbackUrl, autoPlay]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-xl overflow-hidden group",
        className
      )}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-sm">Connecting to stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-4">
            <Icon icon="solar:danger-triangle-bold" className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">{error}</p>
            <p className="text-zinc-400 text-sm">The stream may be offline or starting up.</p>
          </div>
        </div>
      )}

      {/* Overlay - Live badge and info */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLive && (
              <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded flex items-center gap-1.5">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <span className="bg-black/50 text-white text-xs font-medium px-2.5 py-1 rounded backdrop-blur-sm flex items-center gap-1.5">
              <Icon icon="solar:eye-bold" className="h-3.5 w-3.5" />
              {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      {(title || streamerName) && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-14 px-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {title && (
            <h3 className="text-white font-semibold text-lg truncate">{title}</h3>
          )}
          {streamerName && (
            <p className="text-zinc-300 text-sm">{streamerName}</p>
          )}
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-3 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <Icon
                icon={isPlaying ? "solar:pause-bold" : "solar:play-bold"}
                className="h-5 w-5 text-white"
              />
            </button>
            <button
              onClick={toggleMute}
              className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
            >
              <Icon
                icon={isMuted ? "solar:volume-cross-bold" : "solar:volume-loud-bold"}
                className="h-5 w-5 text-white"
              />
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <Icon
              icon={isFullscreen ? "solar:quit-full-screen-bold" : "solar:full-screen-bold"}
              className="h-5 w-5 text-white"
            />
          </button>
        </div>
      </div>

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="bg-red-600/90 hover:bg-red-600 text-white rounded-full p-5 transition-transform hover:scale-110">
            <Icon icon="solar:play-bold" className="h-10 w-10 ml-1" />
          </div>
        </button>
      )}
    </div>
  );
};

export default StreamPlayer;
