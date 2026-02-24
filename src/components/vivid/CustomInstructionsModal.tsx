"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";

interface CustomInstructionsModalProps {
  isOpen: boolean;
  instructions: string;
  onSave: (instructions: string) => void;
  onClose: () => void;
}

export default function CustomInstructionsModal({
  isOpen,
  instructions,
  onSave,
  onClose,
}: CustomInstructionsModalProps) {
  const [value, setValue] = useState(instructions);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <Icon
              icon="ph:sliders-horizontal-duotone"
              height={20}
              className="text-primary"
            />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Custom Instructions
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 transition-colors"
          >
            <Icon icon="ph:x-bold" height={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Tell Vivid AI how you&apos;d like it to respond. These instructions
            apply to this conversation only.
          </p>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g., Always respond in bullet points. Focus on DeFi topics. Explain concepts simply..."
            rows={6}
            maxLength={2000}
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
            {value.length}/2000
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Save Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
