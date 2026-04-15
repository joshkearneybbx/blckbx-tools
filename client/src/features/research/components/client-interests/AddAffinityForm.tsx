import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchBrands } from "../../lib/api";
import type { BrandOption } from "../../lib/types";

export function AddAffinityForm({
  onSubmit,
  duplicateMessage,
}: {
  onSubmit: (payload: { brand: BrandOption; note: string }) => Promise<void>;
  duplicateMessage?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrandOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!query.trim() || selectedBrand?.name === query.trim()) {
      setResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        setResults(await searchBrands(query, 10));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, selectedBrand]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const showNotFound = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return Boolean(normalized) && !isLoading && !results.some((brand) => brand.name.toLowerCase() === normalized);
  }, [isLoading, query, results]);

  const handleAdd = async () => {
    if (!selectedBrand) return;
    setIsSaving(true);
    try {
      await onSubmit({ brand: selectedBrand, note });
      setSelectedBrand(null);
      setQuery("");
      setNote("");
      setResults([]);
      setSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="panel p-4">
      <div className="label mb-3 block">Add Brand Affinity</div>
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedBrand(null);
            }}
            placeholder="Search brands..."
            className="field h-11 pl-10"
          />
          {(results.length > 0 || showNotFound || isLoading) && !selectedBrand ? (
            <div className="menu-panel absolute left-0 right-0 top-[calc(100%+6px)] z-20">
              {isLoading ? <div className="px-3 py-3 text-sm text-[var(--muted)]">Searching brands...</div> : null}
              {results.map((brand) => (
                <button
                  key={brand._key}
                  type="button"
                  onClick={() => {
                    setSelectedBrand(brand);
                    setQuery(brand.name);
                    setResults([]);
                  }}
                  className="flex w-full items-center justify-between border-b border-[var(--border)] px-3 py-3 text-left text-sm hover:bg-[var(--sand-100)] last:border-b-0"
                >
                  <span>{brand.name}</span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    {brand.tier?.replace(/_/g, " ") || "brand"}
                  </span>
                </button>
              ))}
              {showNotFound ? (
                <div className="px-3 py-3 text-sm text-[var(--muted)]">
                  Brand not found — ask Kath to add it
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          placeholder="Add context (optional)..."
          rows={2}
          className="field min-h-20"
        />

        {duplicateMessage ? <div className="text-sm text-[var(--error)]">{duplicateMessage}</div> : null}
        {success ? <div className="text-sm text-[#1ea868]">Brand affinity added</div> : null}

        <button
          type="button"
          disabled={!selectedBrand || isSaving}
          onClick={handleAdd}
          className="inline-flex items-center justify-center border border-[#E7C51C] bg-[#E7C51C] px-4 py-2 text-sm font-medium text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Adding..." : "Add Brand"}
        </button>
      </div>
    </div>
  );
}
