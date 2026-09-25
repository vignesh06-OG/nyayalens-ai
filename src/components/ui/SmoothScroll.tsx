"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

/** Minimal surface of a Lenis instance (avoids a static import). */
interface LenisInstance {
  raf(time: number): void;
  destroy(): void;
}

/**
 * Sonner stays out of the first-load graph — toasts are on-demand feedback.
 */
const LazyToaster = dynamic(
  () => import("sonner").then((mod) => ({ default: mod.Toaster })),
  { ssr: false },
);

export function ToasterHost() {
  return <LazyToaster theme="dark" richColors position="bottom-right" closeButton />;
}

/**
 * Hosts Lenis smooth scrolling for the whole document.
 * - Skips when the visitor prefers reduced motion.
 * - Lenis is dynamically imported: smooth scroll is progressive enhancement,
 *   so it never taxes the first-load JS budget.
 */
export function SmoothScroll() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let instance: LenisInstance | null = null;

    void import("lenis")
      .then(({ default: Lenis }) => {
        if (cancelled) {
          return;
        }
        instance = new Lenis({ duration: 1.15, smoothWheel: true });
        const raf = (time: number) => {
          if (instance !== null) {
            instance.raf(time);
          }
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
      })
      .catch(() => {
        // Native scrolling remains perfectly usable without Lenis.
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (instance !== null) {
        instance.destroy();
      }
    };
  }, []);

  return null;
}
