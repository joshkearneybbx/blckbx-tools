import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentHubTrend } from "../lib/pb-queries";
import "../content-hub.css";

type ComposerKind = "blog" | "ig";

function isPocketBaseNotFound(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: number }).status === 404,
  );
}

export default function ContentHubComposerPlaceholder({ kind }: { kind: ComposerKind }) {
  const pattern = kind === "blog"
    ? "/content-hub/compose/blog/:trendId"
    : "/content-hub/compose/ig/:trendId";
  const [, params] = useRoute(pattern);
  const trendId = params?.trendId ? decodeURIComponent(params.trendId) : "";
  const trendQuery = useContentHubTrend(trendId);

  const title = kind === "blog" ? "Blog Composer" : "Instagram Composer";
  const bodyLabel = kind === "blog" ? "blog post" : "Instagram post";

  return (
    <div className="content-hub">
      <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-12">
        <Link
          href={trendId ? `/content-hub/trends/${trendId}` : "/content-hub/trends"}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trend Detail
        </Link>

        <section className="ch-panel mt-8 px-6 py-10 md:px-8 md:py-12">
          <div className="ch-kicker">Editorial workflow · Compose</div>

          {trendQuery.isLoading ? (
            <div className="mt-5 space-y-4">
              <Skeleton className="h-10 w-72 bg-[rgba(10,10,10,0.08)]" />
              <Skeleton className="h-5 w-full max-w-2xl bg-[rgba(10,10,10,0.06)]" />
            </div>
          ) : isPocketBaseNotFound(trendQuery.error) ? (
            <div className="mt-5">
              <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[var(--ch-text)]">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">
                Trend not found. Return to the Trends Log and pick another trend.
              </p>
            </div>
          ) : trendQuery.isError || !trendQuery.data ? (
            <div className="mt-5">
              <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[var(--ch-text)]">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">
                We couldn’t load the trend context for this composer yet.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <h1 className="text-3xl font-semibold tracking-[-0.01em] text-[var(--ch-text)]">{title} — Coming soon</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ch-secondary)] md:text-base">
                This page will let you compose a {bodyLabel} from trend “{trendQuery.data.topic}”.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
