/** Decode common entities so pre-escaped recipe text is not double-escaped. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'");
}

/**
 * Display-only title cleanup: decode entities and strip trailing {...} / [...] segments.
 * Does not mutate stored recipe titles.
 */
export function formatDisplayTitle(value: string): string {
  let title = decodeHtmlEntities(String(value ?? "")).trim();
  // Strip one or more trailing brace/bracket segments (e.g. "{One Pot Recipe}", "[video]")
  let previous = "";
  while (title !== previous) {
    previous = title;
    title = title
      .replace(/\s*\{[^{}]*\}\s*$/, "")
      .replace(/\s*\[[^[\]]*\]\s*$/, "")
      .trim();
  }
  return title || "Untitled recipe";
}
