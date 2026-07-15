/**
 * Pool §1 filter set (beyond category chips).
 * category remains in FilterChips; this row is content type / provenance /
 * persona / season / freshness.
 */
import { cn } from "../lib/utils";

export type PoolFilterState = {
  content_type: string;
  provenance: string;
  persona: string;
  season: string;
  freshness: string;
};

export const EMPTY_POOL_FILTERS: PoolFilterState = {
  content_type: "",
  provenance: "",
  persona: "",
  season: "",
  freshness: "",
};

const CONTENT_TYPES = [
  { value: "", label: "Any type" },
  { value: "product", label: "Product" },
  { value: "venue", label: "Venue" },
  { value: "experience", label: "Experience" },
  { value: "recipe", label: "Recipe" },
  { value: "entertainment", label: "Entertainment" },
  { value: "guide", label: "Guide" },
];

const PROVENANCE = [
  { value: "", label: "Any source" },
  { value: "assistant_manual", label: "Assistant manual" },
  { value: "trend_radar", label: "Trend radar" },
  { value: "scrape", label: "Scrape" },
];

const SEASONS = [
  { value: "", label: "Any season" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
  { value: "christmas", label: "Christmas" },
  { value: "back_to_school", label: "Back to school" },
];

const FRESHNESS = [
  { value: "", label: "Any age" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "chip px-3 py-1.5 text-[12px]",
              value === opt.value ? "chip-active" : undefined,
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PoolFilters({
  value,
  onChange,
}: {
  value: PoolFilterState;
  onChange: (next: PoolFilterState) => void;
}) {
  function set<K extends keyof PoolFilterState>(key: K, next: PoolFilterState[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="mt-4 space-y-4 border border-[var(--bb-rule)] bg-[var(--bb-hover)] p-4">
      <div className="label">Pool filters</div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChipSelect
          label="Content type"
          value={value.content_type}
          options={CONTENT_TYPES}
          onChange={(v) => set("content_type", v)}
        />
        <ChipSelect
          label="Provenance"
          value={value.provenance}
          options={PROVENANCE}
          onChange={(v) => set("provenance", v)}
        />
        <ChipSelect
          label="Season"
          value={value.season}
          options={SEASONS}
          onChange={(v) => set("season", v)}
        />
        <ChipSelect
          label="Freshness"
          value={value.freshness}
          options={FRESHNESS}
          onChange={(v) => set("freshness", v)}
        />
      </div>
      <div>
        <div className="label">Persona</div>
        <p className="mt-1 text-[11px] text-[var(--bb-muted)]">
          Filters by tag match (persona slugs on the item). Leave blank for any.
        </p>
        <input
          className="field mt-2 max-w-md"
          value={value.persona}
          onChange={(event) => set("persona", event.target.value.trim())}
          placeholder="e.g. quiet-luxury-home-cook"
        />
      </div>
    </div>
  );
}
