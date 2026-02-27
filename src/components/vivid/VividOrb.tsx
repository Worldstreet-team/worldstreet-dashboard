'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useVivid } from '@worldstreet/vivid-voice'
import type { VividAgentState } from '@worldstreet/vivid-voice'

// =============================================================================
// Constants
// =============================================================================

const ORB_SIZE = 92
const CANVAS_SIZE = ORB_SIZE * 2 // 2x for retina
const CENTER = CANVAS_SIZE / 2
const BASE_RADIUS = 36
const MAX_RING_SEGMENTS = 48

// Color palettes per state
const STATE_COLORS: Record<
  VividAgentState,
  { inner: string[]; ring: string; glow: string; label: string }
> = {
  idle: {
    inner: ['#6366f1', '#8b5cf6'],
    ring: 'rgba(139,92,246,0.15)',
    glow: 'rgba(99,102,241,0.08)',
    label: '',
  },
  connecting: {
    inner: ['#6366f1', '#a78bfa'],
    ring: 'rgba(167,139,250,0.3)',
    glow: 'rgba(139,92,246,0.15)',
    label: '',
  },
  ready: {
    inner: ['#6366f1', '#8b5cf6'],
    ring: 'rgba(139,92,246,0.2)',
    glow: 'rgba(99,102,241,0.1)',
    label: '',
  },
  listening: {
    inner: ['#3b82f6', '#06b6d4'],
    ring: 'rgba(6,182,212,0.35)',
    glow: 'rgba(59,130,246,0.2)',
    label: 'Listening',
  },
  processing: {
    inner: ['#8b5cf6', '#c084fc'],
    ring: 'rgba(192,132,252,0.3)',
    glow: 'rgba(139,92,246,0.18)',
    label: 'Thinking',
  },
  speaking: {
    inner: ['#8b5cf6', '#ec4899'],
    ring: 'rgba(236,72,153,0.3)',
    glow: 'rgba(139,92,246,0.18)',
    label: 'Speaking',
  },
  error: {
    inner: ['#ef4444', '#f87171'],
    ring: 'rgba(248,113,113,0.3)',
    glow: 'rgba(239,68,68,0.15)',
    label: 'Error',
  },
}

// =============================================================================
// Helpers
// =============================================================================

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// =============================================================================
// Component
// =============================================================================

export default function VividOrb() {
  const {
    state,
    isConnected,
    startSession,
    endSession,
    stopListening,
    getAudioLevels,
  } = useVivid()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const smoothVolumeRef = useRef(0)
  const phaseRef = useRef(0)
  const [hovered, setHovered] = useState(false)

  // Derived
  const isActive = state === 'listening' || state === 'speaking' || state === 'processing'
  const isIdle = state === 'idle'
  const colors = STATE_COLORS[state] ?? STATE_COLORS.idle

  // ── Click handler ──────────────────────────────────────────────────
  const handleClick = useCallback(async () => {
    if (state === 'connecting') return
    if (isConnected) {
      endSession()
    } else {
      await startSession()
    }
  }, [state, isConnected, startSession, endSession])

  // ── Stop listening (mic mute) ──────────────────────────────────────
  const handleStopListening = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      stopListening()
    },
    [stopListening],
  )

  // ── Canvas animation loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    const draw = () => {
      if (!running) return
      frameRef.current = requestAnimationFrame(draw)

      // Get audio levels
      let rawVolume = 0
      try {
        const audioData = getAudioLevels()
        if (audioData && audioData.length > 0) {
          rawVolume = audioData.reduce((a, b) => a + b, 0) / audioData.length / 255
        }
      } catch {
        // No levels available
      }

      // Smooth the volume
      const smoothFactor = rawVolume > smoothVolumeRef.current ? 0.3 : 0.08
      smoothVolumeRef.current = lerp(smoothVolumeRef.current, rawVolume, smoothFactor)
      const vol = smoothVolumeRef.current

      // Advance phase
      phaseRef.current += 0.015

      const t = phaseRef.current
      const currentState = state

      // Clear
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // ── Outer glow ──────────────────────────────────────────────
      const colors = STATE_COLORS[currentState] ?? STATE_COLORS.idle

      const glowRadius = BASE_RADIUS * 2.2
      const glowGrad = ctx.createRadialGradient(
        CENTER,
        CENTER,
        BASE_RADIUS * 0.5,
        CENTER,
        CENTER,
        glowRadius + (vol * 20),
      )
      glowGrad.addColorStop(0, colors.glow)
      glowGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGrad
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, glowRadius + vol * 20, 0, Math.PI * 2)
      ctx.fill()

      // ── Audio ring segments ─────────────────────────────────────
      if (
        (currentState === 'listening' || currentState === 'speaking') &&
        vol > 0.01
      ) {
        let audioData: Uint8Array | null = null
        try {
          audioData = getAudioLevels()
        } catch {
          // ignore
        }

        if (audioData && audioData.length > 0) {
          const segCount = Math.min(MAX_RING_SEGMENTS, audioData.length)
          const angleStep = (Math.PI * 2) / segCount

          for (let i = 0; i < segCount; i++) {
            const val = audioData[Math.floor((i / segCount) * audioData.length)] / 255
            const segLen = 2 + val * 14
            const angle = i * angleStep + t * 0.5
            const rInner = BASE_RADIUS + 4
            const rOuter = rInner + segLen

            const x1 = CENTER + Math.cos(angle) * rInner
            const y1 = CENTER + Math.sin(angle) * rInner
            const x2 = CENTER + Math.cos(angle) * rOuter
            const y2 = CENTER + Math.sin(angle) * rOuter

            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
            ctx.strokeStyle =
              currentState === 'speaking'
                ? `rgba(236,72,153,${0.3 + val * 0.5})`
                : `rgba(6,182,212,${0.3 + val * 0.5})`
            ctx.stroke()
          }
        }
      }

      // ── Connecting spinner ring ─────────────────────────────────
      if (currentState === 'connecting') {
        ctx.beginPath()
        ctx.arc(CENTER, CENTER, BASE_RADIUS + 6, t * 2, t * 2 + Math.PI * 1.2)
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.strokeStyle = 'rgba(167,139,250,0.6)'
        ctx.stroke()
      }

      // ── Processing rotating dots ───────────────────────────────
      if (currentState === 'processing') {
        for (let i = 0; i < 3; i++) {
          const angle = t * 1.5 + (i * Math.PI * 2) / 3
          const dotR = BASE_RADIUS + 8
          const dx = CENTER + Math.cos(angle) * dotR
          const dy = CENTER + Math.sin(angle) * dotR
          ctx.beginPath()
          ctx.arc(dx, dy, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(192,132,252,${0.5 + Math.sin(t * 3 + i) * 0.3})`
          ctx.fill()
        }
      }

      // ── Orb ring ────────────────────────────────────────────────
      const ringRadius = BASE_RADIUS + 2
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, ringRadius, 0, Math.PI * 2)
      ctx.lineWidth = 1.5
      ctx.strokeStyle = colors.ring
      ctx.stroke()

      // ── Orb body ────────────────────────────────────────────────
      // Breathing for idle, volume-reactive for active states
      let dynamicRadius = BASE_RADIUS
      if (currentState === 'idle' || currentState === 'ready') {
        dynamicRadius += Math.sin(t * 0.8) * 1.5
      } else if (currentState === 'listening') {
        dynamicRadius += vol * 8
      } else if (currentState === 'speaking') {
        dynamicRadius += vol * 6
      }

      const bodyGrad = ctx.createRadialGradient(
        CENTER - dynamicRadius * 0.3,
        CENTER - dynamicRadius * 0.3,
        0,
        CENTER,
        CENTER,
        dynamicRadius,
      )
      bodyGrad.addColorStop(0, colors.inner[0])
      bodyGrad.addColorStop(1, colors.inner[1])

      ctx.beginPath()
      ctx.arc(CENTER, CENTER, dynamicRadius, 0, Math.PI * 2)
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // ── Inner highlight ─────────────────────────────────────────
      const hlGrad = ctx.createRadialGradient(
        CENTER - dynamicRadius * 0.25,
        CENTER - dynamicRadius * 0.35,
        0,
        CENTER,
        CENTER,
        dynamicRadius * 0.7,
      )
      hlGrad.addColorStop(0, 'rgba(255,255,255,0.25)')
      hlGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, dynamicRadius * 0.7, 0, Math.PI * 2)
      ctx.fillStyle = hlGrad
      ctx.fill()
    }

    draw()

    return () => {
      running = false
      cancelAnimationFrame(frameRef.current)
    }
  }, [state, getAudioLevels])

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 max-sm:bottom-5 max-sm:right-4">
      {/* State label */}
      {isActive && colors.label && (
        <div className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-white/80 select-none pointer-events-none">
          {colors.label}
        </div>
      )}

      {/* Orb container */}
      <div className="relative">
        {/* Canvas orb */}
        <button
          onClick={handleClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          disabled={state === 'connecting'}
          aria-label={isConnected ? 'Stop Vivid' : 'Start Vivid'}
          className={`
            relative cursor-pointer border-0 bg-transparent p-0
            transition-transform duration-200 ease-out
            ${hovered ? 'scale-110' : 'scale-100'}
            active:scale-95
            disabled:cursor-wait disabled:opacity-70
          `}
          style={{ width: ORB_SIZE, height: ORB_SIZE }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="pointer-events-none"
            style={{ width: ORB_SIZE, height: ORB_SIZE }}
          />

          {/* Idle icon — robot face */}
          {isIdle && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-85"
              >
                {/* Head */}
                <rect x="4" y="6" width="16" height="14" rx="3" />
                {/* Eyes */}
                <circle cx="9" cy="12" r="1.5" fill="white" stroke="none" />
                <circle cx="15" cy="12" r="1.5" fill="white" stroke="none" />
                {/* Mouth */}
                <path d="M9 16h6" />
                {/* Antenna */}
                <line x1="12" y1="6" x2="12" y2="2" />
                <circle cx="12" cy="2" r="1" fill="white" stroke="none" />
                {/* Ears */}
                <line x1="4" y1="11" x2="2" y2="11" />
                <line x1="20" y1="11" x2="22" y2="11" />
              </svg>
            </div>
          )}
        </button>

        {/* Stop listening button — shows when listening */}
        {state === 'listening' && (
          <button
            onClick={handleStopListening}
            aria-label="Stop listening"
            className="
              absolute -bottom-1 -right-1
              flex h-7 w-7 items-center justify-center
              rounded-full bg-red-500/90 backdrop-blur-sm
              text-white shadow-lg
              transition-all duration-150
              hover:bg-red-500 hover:scale-110
              active:scale-95
            "
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
              <path d="M5 10v2a7 7 0 0 0 12 5" />
              <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>
        )}

        {/* End session button — shows when active (not listening) */}
        {isConnected && state !== 'listening' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              endSession()
            }}
            aria-label="End session"
            className="
              absolute -bottom-1 -right-1
              flex h-7 w-7 items-center justify-center
              rounded-full bg-white/20 backdrop-blur-sm
              text-white/70 shadow-lg
              transition-all duration-150
              hover:bg-white/30 hover:text-white hover:scale-110
              active:scale-95
            "
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
