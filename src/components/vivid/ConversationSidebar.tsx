"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import type { Conversation } from "@/lib/hooks/useChat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

export default function ConversationSidebar({
  conversations,
  activeConversation,
  loading,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleStartRename = (convo: Conversation) => {
    setEditingId(convo._id);
    setEditTitle(convo.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveRename();
    if (e.key === "Escape") {
      setEditingId(null);
      setEditTitle("");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark border-r border-gray-200 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Conversations
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreate}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors"
            title="New Chat"
          >
            <Icon icon="ph:plus-bold" height={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors lg:hidden"
            >
              <Icon icon="ph:x-bold" height={18} />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Icon
              icon="ph:chats-circle-duotone"
              height={40}
              className="mx-auto text-gray-300 dark:text-gray-600 mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No conversations yet
            </p>
            <button
              onClick={onCreate}
              className="mt-3 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((convo) => (
              <div
                key={convo._id}
                className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                  activeConversation?._id === convo._id
                    ? "bg-primary/10 text-primary dark:bg-primary/15"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300"
                }`}
                onClick={() => {
                  if (editingId !== convo._id) {
                    onSelect(convo._id);
                  }
                }}
              >
                <Icon
                  icon="ph:chat-circle-text-duotone"
                  height={18}
                  className="shrink-0 opacity-60"
                />

                <div className="flex-1 min-w-0">
                  {editingId === convo._id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleSaveRename}
                      onKeyDown={handleKeyDown}
                      className="w-full text-sm bg-white dark:bg-gray-800 border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate">
                        {convo.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(convo.updatedAt)}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions menu */}
                {editingId !== convo._id && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(
                          menuOpenId === convo._id ? null : convo._id
                        );
                      }}
                      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-opacity ${
                        menuOpenId === convo._id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <Icon icon="ph:dots-three-bold" height={16} />
                    </button>

                    {menuOpenId === convo._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(convo);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                          >
                            <Icon icon="ph:pencil-simple" height={14} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                              onDelete(convo._id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            <Icon icon="ph:trash-simple" height={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
