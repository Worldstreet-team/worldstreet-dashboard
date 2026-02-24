"use client";

import React, { useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import type { Message } from "@/lib/hooks/useChat";
import ChatBubble from "./ChatBubble";

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
  isGenerating: boolean;
}

export default function ChatMessageList({
  messages,
  loading,
  isGenerating,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading messages...
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-5">
            <Icon icon="ph:sparkle-bold" height={32} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Welcome to Vivid AI
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your AI-powered trading assistant. Ask about crypto markets,
            trading strategies, portfolio analysis, or anything else.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-sm text-gray-600 dark:text-gray-400 group"
                onClick={() => {
                  // Dispatch a custom event that ChatInput can listen to
                  window.dispatchEvent(
                    new CustomEvent("vivid:suggestion", {
                      detail: { text: s.prompt },
                    })
                  );
                }}
              >
                <Icon
                  icon={s.icon}
                  height={18}
                  className="text-primary mb-1.5 group-hover:scale-110 transition-transform"
                />
                <span className="line-clamp-2">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, i) => (
            <ChatBubble key={msg._id || `msg-${i}`} message={msg} />
          ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Suggestion prompts ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    icon: "ph:chart-line-up-duotone",
    label: "What's the current state of the crypto market?",
    prompt: "What's the current state of the crypto market?",
  },
  {
    icon: "ph:lightbulb-duotone",
    label: "Explain DeFi yield farming to me",
    prompt: "Explain DeFi yield farming to me in simple terms",
  },
  {
    icon: "ph:shield-check-duotone",
    label: "Best practices for securing my crypto wallet",
    prompt: "What are the best practices for securing my crypto wallet?",
  },
  {
    icon: "ph:scales-duotone",
    label: "Compare Bitcoin vs Ethereum as investments",
    prompt: "Compare Bitcoin vs Ethereum as investments. What are the key differences?",
  },
];
