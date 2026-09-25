import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names with Tailwind-aware conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Extract the text between two markers of a streaming marked section.
 * Returns "" before `start` arrives; grows as the stream accumulates.
 */
export function sectionAfter(text: string, start: string, end: string | null): string {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) {
    return "";
  }
  const from = startIndex + start.length;
  const endIndex = end !== null ? text.indexOf(end, from) : -1;
  return text.slice(from, endIndex >= 0 ? endIndex : undefined).trim();
}
