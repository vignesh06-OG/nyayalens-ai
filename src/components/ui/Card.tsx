"use client";

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type CardAccent = "blue" | "purple" | "cyan" | "amber" | "emerald" | "rose";

type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Pointer-driven 3D tilt (rotateX/rotateY from cursor, max 5deg). */
  tilt?: boolean;
  /** Accent-colored glow border on hover. */
  glow?: boolean;
  /** Accent used for the hover glow. */
  accent?: CardAccent;
  padding?: CardPadding;
}

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const accentHover: Record<CardAccent, string> = {
  blue: "hover:shadow-neon-blue hover:border-blue-400/35",
  purple: "hover:shadow-neon-purple hover:border-purple-400/35",
  cyan: "hover:shadow-neon-cyan hover:border-cyan-400/35",
  amber: "hover:shadow-neon-amber hover:border-amber-400/35",
  emerald: "hover:shadow-neon-emerald hover:border-emerald-400/35",
  rose: "hover:shadow-neon-rose hover:border-rose-400/35",
};

/** Max tilt in degrees (spec: rotateX/rotateY based on mouse position, max 5deg). */
const MAX_TILT_DEG = 5;

/**
 * Glassmorphism card with a CSS-perspective 3D tilt.
 * JS only feeds rotation custom properties (rAF-throttled); the transform
 * itself is CSS (`.tilt-inner`, transition transform 0.3s ease).
 * Tilt is inert on touch and under prefers-reduced-motion.
 */
export function Card({
  children,
  className,
  tilt = true,
  glow = true,
  accent = "blue",
  padding = "md",
}: CardProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!tilt || event.pointerType !== "mouse") {
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const inner = innerRef.current;
        if (!inner) {
          return;
        }
        const rotateY = (px - 0.5) * 2 * MAX_TILT_DEG;
        const rotateX = (0.5 - py) * 2 * MAX_TILT_DEG;
        inner.style.setProperty("--rx", `${rotateX.toFixed(2)}deg`);
        inner.style.setProperty("--ry", `${rotateY.toFixed(2)}deg`);
      });
    },
    [tilt],
  );

  const handlePointerLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const inner = innerRef.current;
    if (inner) {
      inner.style.setProperty("--rx", "0deg");
      inner.style.setProperty("--ry", "0deg");
    }
  }, []);

  return (
    <div
      className={cn("group relative h-full", tilt && "tilt")}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        ref={innerRef}
        className={cn(
          "tilt-inner relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
          glow && accentHover[accent],
          paddings[padding],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
