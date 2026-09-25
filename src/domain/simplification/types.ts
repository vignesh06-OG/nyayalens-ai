/**
 * Engine 03 — plain-language simplification domain model. Pure types only.
 */

export interface Jurisdiction {
  /** ISO-ish code: "IN", "US-DE", "US-CA", "GB", "SG", or "unknown". */
  code: string;
  label: string;
  /** 0..1 */
  confidence: number;
  /** Phrases that triggered the detection. */
  signals: string[];
}

export type ReadabilityLevel = "simple" | "standard" | "dense" | "opaque";

export interface ReadabilityScore {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  level: ReadabilityLevel;
}

export interface LexicalReplacement {
  from: string;
  to: string;
}

export interface SimplifiedText {
  original: string;
  simplified: string;
  targetLevel: number;
  /** Estimated grade level after simplification. */
  estimatedGrade: number;
  replacements: LexicalReplacement[];
}
