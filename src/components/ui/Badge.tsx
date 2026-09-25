import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "blue" | "amber" | "emerald" | "rose" | "slate";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** Render a softly pulsing status dot before the label. */
  dot?: boolean;
  className?: string;
}

const tones: Record<BadgeTone, string> = {
  blue: "border-blue-400/25 bg-blue-500/10 text-blue-300",
  amber: "border-amber-400/25 bg-amber-500/10 text-amber-300",
  emerald: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  rose: "border-rose-400/25 bg-rose-500/10 text-rose-300",
  slate: "border-white/15 bg-white/5 text-slate-300",
};

const dots: Record<BadgeTone, string> = {
  blue: "bg-blue-400",
  amber: "bg-amber-400",
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  slate: "bg-slate-400",
};

/**
 * Pill badge for status, phase, and tone markers.
 */
export function Badge({ children, tone = "slate", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full animate-glow-pulse", dots[tone])} /> : null}
      {children}
    </span>
  );
}
