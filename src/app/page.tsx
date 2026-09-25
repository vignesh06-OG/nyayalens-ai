import dynamic from "next/dynamic";

/**
 * Homepage — hero + engine workbench (Phases 1–3).
 * Both heavy client islands are deferred so the static shell paints first
 * (spacers preserve layout while islands hydrate — no CLS).
 */
const HeroSection = dynamic(() => import("@/components/sections/HeroSection"), {
  loading: () => <div className="min-h-[85vh]" aria-hidden="true" />,
});

const Workspace = dynamic(() => import("@/components/sections/Workspace"), {
  loading: () => <div className="min-h-[60vh]" aria-hidden="true" />,
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Workspace />
    </>
  );
}
