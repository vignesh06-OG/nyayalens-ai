"use client";

import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.65, 0.32, 0.9];

/**
 * framer-motion lives in its own async chunk (heavy client component →
 * dynamic import). Before it resolves, children render hidden but present,
 * so server HTML keeps the copy and hydration never flashes.
 */
const MotionDiv = lazy(() =>
  import("framer-motion").then((mod) => ({ default: mod.motion.div })),
);

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds. */
  delay?: number;
}

/**
 * Scroll-triggered fade-in reveal (framer-motion `whileInView`).
 * framer-motion is used for scroll reveals ONLY — all other motion is CSS.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <Suspense
      fallback={
        <div className={cn(className, "reveal-pending")} aria-hidden="true">
          {children}
        </div>
      }
    >
      <MotionDiv
        className={className}
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE, delay }}
      >
        {children}
      </MotionDiv>
    </Suspense>
  );
}
