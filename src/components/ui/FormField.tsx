import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  /** Render the input/textarea/select control(s) here. */
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * Label + control + hint/error scaffold for Phase-2 analysis forms.
 * Purely structural — state and validation live in the route handlers later.
 */
export function FormField({
  id,
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium tracking-tight text-slate-200"
      >
        {label}
        {required ? <span className="ml-1 text-rose-400">*</span> : null}
      </label>
      {children}
      {error !== undefined ? (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/** Shared class string for glass text controls (for use inside FormField children). */
export const inputClassName =
  "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 backdrop-blur-xl placeholder:text-slate-500 transition-colors focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/25";
