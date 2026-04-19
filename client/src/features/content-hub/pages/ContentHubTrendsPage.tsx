import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import {
  ArrowLeft,
  Ban,
  Camera,
  Loader2,
  Mail,
  Music2,
  Pencil,
  Pin,
  Search,
  TrendingUp,
  ImagePlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useContentHubTrendCount,
  useContentHubTrends,
  useContentHubTrendStatusActions,
} from "../lib/pb-queries";
import type {
  ContentHubSignalFilter,
  ContentHubSortKey,
  ContentHubSource,
  ContentHubStatusFilter,
  ContentHubTrendCategory,
  ContentHubTrendRow,
  ContentHubTrendSourceRecord,
  ContentHubTrendStatus,
} from "../types";
import "../content-hub.css";

type FilterOption<TValue extends string> = {
  label: string;
  value: TValue;
};

const CATEGORY_OPTIONS: FilterOption<ContentHubTrendCategory>[] = [
  { label: "Going Out", value: "going_out" },
  { label: "Staying In", value: "staying_in" },
  { label: "Shopping", value: "shopping" },
  { label: "Gifting", value: "gifting" },
  { label: "Travel", value: "travel" },
  { label: "HR", value: "hr" },
];

const STATUS_OPTIONS: FilterOption<ContentHubStatusFilter>[] = [
  { label: "Active", value: "active" },
  { label: "Pinned", value: "pinned" },
  { label: "Dismissed", value: "dismissed" },
  { label: "All", value: "all" },
];

const SOURCE_OPTIONS: Array<FilterOption<ContentHubSource> & { icon: LucideIcon }> = [
  { label: "TikTok", value: "tiktok", icon: Music2 },
  { label: "Instagram", value: "instagram", icon: Camera },
  { label: "Google Trends", value: "google_trends", icon: Search },
  { label: "Manual", value: "manual", icon: Pencil },
];

const SIGNAL_FILTER_OPTIONS: FilterOption<ContentHubSignalFilter>[] = [
  { label: "All", value: "all" },
  { label: "> 4", value: "gt4" },
  { label: "> 7", value: "gt7" },
];

const SORT_OPTIONS: Array<FilterOption<ContentHubSortKey>> = [
  { label: "Signal score", value: "signal_score" },
  { label: "Recency", value: "recency" },
  { label: "Velocity", value: "velocity" },
  { label: "Views", value: "views" },
];

function sortRows(rows: ContentHubTrendRow[], sortKey: ContentHubSortKey) {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    const leftLastSeen = left.last_seen_at ? Date.parse(left.last_seen_at) : 0;
    const rightLastSeen = right.last_seen_at ? Date.parse(right.last_seen_at) : 0;

    if (left.status === "pinned" && right.status !== "pinned") {
      return -1;
    }

    if (left.status !== "pinned" && right.status === "pinned") {
      return 1;
    }

    if (sortKey === "signal_score") {
      const diff = Number(right.signal_score || 0) - Number(left.signal_score || 0);
      if (diff !== 0) return diff;
      return rightLastSeen - leftLastSeen;
    }

    if (sortKey === "recency") {
      const diff = rightLastSeen - leftLastSeen;
      if (diff !== 0) return diff;
      return Number(right.signal_score || 0) - Number(left.signal_score || 0);
    }

    if (sortKey === "velocity") {
      const diff = Number(right.velocity || 0) - Number(left.velocity || 0);
      if (diff !== 0) return diff;
      return Number(right.signal_score || 0) - Number(left.signal_score || 0);
    }

    const diff = Number(right.views || 0) - Number(left.views || 0);
    if (diff !== 0) return diff;
    return Number(right.signal_score || 0) - Number(left.signal_score || 0);
  });

  return sorted;
}

function matchesStatusFilter(status: ContentHubTrendStatus, filter: ContentHubStatusFilter) {
  if (filter === "all") return true;
  if (filter === "pinned") return status === "pinned";
  if (filter === "dismissed") return status === "dismissed";
  return status !== "dismissed";
}

function matchesSignalFilter(score: number, filter: ContentHubSignalFilter) {
  if (filter === "all") return true;
  if (filter === "gt7") return score > 7;
  return score > 4;
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

function formatAbsoluteTime(value?: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function scoreTone(score: number) {
  if (score > 7) {
    return "high";
  }

  if (score > 4) {
    return "mid";
  }

  return "low";
}

function SourcePills({ sources }: { sources: ContentHubTrendSourceRecord[] }) {
  const uniqueSources = useMemo(() => {
    const seen = new Set<ContentHubSource>();
    const next: ContentHubSource[] = [];

    for (const source of sources) {
      if (!source?.source || seen.has(source.source)) {
        continue;
      }

      seen.add(source.source);
      next.push(source.source);
    }

    return next;
  }, [sources]);

  if (!uniqueSources.length) {
    return <span className="text-xs text-[var(--ch-muted)]">No sources</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {uniqueSources.map((sourceName) => {
        const option = SOURCE_OPTIONS.find((item) => item.value === sourceName);
        if (!option) return null;

        const Icon = option.icon;
        return (
          <span key={sourceName} className="ch-source-pill">
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </span>
        );
      })}
    </div>
  );
}

function CategoryPill({ category }: { category?: ContentHubTrendCategory | null }) {
  const label = CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? "Uncategorised";

  return <span className="ch-category-pill">{label}</span>;
}

function SignalScoreBadge({ score }: { score?: number | null }) {
  const numericScore = Number(score || 0);
  const tone = scoreTone(numericScore);

  return (
    <span
      className={cn(
        "ch-score-badge",
        tone === "high" && "ch-score-badge-high",
        tone === "mid" && "ch-score-badge-mid",
        tone === "low" && "ch-score-badge-low",
      )}
    >
      {numericScore.toFixed(1)}
    </span>
  );
}

function DisabledSoonButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Mail;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <button
            type="button"
            disabled
            aria-label={label}
            className="ch-icon-button opacity-45"
          >
            <Icon className="h-4 w-4" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label} coming soon</TooltipContent>
    </Tooltip>
  );
}

function SelectionPlaceholder() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Checkbox disabled aria-label="Multi-select coming soon" className="border-[#D1CEC9] data-[state=checked]:bg-[#0A0A0A] data-[state=checked]:text-[#FAFAF8]" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Multi-select coming soon</TooltipContent>
    </Tooltip>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function TrendsTableSkeleton() {
  return (
    <div className="ch-panel mt-6 overflow-hidden">
      <div className="border-b border-[var(--ch-border)] px-6 py-4">
        <Skeleton className="h-6 w-48 bg-[rgba(10,10,10,0.08)]" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[40px_minmax(260px,2fr)_140px_220px_120px_120px_240px] items-center gap-4 border-b border-[var(--ch-border)] px-6 py-4 last:border-b-0">
            <Skeleton className="h-4 w-4 bg-[rgba(10,10,10,0.08)]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-44 bg-[rgba(10,10,10,0.08)]" />
              <Skeleton className="h-4 w-72 bg-[rgba(10,10,10,0.06)]" />
            </div>
            <Skeleton className="h-8 w-24 bg-[rgba(10,10,10,0.08)]" />
            <Skeleton className="h-8 w-40 bg-[rgba(10,10,10,0.06)]" />
            <Skeleton className="h-8 w-16 bg-[rgba(10,10,10,0.08)]" />
            <Skeleton className="h-4 w-24 bg-[rgba(10,10,10,0.06)]" />
            <Skeleton className="h-9 w-52 bg-[rgba(10,10,10,0.06)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentHubTrendsPage() {
  const [statusFilter, setStatusFilter] = useState<ContentHubStatusFilter>("active");
  const [selectedCategories, setSelectedCategories] = useState<ContentHubTrendCategory[]>([]);
  const [selectedSources, setSelectedSources] = useState<ContentHubSource[]>([]);
  const [signalFilter, setSignalFilter] = useState<ContentHubSignalFilter>("all");
  const [sortKey, setSortKey] = useState<ContentHubSortKey>("signal_score");
  const [searchQuery, setSearchQuery] = useState("");

  const trendsQuery = useContentHubTrends(statusFilter, sortKey);
  const trendCountQuery = useContentHubTrendCount();
  const { togglePin, toggleDismiss, isPendingForTrend } = useContentHubTrendStatusActions();

  useEffect(() => {
    if (trendsQuery.error) {
      console.error("[content-hub] failed to load trends", trendsQuery.error);
    }
  }, [trendsQuery.error]);

  const trendRows = useMemo<ContentHubTrendRow[]>(() => {
    const trends = trendsQuery.data?.trends ?? [];
    const sourcesByTrendId = trendsQuery.data?.sourcesByTrendId ?? {};

    return trends.map((trend) => ({
      ...trend,
      sources: sourcesByTrendId[trend.id] ?? [],
    }));
  }, [trendsQuery.data]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = trendRows.filter((trend) => {
      const matchesStatus = matchesStatusFilter(trend.status, statusFilter);
      const matchesCategory = selectedCategories.length === 0 || (
        trend.category != null && selectedCategories.includes(trend.category)
      );
      const matchesSource = selectedSources.length === 0 || trend.sources.some((source) => (
        selectedSources.includes(source.source)
      ));
      const matchesSignal = matchesSignalFilter(Number(trend.signal_score || 0), signalFilter);
      const matchesSearch = query.length === 0 || trend.topic.toLowerCase().includes(query);

      return matchesStatus && matchesCategory && matchesSource && matchesSignal && matchesSearch;
    });

    return sortRows(filtered, sortKey);
  }, [searchQuery, selectedCategories, selectedSources, signalFilter, sortKey, statusFilter, trendRows]);

  const hasAnyTrends = Math.max(trendCountQuery.data ?? 0, trendRows.length) > 0;
  const hasFilterSelections = Boolean(
    searchQuery.trim() ||
    selectedCategories.length ||
    selectedSources.length ||
    signalFilter !== "all" ||
    statusFilter !== "active",
  );
  const selectedTrendIds: string[] = [];

  const handleTogglePin = (trend: ContentHubTrendRow) => {
    togglePin(trend);
  };

  const handleToggleDismiss = (trend: ContentHubTrendRow) => {
    toggleDismiss(trend);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSources([]);
    setSignalFilter("all");
    setStatusFilter("active");
    setSearchQuery("");
  };

  if (trendsQuery.isLoading || trendCountQuery.isLoading) {
    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-8 md:py-12">
          <TrendsTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="content-hub">
      <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-8 md:py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link href="/content-hub" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]">
              <ArrowLeft className="h-4 w-4" />
              Back to Content Hub
            </Link>
            <div>
              <div className="ch-kicker">Editorial workflow</div>
              <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.03em] text-[var(--ch-text)] md:text-5xl">
                Trends Log
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[rgba(10,10,10,0.68)] md:text-base">
                Trending topics across TikTok, Instagram and Google Trends.
              </p>
            </div>
          </div>

          <div className="w-full max-w-[220px]">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">
              Sort
            </div>
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as ContentHubSortKey)}>
              <SelectTrigger className="border-[var(--ch-border)] bg-[var(--ch-surface)] text-[var(--ch-text)] focus:ring-[#0A0A0A]">
                <SelectValue placeholder="Sort trends" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="ch-panel mt-6 p-5 md:p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--ch-border)] pb-5 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ch-muted)]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search topic..."
                className="h-11 border-[var(--ch-border)] bg-[var(--ch-surface)] pl-10 text-[var(--ch-text)] placeholder:text-[var(--ch-muted)] focus-visible:ring-[#0A0A0A]"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-[var(--ch-secondary)] md:justify-end">
              <span>
                Showing <span className="font-semibold text-[var(--ch-text)]">{visibleRows.length}</span> of {trendRows.length} loaded trends
              </span>
              {hasFilterSelections ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-[var(--ch-text)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <FilterGroup label="Status">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={cn("ch-filter-chip", statusFilter === option.value && "is-active")}
                  >
                    {option.label}
                  </button>
                ))}
              </FilterGroup>

              <FilterGroup label="Category">
                {CATEGORY_OPTIONS.map((option) => {
                  const active = selectedCategories.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedCategories((current) => (
                          active
                            ? current.filter((value) => value !== option.value)
                            : [...current, option.value]
                        ));
                      }}
                      className={cn("ch-filter-chip", active && "is-active")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </FilterGroup>
            </div>

            <div className="space-y-5">
              <FilterGroup label="Sources">
                {SOURCE_OPTIONS.map((option) => {
                  const active = selectedSources.includes(option.value);
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSelectedSources((current) => (
                          active
                            ? current.filter((value) => value !== option.value)
                            : [...current, option.value]
                        ));
                      }}
                      className={cn("ch-filter-chip ch-filter-chip-source", active && "is-active")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </FilterGroup>

              <FilterGroup label="Signal score">
                {SIGNAL_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSignalFilter(option.value)}
                    className={cn("ch-filter-chip", signalFilter === option.value && "is-active")}
                  >
                    {option.label}
                  </button>
                ))}
              </FilterGroup>
            </div>
          </div>
        </section>

        {selectedTrendIds.length > 0 ? (
          <section className="ch-panel mt-4 flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-[var(--ch-secondary)]">
              <span className="font-semibold text-[var(--ch-text)]">{selectedTrendIds.length}</span> trends selected
            </div>
            <div className="flex flex-wrap gap-2">
              <DisabledSoonButton label={`Compose newsletter from ${selectedTrendIds.length} trends`} icon={Mail} />
              <DisabledSoonButton label="Compose Instagram post" icon={ImagePlus} />
            </div>
          </section>
        ) : null}

        {trendsQuery.isError ? (
          <section className="ch-panel mt-6 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[rgba(192,86,74,0.18)] bg-[rgba(192,86,74,0.08)] text-[var(--ch-error)]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-medium text-[var(--ch-text)]">Could not load trends</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              We hit an error while loading the Trends Log. Check the browser console for details and try again.
            </p>
          </section>
        ) : !hasAnyTrends ? (
          <section className="ch-panel mt-6 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[var(--ch-border)] bg-[var(--ch-surface-soft)] text-[var(--ch-text)]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-medium text-[var(--ch-text)]">No trends yet</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">
              Content Hub is waiting for the n8n ingestion run. Trends are populated on a schedule every 6 hours once the workflow posts to the PocketBase ingest endpoint.
            </p>
          </section>
        ) : visibleRows.length === 0 ? (
          <section className="ch-panel mt-6 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[var(--ch-border)] bg-[var(--ch-surface-soft)] text-[var(--ch-text)]">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-medium text-[var(--ch-text)]">No trends match your filters</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              Try removing one or more filters to widen the results.
            </p>
            <button type="button" onClick={clearFilters} className="ch-inline-button ch-inline-button-primary mt-6">
              Clear filters
            </button>
          </section>
        ) : (
          <section className="ch-panel mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--ch-border)] bg-[var(--ch-surface-soft)]">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Select</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Topic</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Category</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Sources</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Signal score</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Last seen</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((trend) => (
                    <tr key={trend.id} className="border-b border-[var(--ch-border)] bg-[var(--ch-surface)] align-top last:border-b-0">
                      <td className="px-6 py-5">
                        <SelectionPlaceholder />
                      </td>
                      <td className="px-4 py-5">
                        <div className="max-w-[360px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/content-hub/trends/${trend.id}`}
                              className="font-medium text-[var(--ch-text)] underline decoration-transparent underline-offset-4 transition-[text-decoration-color] hover:decoration-[var(--ch-text)]"
                            >
                              {trend.topic}
                            </Link>
                            {trend.status === "pinned" ? (
                              <span className="ch-pill ch-pill-live">Pinned</span>
                            ) : null}
                          </div>
                          <p className="mt-2 overflow-hidden text-sm leading-6 text-[var(--ch-secondary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                            {trend.angle || "No editorial angle yet."}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <CategoryPill category={trend.category} />
                      </td>
                      <td className="px-4 py-5">
                        <div className="max-w-[220px]">
                          <SourcePills sources={trend.sources} />
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <SignalScoreBadge score={trend.signal_score} />
                      </td>
                      <td className="px-4 py-5 text-sm text-[var(--ch-secondary)]" title={formatAbsoluteTime(trend.last_seen_at)}>
                        {formatRelativeTime(trend.last_seen_at)}
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(trend)}
                            disabled={isPendingForTrend(trend.id)}
                            className={cn(
                              "ch-inline-button",
                              trend.status === "pinned" ? "ch-inline-button-primary" : "ch-inline-button-muted",
                            )}
                          >
                            {isPendingForTrend(trend.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                            {trend.status === "pinned" ? "Unpin" : "Pin"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleDismiss(trend)}
                            disabled={isPendingForTrend(trend.id)}
                            className="ch-inline-button ch-inline-button-danger"
                          >
                            {isPendingForTrend(trend.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            {trend.status === "dismissed" ? "Undismiss" : "Dismiss"}
                          </button>

                          <DisabledSoonButton label="Compose newsletter" icon={Mail} />
                          <DisabledSoonButton label="Compose Instagram post" icon={ImagePlus} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
