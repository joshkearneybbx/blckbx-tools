const FRACTION_MAP: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
};

const FRACTION_CHARS = Object.keys(FRACTION_MAP).join("");
const COMBINED_PATTERN = new RegExp(`(\\d+)\\s*([${FRACTION_CHARS}])`, "g");
const SINGLE_PATTERN = new RegExp(`[${FRACTION_CHARS}]`, "g");

export function sanitizePdfText(value: unknown): string {
  const input = String(value ?? "");

  return input
    .replace(COMBINED_PATTERN, (_, whole: string, fraction: string) => `${whole} ${FRACTION_MAP[fraction] ?? fraction}`)
    .replace(SINGLE_PATTERN, (fraction) => FRACTION_MAP[fraction] ?? fraction)
    .replace(/\s{2,}/g, " ")
    .trim();
}
