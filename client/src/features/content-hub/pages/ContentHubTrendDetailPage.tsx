import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Ban,
  Camera,
  Check,
  Copy,
  FileText,
  Loader2,
  Pin,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useContentHubTrend,
  useContentHubTrendSources,
  useContentHubTrendStatusActions,
} from "../lib/pb-queries";
import type {
  ContentHubSource,
  ContentHubTrendCategory,
  ContentHubTrendSourceRecord,
  ContentHubTrendStatus,
} from "../types";
import "../content-hub.css";

type SourceMeta = {
  code: string;
  label: string;
};

const CATEGORY_LABELS: Record<ContentHubTrendCategory, string> = {
  going_out: "Going Out",
  staying_in: "Staying In",
  shopping: "Shopping",
  gifting: "Gifting",
  travel: "Travel",
  hr: "HR",
};

const SOURCE_META: Record<ContentHubSource, SourceMeta> = {
  instagram: { code: "IG", label: "Instagram" },
  tiktok: { code: "TT", label: "TikTok" },
  google_trends: { code: "GT", label: "Google Trends" },
  manual: { code: "MN", label: "Manual" },
};

function isPocketBaseNotFound(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: number }).status === 404,
  );
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
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatCompactNumber(value?: number | null) {
  const numeric = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: numeric >= 100 ? 0 : 1,
  }).format(numeric);
}

function formatDecimal(value?: number | null) {
  const numeric = Number(value ?? 0);

  if (Number.isInteger(numeric)) {
    return String(numeric);
  }

  return numeric.toFixed(1);
}

function formatStatusLabel(status: ContentHubTrendStatus) {
  switch (status) {
    case "pinned":
      return "Pinned";
    case "dismissed":
      return "Dismissed";
    case "used":
      return "Used";
    case "active":
    default:
      return "Active";
  }
}

function signalTone(score?: number | null) {
  const numeric = Number(score ?? 0);

  if (numeric > 7) {
    return "high";
  }

  if (numeric >= 4) {
    return "mid";
  }

  return "low";
}

function DetailBackLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}

function TrendStatusPill({ status }: { status: ContentHubTrendStatus }) {
  const label = formatStatusLabel(status);

  return (
    <span
      className={cn(
        "ch-status-pill",
        status === "pinned" && "is-pinned",
        status === "dismissed" && "is-dismissed",
        status === "used" && "is-used",
        status === "active" && "is-active",
      )}
    >
      {status === "active" || status === "pinned" ? (
        <span className="ch-status-pill-dot" aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}

function DetailSignalBadge({ score }: { score?: number | null }) {
  const numeric = Number(score ?? 0);
  const tone = signalTone(numeric);

  return (
    <span
      className={cn(
        "ch-detail-signal-badge",
        tone === "high" && "is-high",
        tone === "mid" && "is-mid",
        tone === "low" && "is-low",
      )}
    >
      {numeric.toFixed(1)}
    </span>
  );
}

function OverviewStat({
  label,
  value,
  subline,
}: {
  label: string;
  value: string;
  subline: string;
}) {
  return (
    <div className="ch-detail-stat">
      <div className="ch-detail-stat-label">{label}</div>
      <div className="ch-detail-stat-value">{value}</div>
      <div className="ch-detail-stat-sub">{subline}</div>
    </div>
  );
}

function SourceTimeline({ sources }: { sources: ContentHubTrendSourceRecord[] }) {
  if (sources.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--ch-secondary)]">
        No source detail recorded
      </div>
    );
  }

  return (
    <div className="ch-timeline">
      {sources.map((source, index) => {
        const meta = SOURCE_META[source.source] ?? { code: "--", label: source.source };
        const metricName = source.metric_name?.trim();
        const metricValue = source.metric_value;

        return (
          <div key={source.id} className="ch-timeline-item">
            {index < sources.length - 1 ? <span className="ch-timeline-line" aria-hidden="true" /> : null}
            <div className="ch-timeline-code">{meta.code}</div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-4">
                <div className="text-[13px] font-medium text-[var(--ch-text)]">{meta.label}</div>
                <div
                  className="shrink-0 text-[12px] text-[var(--ch-secondary)]"
                  title={formatAbsoluteTime(source.seen_at)}
                >
                  {formatRelativeTime(source.seen_at)}
                </div>
              </div>

              <div className="mt-1 break-all font-mono text-[12px] text-[var(--ch-secondary)]">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[var(--ch-border)] underline-offset-4 transition-colors hover:text-[var(--ch-text)]"
                  >
                    {source.external_id}
                  </a>
                ) : (
                  source.external_id || "—"
                )}
              </div>

              {metricName || metricValue != null ? (
                <div className="mt-2 text-[12px] text-[var(--ch-secondary)]">
                  {metricName || "Metric"}: <strong className="font-semibold text-[var(--ch-text)]">{metricValue != null ? formatCompactNumber(metricValue) : "—"}</strong>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendDetailSkeleton() {
  return (
    <div className="content-hub">
      <div className="mx-auto max-w-[1360px] px-6 py-10 md:px-8 md:py-12">
        <div className="border-b border-[var(--ch-border)] pb-7">
          <Skeleton className="h-5 w-40 bg-[rgba(10,10,10,0.08)]" />
          <Skeleton className="mt-6 h-3 w-56 bg-[rgba(10,10,10,0.06)]" />
          <Skeleton className="mt-4 h-10 w-[480px] max-w-full bg-[rgba(10,10,10,0.08)]" />
          <Skeleton className="mt-4 h-5 w-[680px] max-w-full bg-[rgba(10,10,10,0.06)]" />
        </div>

        <div className="mt-6 grid gap-6 min-[960px]:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <div className="ch-panel p-6">
              <Skeleton className="h-4 w-24 bg-[rgba(10,10,10,0.06)]" />
              <Skeleton className="mt-5 h-12 w-full bg-[rgba(10,10,10,0.05)]" />
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2 border-l border-[var(--ch-border)] pl-4 first:border-l-0 first:pl-0">
                    <Skeleton className="h-3 w-16 bg-[rgba(10,10,10,0.05)]" />
                    <Skeleton className="h-8 w-20 bg-[rgba(10,10,10,0.08)]" />
                    <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.05)]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="ch-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.06)]" />
                <Skeleton className="h-4 w-10 bg-[rgba(10,10,10,0.05)]" />
              </div>
              <Skeleton className="mt-5 h-8 w-3/4 bg-[rgba(10,10,10,0.07)]" />
            </div>

            <div className="ch-panel p-6">
              <Skeleton className="h-4 w-20 bg-[rgba(10,10,10,0.06)]" />
              <div className="mt-5 space-y-4">
                <Skeleton className="h-12 w-full bg-[rgba(10,10,10,0.05)]" />
                <Skeleton className="h-16 w-full bg-[rgba(10,10,10,0.05)]" />
                <Skeleton className="h-20 w-full bg-[rgba(10,10,10,0.05)]" />
              </div>
            </div>
          </div>

          <div>
            <div className="ch-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.06)]" />
                <Skeleton className="h-4 w-14 bg-[rgba(10,10,10,0.05)]" />
              </div>
              <div className="mt-5 space-y-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[22px_1fr] gap-3">
                    <Skeleton className="h-[22px] w-[22px] bg-[rgba(10,10,10,0.07)]" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.06)]" />
                      <Skeleton className="h-4 w-48 bg-[rgba(10,10,10,0.05)]" />
                      <Skeleton className="h-4 w-32 bg-[rgba(10,10,10,0.05)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentHubTrendDetailPage() {
  const [, params] = useRoute("/content-hub/trends/:id");
  const trendId = params?.id ? decodeURIComponent(params.id) : "";
  const [copied, setCopied] = useState(false);

  const trendQuery = useContentHubTrend(trendId);
  const sourcesQuery = useContentHubTrendSources(trendId);
  const { togglePin, toggleDismiss, isPendingForTrend } = useContentHubTrendStatusActions();

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  const trend = trendQuery.data;
  const sources = sourcesQuery.data ?? [];

  const platformSummary = useMemo(() => {
    const seen = new Set<ContentHubSource>();
    const labels: string[] = [];

    for (const source of sources) {
      if (seen.has(source.source)) {
        continue;
      }

      seen.add(source.source);
      labels.push(SOURCE_META[source.source]?.label ?? source.source);
    }

    return labels;
  }, [sources]);

  const hasSeoShortTail = (trend?.seo_short_tail?.length ?? 0) > 0;
  const hasSeoLongTail = (trend?.seo_long_tail?.length ?? 0) > 0;
  const hasGeoQuestions = (trend?.geo_questions?.length ?? 0) > 0;
  const hasAnySeoContent = hasSeoShortTail || hasSeoLongTail || hasGeoQuestions;

  if (!trendId) {
    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1360px] px-6 py-10 md:px-8 md:py-12">
          <DetailBackLink href="/content-hub/trends">Back to Trends Log</DetailBackLink>
          <section className="ch-panel mt-8 px-6 py-14 text-center">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Trend not found</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              It may have been deleted or the link is incorrect.
            </p>
            <Link href="/content-hub/trends" className="ch-inline-button ch-inline-button-primary mt-6 inline-flex">
              Return to Trends Log
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (trendQuery.isLoading || (trendQuery.isSuccess && sourcesQuery.isLoading)) {
    return <TrendDetailSkeleton />;
  }

  if (isPocketBaseNotFound(trendQuery.error)) {
    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1360px] px-6 py-10 md:px-8 md:py-12">
          <DetailBackLink href="/content-hub/trends">Back to Trends Log</DetailBackLink>
          <section className="ch-panel mt-8 px-6 py-14 text-center">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Trend not found</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              It may have been deleted or the link is incorrect.
            </p>
            <Link href="/content-hub/trends" className="ch-inline-button ch-inline-button-primary mt-6 inline-flex">
              Return to Trends Log
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (trendQuery.isError || sourcesQuery.isError || !trend) {
    const message = trendQuery.error instanceof Error
      ? trendQuery.error.message
      : sourcesQuery.error instanceof Error
        ? sourcesQuery.error.message
        : "We couldn’t load this trend right now.";

    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1360px] px-6 py-10 md:px-8 md:py-12">
          <DetailBackLink href="/content-hub/trends">Back to Trends Log</DetailBackLink>
          <section className="ch-panel mt-8 px-6 py-12">
            <div className="flex h-12 w-12 items-center justify-center border border-[rgba(192,86,74,0.18)] bg-[rgba(192,86,74,0.08)] text-[var(--ch-error)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[var(--ch-text)]">Could not load trend detail</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">{message}</p>
            <Link href="/content-hub/trends" className="ch-inline-button ch-inline-button-primary mt-6 inline-flex">
              Return to Trends Log
            </Link>
          </section>
        </div>
      </div>
    );
  }

  const statusLabel = formatStatusLabel(trend.status);
  const categoryLabel = trend.category ? CATEGORY_LABELS[trend.category] : "Uncategorised";
  const pending = isPendingForTrend(trend.id);

  const copySuggestedTitle = async () => {
    if (!trend.suggested_title?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trend.suggested_title);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="content-hub">
      <div className="mx-auto max-w-[1360px] px-6 py-10 md:px-8 md:py-12">
        <header className="border-b border-[var(--ch-border)] pb-7">
          <div className="flex flex-col gap-8 min-[960px]:flex-row min-[960px]:items-start min-[960px]:justify-between">
            <div className="space-y-3">
              <DetailBackLink href="/content-hub/trends">Back to Trends Log</DetailBackLink>
              <div>
                <div className="ch-kicker">Editorial workflow · Trend detail</div>
                <h1 className="mt-3 max-w-[880px] text-[32px] font-semibold tracking-[-0.01em] text-[var(--ch-text)]">
                  {trend.topic}
                </h1>
                <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[var(--ch-secondary)]">
                  {trend.angle || "No editorial angle yet."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 min-[960px]:items-end">
              <TrendStatusPill status={trend.status} />
              <div className="flex flex-wrap gap-2 min-[960px]:justify-end">
                <button
                  type="button"
                  onClick={() => togglePin(trend)}
                  disabled={pending}
                  className="ch-inline-button ch-inline-button-muted"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pin className="h-4 w-4" />}
                  {trend.status === "pinned" ? "Unpin" : "Pin"}
                </button>

                <button
                  type="button"
                  onClick={() => toggleDismiss(trend)}
                  disabled={pending}
                  className={cn(
                    "ch-inline-button",
                    trend.status === "dismissed" ? "ch-inline-button-muted" : "ch-inline-button-danger-hover",
                  )}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {trend.status === "dismissed" ? "Undismiss" : "Dismiss"}
                </button>

                <Link
                  href={`/content-hub/compose/blog/${trend.id}`}
                  className="ch-inline-button ch-inline-button-primary"
                >
                  <FileText className="h-4 w-4" />
                  Compose Blog
                </Link>

                <Link
                  href={`/content-hub/compose/ig/${trend.id}`}
                  className="ch-inline-button ch-inline-button-primary"
                >
                  <Camera className="h-4 w-4" />
                  Compose IG
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 min-[960px]:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <section className="ch-panel p-5 md:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-secondary)]">
                Overview
              </div>

              <div className="ch-detail-overview-meta mt-5">
                <span className="inline-flex items-center border border-[var(--ch-border)] bg-[var(--ch-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                  {categoryLabel}
                </span>
                <DetailSignalBadge score={trend.signal_score} />
                <span className="text-[13px] text-[var(--ch-secondary)]">
                  <strong className="font-semibold text-[var(--ch-text)]">{statusLabel}</strong>
                </span>
                <span className="ch-detail-meta-dot" aria-hidden="true" />
                <span className="text-[13px] text-[var(--ch-secondary)]">
                  First seen <strong className="font-semibold text-[var(--ch-text)]">{formatRelativeTime(trend.first_seen_at)}</strong>
                </span>
                <span className="ch-detail-meta-dot" aria-hidden="true" />
                <span className="text-[13px] text-[var(--ch-secondary)]">
                  Last seen <strong className="font-semibold text-[var(--ch-text)]">{formatRelativeTime(trend.last_seen_at)}</strong>
                </span>
              </div>

              <div className="ch-detail-stat-grid mt-6">
                <OverviewStat
                  label="Platforms"
                  value={String(Math.max(Number(trend.cross_platform_count ?? 0), platformSummary.length))}
                  subline={platformSummary.length ? platformSummary.join(", ") : "No source detail recorded"}
                />
                <OverviewStat
                  label="Signal count"
                  value={String(Number(trend.signal_count ?? 0))}
                  subline="across ingest runs"
                />
                <OverviewStat
                  label="Velocity"
                  value={formatDecimal(trend.velocity)}
                  subline={`${formatCompactNumber(trend.views)} views`}
                />
              </div>
            </section>

            <section className="ch-panel p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-secondary)]">
                  Suggested title
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void copySuggestedTitle();
                  }}
                  disabled={!trend.suggested_title?.trim()}
                  className="ch-copy-button"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {trend.suggested_title?.trim() ? (
                <div className="mt-5 font-[Georgia,'Times_New_Roman',serif] text-[18px] font-medium italic leading-8 text-[var(--ch-text)]">
                  {trend.suggested_title}
                </div>
              ) : (
                <div className="mt-5 text-sm text-[var(--ch-secondary)]">No suggested title yet</div>
              )}
            </section>

            <section className="ch-panel p-5 md:p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-secondary)]">
                SEO brief
              </div>

              {hasAnySeoContent ? (
                <div className="mt-5 space-y-5">
                  {hasSeoShortTail ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ch-secondary)]">
                        Short-tail keywords
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {trend.seo_short_tail?.map((item) => (
                          <span key={item} className="ch-keyword-chip">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {hasSeoLongTail ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ch-secondary)]">
                        Long-tail keywords
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {trend.seo_long_tail?.map((item) => (
                          <span key={item} className="ch-keyword-chip">{item}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {hasGeoQuestions ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ch-secondary)]">
                        Questions to cover
                      </div>
                      <div className="mt-3 border-t border-[var(--ch-border)]">
                        {trend.geo_questions?.map((item) => (
                          <div key={item} className="border-b border-[var(--ch-border)] py-3 text-[13px] leading-6 text-[var(--ch-text)] last:border-b-0 last:pb-0">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 text-sm text-[var(--ch-secondary)]">No SEO brief yet</div>
              )}
            </section>

            {import.meta.env.DEV ? (
              <details className="ch-detail-details">
                <summary>Raw enrichment payload</summary>
                <pre className="ch-detail-raw-block">
                  {JSON.stringify(trend.raw_payload ?? {}, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>

          <div>
            <section className="ch-panel p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ch-secondary)]">
                  Source timeline
                </div>
                <div className="text-[12px] text-[var(--ch-secondary)]">
                  {sources.length} {sources.length === 1 ? "source" : "sources"}
                </div>
              </div>

              <div className="mt-5">
                <SourceTimeline sources={sources} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
