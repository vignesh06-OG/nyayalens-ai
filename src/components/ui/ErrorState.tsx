"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Invoked by the Retry button (omitting it hides the button). */
  onRetry?: () => void;
  className?: string;
}

/**
 * Accessible error block (role="alert") with an optional Retry action.
 */
export function ErrorState({ title = "Something went wrong", message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "neon-ring-rose glass flex flex-col items-center gap-3 px-8 py-10 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold tracking-tight text-rose-100">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-rose-200/90">{message}</p>
      {onRetry !== undefined ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
