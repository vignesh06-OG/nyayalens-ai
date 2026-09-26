"use client";

import { useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: readonly TabItem[];
  /** Controlled active tab id. */
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/**
 * shadcn-style tabs without the dependency: ARIA tab pattern with roving
 * tabindex and Left/Right/Home/End keyboard navigation.
 */
export function Tabs({ tabs, value, onChange, label, className }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = tabs.findIndex((t) => t.id === value);
      if (index < 0) {
        return;
      }
      let next = index;
      if (event.key === "ArrowRight") {
        next = (index + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      const target = tabs[next];
      if (target !== undefined) {
        onChange(target.id);
        const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
        buttons?.item(next)?.focus();
      }
    },
    [tabs, value, onChange],
  );

  const active = tabs.find((t) => t.id === value);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl"
      >
        {tabs.map((tab) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                selected
                  ? "bg-blue-500/20 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active !== undefined ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.id}`}
          aria-labelledby={`${baseId}-tab-${active.id}`}
          tabIndex={0}
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
