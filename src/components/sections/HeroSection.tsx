"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils";

import { features, iconBg, iconText, marqueeItems } from "./HeroContent";

/** One seamless marquee list — items carry their own trailing gap. */
function MarqueeList({ copy }: { copy: number }) {
  return (
    <ul aria-hidden={copy === 1} className="flex items-center whitespace-nowrap">
      {marqueeItems.map((item) => (
        <li
          key={`${copy}-${item}`}
          className="mr-8 flex items-center gap-3 text-sm font-medium tracking-tight text-slate-400 md:text-base"
        >
          {item}
          <span aria-hidden="true" className="text-cyan-400/60">
            •
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Homepage hero + visual foundation bands:
 * 1. Hero — min-h-screen, 3-color animated mesh, cursor spotlight,
 *    centered copy stack, animated metrics
 * 2. Bento features — six glass 3D-tilt cards, framer-motion staggered reveals
 * 3. Marquee — two rows, opposite directions, CSS-only
 */
export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  // Spotlight: feed pointer coordinates to CSS custom properties (rAF).
  // CSS moves a pre-rendered glow with translate3d — no gradients redrawn.
  // Disabled where there is no fine pointer (mobile).
  useEffect(() => {
    const el = heroRef.current;
    if (!el) {
      return;
    }
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${(event.clientX - rect.left).toFixed(1)}px`);
        el.style.setProperty("--spot-y", `${(event.clientY - rect.top).toFixed(1)}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {/* ---------------------------------------------------------- */}
      {/* Hero                                                        */}
      {/* ---------------------------------------------------------- */}
      <section
        ref={heroRef}
        className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden px-6 pb-16 pt-28"
      >
        {/* Animated mesh gradient — blue-600/20, purple-600/20, cyan-600/20 */}
        <div aria-hidden="true" className="absolute inset-0 z-0">
          <div className="mesh-blob mesh-a left-[5%] top-[-15%] h-[36rem] w-[36rem]" />
          <div className="mesh-blob mesh-b right-[0%] top-[10%] h-[32rem] w-[32rem]" />
          <div className="mesh-blob mesh-c bottom-[-20%] left-[30%] h-[30rem] w-[30rem]" />
          <div className="grid-fade absolute inset-0" />
          <div className="noise absolute inset-0" />
          {/* Mouse-follow radial spotlight */}
          <div className="spotlight-glow" />
        </div>

        {/* Centered content stack */}
        <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <Badge tone="slate" className="rise rise-1 backdrop-blur-xl">
            ⚖️ AI-Powered Legal Intelligence
          </Badge>

          <h1 className="rise rise-2 text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            Don&apos;t just read your contract.
            <br />
            <span className="text-bc">Interrogate it.</span>
          </h1>

          <p className="rise rise-3 max-w-2xl text-base leading-relaxed text-slate-400 md:text-lg">
            Upload any legal document — contract, lease, NDA, or terms of service. GenAI surfaces
            the clauses that matter, maps your risks and obligations from both sides of the table,
            and returns a risk heatmap, what-if simulations, and ready-to-use action kits.
          </p>

          <div className="rise rise-4 flex flex-wrap items-center justify-center gap-4">
            <Button href="#analyze" size="lg">
              Analyze Document Now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Animated metrics row — counters count up on scroll */}
          <div className="rise rise-5 mt-6 flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:gap-0">
            <Metric value={10} label="GenAI prompt chains" tone="blue" className="sm:px-8" />
            <span aria-hidden="true" className="hidden h-10 w-px bg-white/10 sm:block" />
            <Metric value={6} label="Analysis Modes" tone="cyan" className="sm:px-8" />
            <span aria-hidden="true" className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="flex flex-col items-center gap-1 sm:px-8">
              <div className="text-2xl font-semibold tracking-tight text-emerald-300 drop-shadow-[0_0_18px_rgba(16,185,129,0.35)] md:text-3xl">
                Indian Law Aware
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Constitutional + statutory corpus
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Bento features — 3D tilt cards + staggered scroll reveals    */}
      {/* ---------------------------------------------------------- */}
      <section id="features" className="relative mx-auto w-full max-w-6xl px-6 py-28">
        <SectionHeader
          eyebrow="The Toolkit"
          title={
            <>
              Interrogate from <span className="text-bc">every angle</span>
            </>
          }
          description="Six GenAI instruments that red-team, simulate, simplify, operationalise, compare, and negotiate any legal document."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.id}
                delay={index * 0.1}
                className={cn("h-full", feature.span)}
              >
                <Card accent={feature.accent} className="h-full gap-5">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl border",
                      iconBg[feature.accent],
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5", iconText[feature.accent])}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-100">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Marquee — two rows, opposite directions, CSS-only            */}
      {/* ---------------------------------------------------------- */}
      <section
        id="marquee"
        aria-label="Agreement types NyayaLens reads"
        className="relative border-y border-white/5 bg-white/[0.02] py-10"
      >
        <div className="marquee-mask overflow-hidden">
          <div className="marquee-track">
            <MarqueeList copy={0} />
            <MarqueeList copy={1} />
          </div>
        </div>
        <div className="marquee-mask mt-6 overflow-hidden" aria-hidden="true">
          <div className="marquee-track-reverse">
            <MarqueeList copy={0} />
            <MarqueeList copy={1} />
          </div>
        </div>
      </section>
    </>
  );
}
