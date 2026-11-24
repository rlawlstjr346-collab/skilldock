"use client";

import React, { useEffect, useRef } from "react";
import { LayersIcon, PlusIcon } from "./Icons";

export interface FlyParticle {
  id: number;
  label: string;
  isPreset?: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface FlyToCartLayerProps {
  particles: FlyParticle[];
  onComplete: (id: number) => void;
}

const FLIGHT_DURATION_MS = 460;

function FlyingChip({
  particle,
  onComplete,
}: {
  particle: FlyParticle;
  onComplete: (id: number) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete(particle.id);
    };

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish();
      return;
    }

    const { startX, startY, endX, endY } = particle;
    // Control point lifts upward to create a crisp parabolic arc into the bottom-right cart
    const controlX = (startX + endX) * 0.5 + (endX >= startX ? 30 : -30);
    const controlY =
      Math.min(startY, endY) -
      Math.max(96, Math.min(210, Math.abs(endX - startX) * 0.28 + 80));

    let rafId = 0;
    const t0 = performance.now();

    const step = (now: number) => {
      const rawT = Math.min(1, (now - t0) / FLIGHT_DURATION_MS);
      // Smooth cubic acceleration into the cart at landing
      const t =
        rawT < 0.5
          ? 2 * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      const inv = 1 - t;
      const x = inv * inv * startX + 2 * inv * t * controlX + t * t * endX;
      const y = inv * inv * startY + 2 * inv * t * controlY + t * t * endY;

      // scale: 1 -> 1.08 (lift peak at 0.25) -> 0.2 (absorbed at 1.0)
      const scale =
        rawT <= 0.25
          ? 1 + (rawT / 0.25) * 0.08
          : 1.08 - ((rawT - 0.25) / 0.75) * 0.88;

      // opacity: 1 -> 0.85 (at 0.65) -> 0.1 (at 1.0)
      const opacity =
        rawT <= 0.65
          ? 1 - (rawT / 0.65) * 0.15
          : 0.85 - ((rawT - 0.65) / 0.35) * 0.75;

      const node = elRef.current;
      if (node) {
        node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        node.style.opacity = opacity.toFixed(3);
      }

      if (rawT < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        finish();
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [particle, onComplete]);

  return (
    <div
      ref={elRef}
      style={{
        transform: `translate3d(${particle.startX}px, ${particle.startY}px, 0) translate(-50%, -50%) scale(1)`,
        opacity: 1,
      }}
      className={`fixed top-0 left-0 z-[70] pointer-events-none inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold shadow-lg border will-change-transform ${
        particle.isPreset
          ? "bg-[#181D27] text-[#F9FAFB] border-[#334155]"
          : "bg-[#111827] text-white border-[#374151]"
      }`}
    >
      {particle.isPreset ? (
        <LayersIcon className="w-3.5 h-3.5 text-[#34D399]" />
      ) : (
        <PlusIcon className="w-3.5 h-3.5 text-[#34D399]" />
      )}
      <span className="max-w-[160px] truncate">{particle.label}</span>
    </div>
  );
}

export function FlyToCartLayer({ particles, onComplete }: FlyToCartLayerProps) {
  if (particles.length === 0) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[70] pointer-events-none overflow-hidden"
    >
      {particles.map((p) => (
        <FlyingChip key={p.id} particle={p} onComplete={onComplete} />
      ))}
    </div>
  );
}
