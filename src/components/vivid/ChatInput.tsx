"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
}

export default function ChatInput({
  onSend,
  disabled = false,
  isGenerating = false,
  onStop,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Listen for suggestion clicks from the empty state
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      if (text) {
        onSend(text);
      }
    };
    window.addEventListener("vivid:suggestion", handler);
    return () => window.removeEventListener("vivid:suggestion", handler);
  }, [onSend]);

  // Focus the input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-dark px-4 md:px-8 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all px-4 py-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Vivid AI..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 py-1.5 max-h-40 scrollbar-thin"
          />

          {isGenerating ? (
            <button
              onClick={onStop}
              className="shrink-0 p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Stop generating"
            >
              <Icon icon="ph:stop-fill" height={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className="shrink-0 p-2 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Icon icon="ph:paper-plane-tilt-fill" height={18} />
            </button>
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
          Vivid AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
