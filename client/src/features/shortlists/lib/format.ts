export type ParsedRating = {
  /** The numeric rating, e.g. "5". Empty string if not parseable. */
  number: string;
  /** Whether to show a star glyph. True if input contains "*" OR matches "N (M reviews)" pattern. */
  showStar: boolean;
  /** The trailing parenthetical, e.g. "(74 Google reviews)". Empty if absent. */
  reviews: string;
  /** True if input was empty/null/undefined. */
  isEmpty: boolean;
};

/**
 * Parses an autofill-output rating string into structured parts.
 * Handles both "5* (74 Google reviews)" and "5 (74 Google reviews)" forms.
 * Idempotent — returns isEmpty: true for null/undefined/empty input.
 */
export function parseRating(rating: string | null | undefined): ParsedRating {
  if (!rating || !rating.trim()) {
    return { number: '', showStar: false, reviews: '', isEmpty: true };
  }

  const trimmed = rating.trim();
  const match = trimmed.match(/^([\d.]+)\s*(\*?)\s*(\(.+\))?\s*$/);
  if (!match) {
    return { number: trimmed, showStar: false, reviews: '', isEmpty: false };
  }

  const [, number, asterisk, reviews] = match;
  return {
    number,
    showStar: asterisk === '*' || !!reviews,
    reviews: reviews ?? '',
    isEmpty: false,
  };
}

/**
 * Formats rating text for legacy text-only render paths.
 * Uses the U+2605 BLACK STAR via a JavaScript escape to avoid source encoding issues.
 */
export function formatRating(rating: string | null | undefined): string {
  const parsed = parseRating(rating);
  if (parsed.isEmpty) return '';
  const star = parsed.showStar ? '\u2605' : '';
  const reviews = parsed.reviews ? ` ${parsed.reviews}` : '';
  return `${parsed.number}${star}${reviews}`.trim();
}
