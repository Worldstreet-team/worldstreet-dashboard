'use client'

import { useVivid, VividWidget } from '@worldstreet/vivid-voice'
import type { VividAgentState } from '@worldstreet/vivid-voice'

/** Human-readable labels for each agent state */
const STATE_LABELS: Record<VividAgentState, string> = {
  idle: '',
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
 * Always-visible Vivid voice widget with status pill and close button.
 * Must be rendered inside a <VividProvider>.
 */
export default function VividVoiceControl() {
  const { state, isConnected, endSession } = useVivid()

  const isActive = state !== 'idle' && state !== 'error'

  return (
    <>
      {/* Voice widget — always visible */}
      <VividWidget
        showTranscript={true}
        size="md"
        position={{ bottom: '24px', right: '24px' }}
        classNames={{
          container:
            'fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 max-sm:bottom-5 max-sm:right-4 max-sm:scale-75 max-sm:origin-bottom-right',
        }}
      />

      {/* Status pill — appears above the mic when a session is active */}
      {isActive && (
        <div className="fixed bottom-22 right-6 z-50 flex items-center gap-1.5 rounded-full bg-gray-900/80 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white/90 shadow-lg max-sm:bottom-19 max-sm:right-4 max-sm:scale-90 max-sm:origin-bottom-right select-none pointer-events-none">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABELS[state]}
        </div>
      )}

      {/* Close button — appears to the left of the mic only when a session is active */}
      {isConnected && (
        <button
          onClick={() => endSession()}
          aria-label="End Vivid voice session"
          title="End session"
          className="fixed bottom-7 right-22 z-50 flex items-center justify-center h-7 w-7 rounded-full bg-red-500/90 hover:bg-red-400 text-white shadow-lg backdrop-blur-sm transition-colors duration-150 max-sm:bottom-6 max-sm:right-18 max-sm:scale-75 max-sm:origin-bottom-right"
        >
          {/* X icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </>
  )
}
