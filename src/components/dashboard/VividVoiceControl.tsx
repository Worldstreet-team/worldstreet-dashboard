'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVivid, VividWidget } from '@worldstreet/vivid-voice'
import type { VividAgentState } from '@worldstreet/vivid-voice'

const STORAGE_KEY = 'vivid-voice-enabled'

/** Human-readable labels for each agent state */
const STATE_LABELS: Record<VividAgentState, string> = {
  idle: 'Off',
  connecting: 'Connecting…',
  ready: 'Ready',
  listening: 'Listening',
  processing: 'Thinking',
  speaking: 'Speaking',
  error: 'Error',
}

/** Dot color per state (Tailwind classes) */
const STATE_DOT: Record<VividAgentState, string> = {
  idle: 'bg-gray-400',
  connecting: 'bg-yellow-400 animate-pulse',
  ready: 'bg-emerald-400',
  listening: 'bg-blue-400 animate-pulse',
  processing: 'bg-violet-400 animate-pulse',
  speaking: 'bg-emerald-400 animate-pulse',
  error: 'bg-red-400',
}

/**
 * Renders the VividWidget alongside a small status pill and power toggle.
 * Must be rendered inside a <VividProvider>.
 */
export default function VividVoiceControl() {
  const { state, isConnected, endSession } = useVivid()

  // Persist enabled/disabled preference
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  }, [enabled])

  // When user disables, kill any active session
  const handleToggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      if (!next && isConnected) {
        endSession()
      }
      return next
    })
  }, [isConnected, endSession])

  // Determine what to show
  const isActive = state !== 'idle' && state !== 'error'
  const showIndicator = enabled && isActive

  return (
    <>
      {/* Voice widget — only render when enabled */}
      {enabled && (
        <VividWidget
          showTranscript={true}
          size="md"
          position={{ bottom: '24px', right: '24px' }}
          classNames={{
            container:
              'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 max-sm:bottom-5 max-sm:right-4 max-sm:scale-75 max-sm:origin-bottom-right',
          }}
        />
      )}

      {/* Status pill — fixed above the widget button */}
      {showIndicator && (
        <div className="fixed bottom-22 right-6 z-50 flex items-center gap-1.5 rounded-full bg-gray-900/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-lg max-sm:bottom-19 max-sm:right-4 max-sm:scale-90 max-sm:origin-bottom-right select-none pointer-events-none">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABELS[state]}
        </div>
      )}

      {/* Power toggle — small button left of the widget area */}
      <button
        onClick={handleToggle}
        aria-label={enabled ? 'Turn off Vivid voice assistant' : 'Turn on Vivid voice assistant'}
        title={enabled ? 'Vivid is on — click to turn off' : 'Vivid is off — click to turn on'}
        className={`
          fixed bottom-7 right-22 z-50
          flex items-center justify-center
          h-8 w-8 rounded-full
          border border-white/10
          shadow-lg backdrop-blur-sm
          transition-colors duration-200
          max-sm:bottom-6 max-sm:right-18 max-sm:scale-75 max-sm:origin-bottom-right
          ${enabled
            ? 'bg-emerald-600/90 hover:bg-emerald-500/90 text-white'
            : 'bg-gray-700/80 hover:bg-gray-600/80 text-gray-400'
          }
        `}
      >
        {/* Power icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </button>
    </>
  )
}
