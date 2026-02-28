'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVivid, VividWidget } from '@worldstreet/vivid-voice'

const STORAGE_KEY = 'vivid-enabled'

/**
 * State labels — short, calm descriptions for each agent state.
 * These appear as a small pill near the Vivid button.
 */
const STATE_LABELS: Record<string, string> = {
  idle: '',
  connecting: 'Connecting…',
  ready: 'Ready',
  listening: 'Listening',
  processing: 'Thinking…',
  speaking: 'Speaking',
  error: 'Error',
}

/**
 * Ring / glow colour per state (Tailwind classes)
 */
const STATE_RING: Record<string, string> = {
  idle: 'ring-zinc-500/30',
  connecting: 'ring-amber-400/50 animate-pulse',
  ready: 'ring-emerald-400/40',
  listening: 'ring-emerald-400/70 animate-pulse',
  processing: 'ring-blue-400/60 animate-pulse',
  speaking: 'ring-violet-400/70 animate-pulse',
  error: 'ring-red-400/60',
}

/** Solid dot colour per state */
const DOT_COLOR: Record<string, string> = {
  idle: 'bg-zinc-500',
  connecting: 'bg-amber-400 animate-pulse',
  ready: 'bg-emerald-400',
  listening: 'bg-emerald-400 animate-pulse',
  processing: 'bg-blue-400 animate-pulse',
  speaking: 'bg-violet-400 animate-pulse',
  error: 'bg-red-400',
}

export default function VividControl() {
  const [enabled, setEnabled] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'false') setEnabled(false)
    } catch {
      // Ignore — default to enabled
    }
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // Ignore
      }
      return next
    })
  }, [])

  // Don't render anything until client-side hydration is done
  if (!mounted) return null

  if (!enabled) {
    return <DisabledBadge onEnable={toggle} />
  }

  return (
    <>
      <VividWidget
        showTranscript={true}
        size="md"
        position={{ bottom: '24px', right: '24px' }}
        classNames={{
          container:
            'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 max-sm:bottom-5 max-sm:right-4 max-sm:scale-75 max-sm:origin-bottom-right',
        }}
      />
      <StatusIndicator onDisable={toggle} />
    </>
  )
}

// ─── Status pill shown when Vivid is active ─────────────────────────────────

function StatusIndicator({ onDisable }: { onDisable: () => void }) {
  const { state, isConnected, endSession } = useVivid()
  const label = STATE_LABELS[state] || ''
  const ring = STATE_RING[state] || STATE_RING.idle
  const dot = DOT_COLOR[state] || DOT_COLOR.idle

  const handleTurnOff = () => {
    if (isConnected) endSession()
    onDisable()
  }

  // Only show the indicator when there's a meaningful state to communicate
  const showIndicator = state !== 'idle'

  return (
    <div
      className={`fixed bottom-[88px] right-6 z-50 flex items-center gap-2 transition-all duration-300 max-sm:bottom-[76px] max-sm:right-4 max-sm:scale-75 max-sm:origin-bottom-right ${
        showIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      {/* Status pill */}
      <div
        className={`flex items-center gap-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 ring-2 ${ring} transition-all duration-300`}
      >
        <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
        <span className="text-xs font-medium text-zinc-300 whitespace-nowrap">
          {label}
        </span>
      </div>

      {/* Turn off button */}
      <button
        onClick={handleTurnOff}
        title="Turn off Vivid"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}

// ─── Small button shown when Vivid is turned off ────────────────────────────

function DisabledBadge({ onEnable }: { onEnable: () => void }) {
  return (
    <button
      onClick={onEnable}
      title="Turn on Vivid"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 px-3.5 py-2.5 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500/60 transition-all duration-200 group max-sm:bottom-5 max-sm:right-4"
    >
      {/* Microphone icon with slash */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
        />
        <line
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-medium">Vivid off</span>
    </button>
  )
}
