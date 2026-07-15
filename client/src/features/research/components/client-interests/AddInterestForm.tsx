import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { createInterestTag, searchInterestTags } from "../../lib/api";
import type { InterestTagOption } from "../../lib/types";

export function AddInterestForm({
  onSubmit,
  duplicateMessage,
}: {
  onSubmit: (payload: { tag: InterestTagOption; strength: number; note: string }) => Promise<void>;
  duplicateMessage?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InterestTagOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<InterestTagOption | null>(null);
  const [strength, setStrength] = useState(0.75);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!query.trim() || selectedTag?.label === query.trim()) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const nextResults = await searchInterestTags(query, 10);
        setResults(nextResults.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, selectedTag]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const showCreate = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return Boolean(normalized) && !results.some((tag) => tag.label.trim().toLowerCase() === normalized);
  }, [query, results]);

  const handleCreate = async () => {
    const label = query.trim();
    if (!label) return;
    const created = await createInterestTag({ label, category: "interest" });
    setSelectedTag(created);
    setQuery(created.label);
    setResults([]);
  };

  const handleAdd = async () => {
    if (!selectedTag) return;
    setIsSaving(true);
    try {
      await onSubmit({ tag: selectedTag, strength, note });
      setSelectedTag(null);
      setQuery("");
      setNote("");
      setStrength(0.75);
      setResults([]);
      setSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="panel p-4">
      <div className="label mb-3 block">Add Interest</div>
      <div className="space-y-4">
        <div className="relative">
          {/* Match ClientSelector: .search-field sets padding-left so icon doesn't overlap text */}
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedTag(null);
            }}
            placeholder="Type to search tags..."
            className="field search-field h-11"
          />
          {(results.length > 0 || showCreate || isLoading) && !selectedTag ? (
            <div className="menu-panel absolute left-0 right-0 top-[calc(100%+6px)] z-20">
              {isLoading ? <div className="px-3 py-3 text-sm text-[var(--muted)]">Searching tags...</div> : null}
              {results.map((tag) => (
                <button
                  key={tag._key}
                  type="button"
                  onClick={() => {
                    setSelectedTag(tag);
                    setQuery(tag.label);
                    setResults([]);
                  }}
                  className="flex w-full items-center justify-between border-b border-[var(--border)] px-3 py-3 text-left text-sm hover:bg-[var(--sand-100)] last:border-b-0"
                >
                  <span>{tag.label}</span>
                  <span className="text-xs text-[var(--muted)]">{tag.category || "interest"}</span>
                </button>
              ))}
              {showCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-[var(--sand-100)]"
                >
                  <Plus className="h-4 w-4" />
                  Create "{query.trim()}"
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--muted)]">Strength</span>
            <span className="font-medium text-[var(--text)]">{strength.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={strength}
            onChange={(event) => setStrength(Number(event.target.value))}
            className="w-full"
            style={{ accentColor: "var(--bb-near-black)" }}
          />
          <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Mentioned</span>
            <span>Passionate</span>
          </div>
        </div>

        <div>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            placeholder="Add context (optional)..."
            rows={2}
            className="field min-h-20"
          />
        </div>

        {duplicateMessage ? <div className="text-sm text-[var(--error)]">{duplicateMessage}</div> : null}
        {success ? <div className="text-sm text-[var(--success)]">Interest added</div> : null}

        <button
          type="button"
          disabled={!selectedTag || isSaving}
          onClick={handleAdd}
          className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Adding..." : "Add Interest"}
        </button>
      </div>
    </div>
  );
}
