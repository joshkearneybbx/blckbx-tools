import { parseFlags } from "../lib/flag-parser";

interface IGFlagChipsProps {
  text: string;
  clearedFlags: string[];
  onClear: (flagText: string) => void;
}

export default function IGFlagChips({ text, clearedFlags, onClear }: IGFlagChipsProps) {
  const clearedSet = new Set(clearedFlags);
  const renderedFlags = Array.from(new Set(
    parseFlags(text)
      .map((flag) => flag.text)
      .filter((flagText) => !clearedSet.has(flagText)),
  ));

  if (renderedFlags.length === 0) {
    return null;
  }

  return (
    <div className="ch-ig-flag-chip-list">
      {renderedFlags.map((flagText) => (
        <div key={flagText} className="ch-ig-flag-chip">
          <span className="ch-ig-flag-chip-icon" aria-hidden="true">!</span>
          <span className="ch-ig-flag-chip-text">&ldquo;{flagText}&rdquo;</span>
          <button
            type="button"
            onClick={() => onClear(flagText)}
            className="ch-ig-flag-chip-dismiss"
            aria-label={`Clear verification flag for ${flagText}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
