"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import type { VividAgentState } from "@worldstreet/vivid-voice";

interface BlobOrbProps {
  state: VividAgentState;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  getAudioLevels: () => Uint8Array;
}

// ── Size configs ────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { dimension: 72, baseRadius: 22, iconSize: 20 },
  md: { dimension: 88, baseRadius: 28, iconSize: 24 },
  lg: { dimension: 104, baseRadius: 34, iconSize: 28 },
} as const;

// ── Color palette (purple / pink gradient) ──────────────────────────────────

const COLORS = {
  // Core fill gradient
  centerViolet: { r: 139, g: 92, b: 246 },   // violet-500
  edgePurple: { r: 168, g: 85, b: 247 },      // purple-500
  activePink: { r: 236, g: 72, b: 153 },      // pink-500

  // Glow
  glowPurple: "rgba(192, 132, 252, 0.55)",    // purple-400
  glowPink: "rgba(236, 72, 153, 0.45)",       // pink-500
  glowError: "rgba(239, 68, 68, 0.5)",        // red-500

  // Mic icon
  icon: "rgba(255, 255, 255, 0.95)",
};

// ── Noise-like function for organic shape ───────────────────────────────────

function blobRadius(
  angle: number,
  time: number,
  baseRadius: number,
  amplitude: number,
): number {
  // Sum of sines at different frequencies creates organic wobble
  const n1 = Math.sin(angle * 2 + time * 0.9) * 4 * amplitude;
  const n2 = Math.sin(angle * 3 - time * 0.7) * 3 * amplitude;
  const n3 = Math.cos(angle * 1.5 + time * 1.3) * 2.5 * amplitude;
  const n4 = Math.sin(angle * 4 + time * 0.5) * 1.5 * amplitude;
  return baseRadius + n1 + n2 + n3 + n4;
}

// ── States where we animate ─────────────────────────────────────────────────

const ACTIVE_STATES = new Set<VividAgentState>([
  "connecting",
  "ready",
  "listening",
  "processing",
  "speaking",
]);

/**
 * Organic blob-shaped voice orb with purple/pink gradient.
 * Static glow when idle; morphing animation when voice session is active.
 */
export default function BlobOrb({
  state,
  onClick,
  size = "md",
  getAudioLevels,
}: BlobOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const { dimension, baseRadius, iconSize } = SIZE_CONFIG[size];

  const isActive = ACTIVE_STATES.has(state);
  const isError = state === "error";

  // ── Draw a single frame ─────────────────────────────────────────────────

  const drawBlob = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      // Audio volume (0–1) for reactive scaling
      const audioData = getAudioLevels();
      const volume =
        audioData.length > 0
          ? audioData.reduce((a, b) => a + b, 0) / audioData.length / 255
          : 0;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Amplitude: idle = 0.35 (subtle organic shape), active = scales with volume
      const amp = isActive ? 0.6 + volume * 1.2 : 0.35;
      const radiusBoost = isActive ? volume * 6 : 0;
      const effectiveBase = baseRadius + radiusBoost;

      // ── 1. Outer glow halo ───────────────────────────────────────────

      const glowRadius = effectiveBase + 14;
      const glowGrad = ctx.createRadialGradient(cx, cy, effectiveBase * 0.5, cx, cy, glowRadius);

      if (isError) {
        glowGrad.addColorStop(0, "rgba(239, 68, 68, 0.3)");
        glowGrad.addColorStop(0.6, "rgba(239, 68, 68, 0.12)");
        glowGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
      } else {
        const glowAlpha = isActive ? 0.35 + volume * 0.3 : 0.2;
        glowGrad.addColorStop(0, `rgba(168, 85, 247, ${glowAlpha})`);
        glowGrad.addColorStop(0.5, `rgba(192, 132, 252, ${glowAlpha * 0.5})`);
        glowGrad.addColorStop(1, "rgba(192, 132, 252, 0)");
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // ── 2. Blob shape path ───────────────────────────────────────────

      const N = 8; // number of anchor points
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2;
        const r = blobRadius(angle, t, effectiveBase, amp);
        points.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }

      // Smooth closed path using midpoints + quadratic curves
      ctx.beginPath();
      const firstMid = {
        x: (points[0].x + points[N - 1].x) / 2,
        y: (points[0].y + points[N - 1].y) / 2,
      };
      ctx.moveTo(firstMid.x, firstMid.y);

      for (let i = 0; i < N; i++) {
        const next = points[(i + 1) % N];
        const midX = (points[i].x + next.x) / 2;
        const midY = (points[i].y + next.y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }

      ctx.closePath();

      // ── 3. Fill with gradient ────────────────────────────────────────

      const fillGrad = ctx.createRadialGradient(
        cx - effectiveBase * 0.2,
        cy - effectiveBase * 0.2,
        effectiveBase * 0.1,
        cx,
        cy,
        effectiveBase * 1.2,
      );

      if (isError) {
        fillGrad.addColorStop(0, "rgba(254, 100, 100, 0.95)");
        fillGrad.addColorStop(0.7, "rgba(220, 50, 50, 0.9)");
        fillGrad.addColorStop(1, "rgba(180, 30, 30, 0.85)");
      } else {
        const { centerViolet: cv, edgePurple: ep, activePink: ap } = COLORS;
        // Base: violet center → purple edge. Active: blend pink into mid/edge
        const pinkBlend = isActive ? Math.min(volume * 1.5, 0.7) : 0.15;

        fillGrad.addColorStop(
          0,
          `rgba(${cv.r}, ${cv.g}, ${cv.b}, 0.95)`,
        );
        fillGrad.addColorStop(
          0.5,
          `rgba(${Math.round(ep.r + (ap.r - ep.r) * pinkBlend)}, ${Math.round(
            ep.g + (ap.g - ep.g) * pinkBlend,
          )}, ${Math.round(ep.b + (ap.b - ep.b) * pinkBlend)}, 0.92)`,
        );
        fillGrad.addColorStop(
          1,
          `rgba(${Math.round(ep.r + (ap.r - ep.r) * pinkBlend * 0.6)}, ${Math.round(
            ep.g + (ap.g - ep.g) * pinkBlend * 0.6,
          )}, ${Math.round(ep.b + (ap.b - ep.b) * pinkBlend * 0.6)}, 0.88)`,
        );
      }

      // Shadow glow behind blob
      ctx.save();
      ctx.shadowBlur = 20 + (isActive ? volume * 15 : 0);
      ctx.shadowColor = isError ? COLORS.glowError : COLORS.glowPurple;
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.restore();

      // Lighter additive inner highlight
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const highlight = ctx.createRadialGradient(
        cx - effectiveBase * 0.15,
        cy - effectiveBase * 0.25,
        0,
        cx,
        cy,
        effectiveBase * 0.8,
      );
      highlight.addColorStop(0, `rgba(255, 255, 255, ${isActive ? 0.12 + volume * 0.1 : 0.08})`);
      highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlight;
      ctx.fill();
      ctx.restore();
    },
    [baseRadius, isActive, isError, getAudioLevels],
  );

  // ── Canvas setup & animation loop ───────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = dimension;
    const h = dimension;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    if (isActive) {
      // Animated loop when voice session is running
      const animate = () => {
        timeRef.current += 0.025;
        drawBlob(ctx, w, h, timeRef.current);
        requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
    } else {
      // Static draw when idle — organic shape frozen in time
      drawBlob(ctx, w, h, 0);
    }

    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [dimension, isActive, drawBlob]);

  return (
    <div
      className="relative cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 select-none"
      onClick={onClick}
      style={{
        width: dimension,
        height: dimension,
        pointerEvents: state === "connecting" ? "none" : "auto",
        opacity: state === "connecting" ? 0.7 : 1,
      }}
    >
      {/* Canvas: blob shape + glow */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ width: dimension, height: dimension }}
      />

      {/* Mic icon overlay (centered on top of canvas) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ color: COLORS.icon }}
      >
        <Icon
          icon={
            state === "error"
              ? "ph:warning-circle-fill"
              : state === "speaking"
                ? "ph:speaker-simple-high-fill"
                : state === "processing"
                  ? "ph:circle-notch-bold"
                  : "ph:microphone-fill"
          }
          height={iconSize}
          className={state === "processing" ? "animate-spin" : ""}
        />
      </div>
    </div>
  );
}
