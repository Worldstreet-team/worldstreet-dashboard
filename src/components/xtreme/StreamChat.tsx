"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types/stream';

interface StreamChatProps {
  streamId: string;
  isStreamOwner?: boolean;
  className?: string;
}

const StreamChat: React.FC<StreamChatProps> = ({
  streamId,
  isStreamOwner = false,
  className,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/streams/${streamId}/chat?limit=100`);
        const data = await response.json();
        
        if (response.ok) {
          setMessages(data.messages || []);
        } else {
          setError(data.error || 'Failed to load chat');
        }
      } catch (err) {
        setError('Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [streamId]);


  // Subscribe to real-time chat updates
  useEffect(() => {
    const channel = supabase
      .channel(`stream-chat-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stream_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/streams/${streamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send message');
        return;
      }

      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `/api/streams/${streamId}/chat?messageId=${messageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete message');
      }
    } catch (err) {
      setError('Failed to delete message');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Icon icon="solar:chat-round-dots-bold" className="h-5 w-5 text-red-600" />
          Live Chat
        </h3>
        <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
          {messages.filter(m => !m.is_deleted).length} messages
        </span>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="solar:chat-round-line-duotone" className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages
              .filter((m) => !m.is_deleted)
              .map((message) => (
                <div
                  key={message.id}
                  className="group flex gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg p-2 -mx-2 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.user_avatar ? (
                      <img
                        src={message.user_avatar}
                        alt={message.user_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-sm font-bold">
                        {message.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                        {message.user_name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 break-words">
                      {message.message}
                    </p>
                  </div>

                  {/* Delete button (for stream owner) */}
                  {isStreamOwner && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 h-6 w-6 rounded hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-all"
                      title="Delete message"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </ScrollArea>

      {/* Error Message */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Send a message..."
            maxLength={500}
            className="flex-1 h-10 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            disabled={isSending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon icon="solar:plain-bold" className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default StreamChat;
