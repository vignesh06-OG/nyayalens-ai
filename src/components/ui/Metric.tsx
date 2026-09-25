"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type MetricTone = "blue" | "purple" | "cyan" | "amber" | "emerald" | "rose";

interface MetricProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  tone?: MetricTone;
  className?: string;
}

const toneText: Record<MetricTone, string> = {
  blue: "text-blue-300",
  purple: "text-purple-300",
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
};

const toneGlow: Record<MetricTone, string> = {
  blue: "drop-shadow-[0_0_18px_rgba(59,130,246,0.35)]",
  purple: "drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]",
  cyan: "drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]",
  amber: "drop-shadow-[0_0_18px_rgba(245,158,11,0.35)]",
  emerald: "drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]",
  rose: "drop-shadow-[0_0_18px_rgba(244,63,94,0.35)]",
};

/**
 * Animated counter metric. Counts up once when scrolled into view.
 * Respects prefers-reduced-motion (jumps straight to the final value).
 */
export function Metric({
  value,
  label,
  prefix = "",
  suffix = "",
  tone = "blue",
  className,
}: MetricProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    let rafId = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first || !first.isIntersecting || started) {
          return;
        }
        started = true;
        observer.disconnect();

        const durationMs = 1400;
        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - startTime) / durationMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) {
            rafId = requestAnimationFrame(tick);
          }
        };
        rafId = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [value]);

  return (
    <div ref={ref} className={cn("flex flex-col gap-1", className)}>
      <div className={cn("text-3xl font-semibold tabular-nums tracking-tight md:text-4xl", toneText[tone], toneGlow[tone])}>
        {prefix}
        {display}
        {suffix}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
