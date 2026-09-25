"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/Skeleton";
import type { AnalysisSectionResult } from "./AdversarialAnalysis";

/**
 * Engine workbench — typed parent of the five interactive sections.
 * Sections are client-side code-split (server-side dynamic() would not split)
 * while still SSR-rendering their copy; spacers prevent CLS while chunks load.
 */
const AdversarialAnalysisSection = dynamic(() => import("./AdversarialAnalysis"), {
  loading: () => <Skeleton className="mx-auto my-24 h-96 max-w-6xl" />,
});
const ScenarioSimulatorSection = dynamic(() => import("./ScenarioSimulator"), {
  loading: () => <Skeleton className="mx-auto my-24 h-64 max-w-6xl" />,
});
const PlainLanguageSection = dynamic(() => import("./PlainLanguage"), {
  loading: () => <Skeleton className="mx-auto my-24 h-64 max-w-6xl" />,
});
const ActionKitSection = dynamic(() => import("./ActionKit"), {
  loading: () => <Skeleton className="mx-auto my-24 h-64 max-w-6xl" />,
});
const ComparatorSection = dynamic(() => import("./Comparator"), {
  loading: () => <Skeleton className="mx-auto my-24 h-64 max-w-6xl" />,
});

/**
 * Lifts the adversarial analysis result so the Action Kit can build from it
 * and the Simulator can run against the registered contract id.
 */
export default function Workspace() {
  const [analysis, setAnalysis] = useState<AnalysisSectionResult | null>(null);

  const onAnalysisComplete = useCallback((result: AnalysisSectionResult) => {
    setAnalysis(result);
  }, []);

  return (
    <div className="relative">
      <div aria-hidden="true" className="mesh-blob mesh-a left-[8%] top-[12%] h-72 w-72 opacity-60" />
      <div aria-hidden="true" className="mesh-blob mesh-c right-[5%] top-[45%] h-72 w-72 opacity-60" />

      <AdversarialAnalysisSection documentType="rental" onAnalysisComplete={onAnalysisComplete} />
      <ScenarioSimulatorSection
        contractId={analysis?.contractId ?? null}
        contractTitle={analysis?.clauses[0]?.title ?? undefined}
      />
      <PlainLanguageSection />
      <ActionKitSection analysis={analysis} />
      <ComparatorSection />
    </div>
  );
}
