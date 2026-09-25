import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

/**
 * Section title block with a framer-motion scroll reveal (via `Reveal`).
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow !== undefined ? (
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-frost md:text-5xl">
        {title}
      </h2>
      {description !== undefined ? (
        <p className="max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
