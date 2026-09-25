import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Optional call to action (button/link). */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * Helpful placeholder for "no data yet" — never a blank panel.
 */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col items-center gap-3 border-dashed px-8 py-12 text-center",
        className,
      )}
    >
      {icon !== undefined ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-semibold tracking-tight text-slate-200">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">{description}</p>
      {action !== undefined ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
