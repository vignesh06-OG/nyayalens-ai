"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div aria-hidden="true" className="mesh-blob mesh-d left-[20%] top-[10%] h-64 w-64" />
      <div className="neon-ring-rose glass relative z-10 flex flex-col items-center gap-5 px-8 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-400">
          Lens fracture
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-frost">
          Something broke the <span className="font-serif-accent italic text-prism">lens</span>.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-slate-400">
          An unexpected error interrupted this view.
          {error.digest !== undefined ? ` (ref ${error.digest})` : ""}
        </p>
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </section>
  );
}
