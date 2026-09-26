import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders an anchor when provided. */
  href?: string;
  type?: "button" | "submit" | "reset";
  /** Click handler (button mode only — client components). */
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-neon-blue hover:shadow-neon-blue-hover hover:brightness-110",
  secondary:
    "border border-white/10 bg-white/5 text-slate-100 backdrop-blur-xl hover:border-white/25 hover:bg-white/10 hover:shadow-[0_0_24px_-8px_rgba(148,163,184,0.5)]",
  ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
  danger:
    "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-neon-rose hover:shadow-[0_0_0_1px_rgba(251,207,232,0.45)inset,0_16px_52px_-12px_rgba(244,63,94,0.75)] hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

/**
 * Button / anchor with the NyayaLens neon-glow treatment.
 * Server-safe: no hooks, no handlers.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  onClick,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href !== undefined) {
    return (
      <a href={href} className={classes} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
