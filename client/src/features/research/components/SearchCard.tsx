import { useEffect, useMemo, useState } from "react";
import { FilterChips } from "./FilterChips";
import { ResultCard } from "./ResultCard";
import { fetchRecommendations } from "../lib/api";
import { Category, Recommendation } from "../lib/types";

const PAGE_SIZE = 12;
const SUBCATEGORY_MAP: Record<string, Array<{ slug: string; label: string }>> = {
  going_out: [
    { slug: "restaurants_and_bars", label: "Restaurants & Bars" },
    { slug: "events_and_experiences", label: "Events & Experiences" },
    { slug: "culture", label: "Culture" },
    { slug: "local_walks_and_day_trips", label: "Local Walks & Day Trips" },
  ],
  staying_in: [
    { slug: "streaming_and_tv", label: "Streaming & TV" },
    { slug: "books_and_reading", label: "Books & Reading" },
    { slug: "podcasts_and_audio", label: "Podcasts & Audio" },
    { slug: "recipes_and_kitchen", label: "Recipes & Kitchen" },
    { slug: "fitness_and_wellness", label: "Fitness & Wellness" },
  ],
  shopping: [
    { slug: "fashion", label: "Fashion" },
    { slug: "beauty", label: "Beauty" },
    { slug: "tech_and_gadgets", label: "Tech & Gadgets" },
    { slug: "home", label: "Home" },
    { slug: "kids", label: "Kids" },
  ],
  gifting: [
    { slug: "by_occasion", label: "By Occasion" },
    { slug: "by_recipient", label: "By Recipient" },
  ],
  travel: [
    { slug: "hotels_and_villas", label: "Hotels & Villas" },
    { slug: "travel_experiences", label: "Experiences" },
    { slug: "destinations", label: "Destinations" },
    { slug: "retreats_and_wellness", label: "Retreats & Wellness" },
  ],
};

export function SearchCard() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [subcategory, setSubcategory] = useState("all");
  const [blckbxApprovedOnly, setBlckbxApprovedOnly] = useState(false);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
    setSubcategory("all");
  }, [category]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, subcategory]);

  useEffect(() => {
    let active = true;
    const isLoadMore = offset > 0;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    fetchRecommendations({
      q: debouncedQuery,
      category: category === "all" ? undefined : category,
      subcategory: category === "all" || subcategory === "all" ? undefined : subcategory,
      is_blckbx_approved: blckbxApprovedOnly || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        if (!active) return;
        setResults((current) => (isLoadMore ? [...current, ...data.data] : data.data));
        setTotal(data.pagination.total);
        setProcessingTimeMs(data.processingTimeMs ?? null);
      })
      .catch(() => {
        if (!active) return;
        setError("Search is temporarily unavailable. Try again in a moment.");
        if (!isLoadMore) {
          setResults([]);
          setTotal(0);
          setProcessingTimeMs(null);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, category, subcategory, blckbxApprovedOnly, offset, refreshKey]);

  const hasSearch = debouncedQuery.trim().length > 0;
  const canLoadMore = results.length < total;
  const visibleSubcategories = category === "all" ? [] : (SUBCATEGORY_MAP[category] ?? []);
  const resultLabel = useMemo(() => {
    return hasSearch ? `${total} results for "${debouncedQuery}"` : `${total} results`;
  }, [debouncedQuery, hasSearch, total]);

  return (
    <section className="panel p-6 md:p-8">
      <div className="max-w-3xl">
        <h2 className="font-serif text-[30px] italic">Quick Search</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Find approved products, venues, and experiences.</p>
      </div>

      <div className="relative mt-6">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field search-field"
          placeholder="Search by name, brand, tag..."
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-[var(--muted)]"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBlckbxApprovedOnly((current) => !current)}
          className={
            blckbxApprovedOnly
              ? "chip chip-active px-4 py-2 text-sm"
              : "chip px-4 py-2 text-sm"
          }
        >
          BX Approved
        </button>
        <FilterChips active={category} onChange={setCategory} />
      </div>
      {visibleSubcategories.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubcategory("all")}
            className={
              subcategory === "all"
                ? "chip chip-active px-[14px] py-[6px] text-[13px]"
                : "chip px-[14px] py-[6px] text-[13px]"
            }
          >
            All
          </button>
          {visibleSubcategories.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => setSubcategory(option.slug)}
              className={
                subcategory === option.slug
                  ? "chip chip-active px-[14px] py-[6px] text-[13px]"
                  : "chip px-[14px] py-[6px] text-[13px]"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-5 text-sm text-[var(--muted)]">
        {resultLabel}
      </div>
      {processingTimeMs !== null ? (
        <div className="mt-1 text-xs text-[var(--muted)]">Meilisearch responded in {processingTimeMs}ms</div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="panel overflow-hidden">
              <div className="skeleton aspect-[3/4] w-full" />
              <div className="space-y-3 p-5">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-6 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state mt-10 px-6 py-12 text-center text-sm">
          <p>{error}</p>
          <button type="button" className="button-secondary mt-4" onClick={() => setRefreshKey((current) => current + 1)}>
            Retry
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state mt-10 px-6 py-12 text-center text-sm">
          {hasSearch
            ? `No results found for "${debouncedQuery}". Try different keywords or broaden your filters.`
            : "No results found. Try broadening your search or check that approved recommendations exist."}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {results.map((item) => (
              <ResultCard key={item._key} item={item} />
            ))}
          </div>
          {canLoadMore ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
