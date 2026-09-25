/**
 * Input sanitisation: strip HTML tags, neutralise control characters,
 * escape special characters, and hard-limit string length.
 */

const HTML_TAG_RE = /<[^>]*>/g;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Order matters: `&` must be escaped first. */
const SPECIAL_REPLACEMENTS: ReadonlyArray<{ pattern: RegExp; to: string }> = [
  { pattern: /&/g, to: "&amp;" },
  { pattern: /</g, to: "&lt;" },
  { pattern: />/g, to: "&gt;" },
  { pattern: /"/g, to: "&quot;" },
  { pattern: /'/g, to: "&#x27;" },
  { pattern: /`/g, to: "&#x60;" },
];

export const DEFAULT_MAX_LENGTH = 50_000;

/** Sanitise a single user-supplied string. Deterministic. */
export function sanitizeText(input: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  const stripped = input.replace(HTML_TAG_RE, " ").replace(CONTROL_RE, "");

  let escaped = stripped;
  for (const replacement of SPECIAL_REPLACEMENTS) {
    escaped = escaped.replace(replacement.pattern, replacement.to);
  }

  return escaped.trim().slice(0, Math.max(0, maxLength));
}
