"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { useChat } from "@/lib/hooks/useChat";
import ConversationSidebar from "./ConversationSidebar";
import ChatMessageList from "./ChatMessageList";
import ChatInput from "./ChatInput";
import CustomInstructionsModal from "./CustomInstructionsModal";

export default function ChatPage() {
  const router = useRouter();
  const {
    conversations,
    activeConversation,
    conversationsLoading,
    fetchConversations,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    updateCustomInstructions,
    messages,
    messagesLoading,
    sendMessage,
    isGenerating,
    stopGenerating,
    error,
    clearError,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Send message handler — auto-creates a conversation if needed
  const handleSend = useCallback(
    async (content: string) => {
      if (!activeConversation) {
        const newConvo = await createConversation();
        if (newConvo) {
          // Pass the new conversation directly to avoid stale closure
          await sendMessage(content, [], newConvo);
        }
        return;
      }
      sendMessage(content);
    },
    [activeConversation, createConversation, sendMessage]
  );

  const handleNewChat = useCallback(async () => {
    await createConversation();
    setSidebarOpen(false);
  }, [createConversation]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      await selectConversation(id);
      setSidebarOpen(false);
    },
    [selectConversation]
  );

  const handleSaveInstructions = useCallback(
    (instructions: string) => {
      if (activeConversation) {
        updateCustomInstructions(activeConversation._id, instructions);
      }
    },
    [activeConversation, updateCustomInstructions]
  );

  return (
    <div className="flex h-screen bg-white dark:bg-dark overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversation={activeConversation}
          loading={conversationsLoading}
          onSelect={handleSelectConversation}
          onCreate={handleNewChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors lg:hidden"
            >
              <Icon icon="ph:list-bold" height={20} />
            </button>

            <button
              onClick={() => router.push("/")}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors"
              title="Back to Dashboard"
            >
              <Icon icon="ph:arrow-left-bold" height={20} />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Icon icon="ph:sparkle-bold" height={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {activeConversation?.title || "Vivid AI"}
                </h1>
                {activeConversation && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5">
                    GPT-4o
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeConversation && (
              <button
                onClick={() => setInstructionsOpen(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors"
                title="Custom Instructions"
              >
                <Icon icon="ph:sliders-horizontal-duotone" height={20} />
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400 transition-colors"
              title="New Chat"
            >
              <Icon icon="ph:plus-bold" height={20} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800/30">
            <Icon
              icon="ph:warning-circle-fill"
              height={16}
              className="text-red-500 shrink-0"
            />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <Icon icon="ph:x-bold" height={14} />
            </button>
          </div>
        )}

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          loading={messagesLoading}
          isGenerating={isGenerating}
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={messagesLoading}
          isGenerating={isGenerating}
          onStop={stopGenerating}
        />
      </div>

      {/* Custom Instructions Modal */}
      <CustomInstructionsModal
        isOpen={instructionsOpen}
        instructions={activeConversation?.customInstructions || ""}
        onSave={handleSaveInstructions}
        onClose={() => setInstructionsOpen(false)}
      />
    </div>
  );
}
