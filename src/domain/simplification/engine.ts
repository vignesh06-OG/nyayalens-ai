import { splitSentences } from "../analysis/engine";
import type {
  Jurisdiction,
  LexicalReplacement,
  ReadabilityLevel,
  ReadabilityScore,
  SimplifiedText,
} from "./types";

/* ------------------------------------------------------------------ */
/* Static simplification dictionary (longest phrases first)            */
/* ------------------------------------------------------------------ */

export const SIMPLIFICATION_DICTIONARY: ReadonlyArray<{ from: string; to: string }> = [
  { from: "hereinafter referred to as", to: "called" },
  { from: "shall be entitled to", to: "can" },
  { from: "shall be obligated to", to: "must" },
  { from: "in accordance with", to: "under" },
  { from: "in the event that", to: "if" },
  { from: "in the event of", to: "if" },
  { from: "in consideration of", to: "for" },
  { from: "with respect to", to: "about" },
  { from: "subject to the terms of", to: "under" },
  { from: "provided that", to: "if" },
  { from: "prior to", to: "before" },
  { from: "subsequent to", to: "after" },
  { from: "pursuant to", to: "under" },
  { from: "notwithstanding", to: "despite" },
  { from: "including but not limited to", to: "including" },
  { from: "at its sole discretion", to: "whenever it chooses" },
  { from: "hold harmless", to: "protect from claims" },
  { from: "hereinafter", to: "below" },
  { from: "hereunder", to: "under this agreement" },
  { from: "thereof", to: "of it" },
  { from: "therein", to: "in it" },
  { from: "herein", to: "here" },
  { from: "whereas", to: "since" },
  { from: "shall", to: "must" },
];

/* ------------------------------------------------------------------ */
/* Jurisdiction detection                                              */
/* ------------------------------------------------------------------ */

interface JurisdictionSignals {
  code: string;
  label: string;
  signals: readonly string[];
}

const JURISDICTION_SIGNALS: readonly JurisdictionSignals[] = [
  {
    code: "IN",
    label: "India",
    signals: [
      "indian contract act",
      "1872",
      "indian stamp act",
      "rent control act",
      "specific relief act",
      "arbitration and conciliation act",
      "consumer protection act",
      "code of civil procedure",
      "bharatiya nyaya",
      "gst",
      "inr",
      "₹",
      "mumbai",
      "maharashtra",
      "delhi",
      "bangalore",
      "bengaluru",
      "chennai",
      "kolkata",
      "india",
    ],
  },
  {
    code: "US-DE",
    label: "United States (Delaware)",
    signals: ["delaware", "state of delaware", "del. code"],
  },
  {
    code: "US-CA",
    label: "United States (California)",
    signals: ["california", "state of california", "cal. civ"],
  },
  {
    code: "GB",
    label: "England & Wales",
    signals: ["england and wales", "english law", "united kingdom", "hmrc", "uk law"],
  },
  {
    code: "SG",
    label: "Singapore",
    signals: ["singapore", "companies act (cap", "sghc", "siac"],
  },
];

/** Detect the governing-law footprint of a legal text. Pure and offline. */
export function detectJurisdiction(text: string): Jurisdiction {
  const lower = text.toLowerCase();

  let best: Jurisdiction | null = null;
  let bestScore = 0;

  for (const entry of JURISDICTION_SIGNALS) {
    const hits = entry.signals.filter((s) => lower.includes(s));
    if (hits.length > bestScore) {
      bestScore = hits.length;
      best = {
        code: entry.code,
        label: entry.label,
        confidence: Math.min(0.95, 0.35 + 0.15 * hits.length),
        signals: hits.slice(0, 5),
      };
    }
  }

  return best ?? { code: "unknown", label: "Unknown / unstated", confidence: 0, signals: [] };
}

/* ------------------------------------------------------------------ */
/* Readability                                                         */
/* ------------------------------------------------------------------ */

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) {
    return 0;
  }
  const groups = cleaned.replace(/[^aeiouy]+/g, "").length;
  const silentE = cleaned.length > 3 && cleaned.endsWith("e") ? 1 : 0;
  return Math.max(1, groups - silentE);
}

function levelForGrade(grade: number): ReadabilityLevel {
  if (grade < 8) {
    return "simple";
  }
  if (grade < 12) {
    return "standard";
  }
  if (grade < 16) {
    return "dense";
  }
  return "opaque";
}

/** Flesch-Kincaid readability of a text. Deterministic. */
export function assessReadability(text: string): ReadabilityScore {
  const sentences = splitSentences(text).filter((s) => /[a-z]/i.test(s));
  const words = text.match(/[a-z][a-z'-]*/gi) ?? [];

  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  const fleschReadingEase =
    Math.round((206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord) * 100) / 100;
  const fleschKincaidGrade =
    Math.round((0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59) * 100) / 100;

  const clampedGrade = Math.max(0, fleschKincaidGrade);

  return {
    fleschReadingEase,
    fleschKincaidGrade: clampedGrade,
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    level: levelForGrade(clampedGrade),
  };
}

/* ------------------------------------------------------------------ */
/* Simplification                                                      */
/* ------------------------------------------------------------------ */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyDictionary(text: string, replacements: LexicalReplacement[]): string {
  let output = text;
  for (const entry of SIMPLIFICATION_DICTIONARY) {
    const pattern = new RegExp(`\\b${escapeRegExp(entry.from)}\\b`, "gi");
    if (pattern.test(output)) {
      output = output.replace(pattern, entry.to);
      if (!replacements.some((r) => r.from === entry.from && r.to === entry.to)) {
        replacements.push({ from: entry.from, to: entry.to });
      }
    }
  }
  return output;
}

const LONG_SENTENCE_WORDS = 28;

function splitLongSentences(text: string): string {
  return splitSentences(text)
    .map((sentence) => {
      const wordCount = (sentence.match(/[a-z][a-z'-]*/gi) ?? []).length;
      if (wordCount <= LONG_SENTENCE_WORDS) {
        return sentence;
      }
      return sentence
        .replace(/,\s*which\s+/gi, ". It ")
        .replace(/;\s*/g, ". ")
        .replace(/,\s*and\s+/g, ". ");
    })
    .join(" ");
}

/**
 * Deterministic plain-language rewrite toward a target grade level.
 * Delegates nuance to the AI layer; this is the always-available floor.
 */
export function simplifyText(text: string, targetLevel: number): SimplifiedText {
  const replacements: LexicalReplacement[] = [];

  let simplified = applyDictionary(text, replacements);

  if (assessReadability(simplified).fleschKincaidGrade > targetLevel) {
    simplified = splitLongSentences(simplified);
  }
  if (assessReadability(simplified).fleschKincaidGrade > targetLevel + 2) {
    simplified = applyDictionary(simplified.replace(/\bprovided that\b/gi, "if"), replacements);
    simplified = splitLongSentences(simplified);
  }

  simplified = simplified.replace(/\s{2,}/g, " ").trim();

  return {
    original: text,
    simplified,
    targetLevel,
    estimatedGrade: assessReadability(simplified).fleschKincaidGrade,
    replacements,
  };
}
