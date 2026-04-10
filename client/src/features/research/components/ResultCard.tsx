import { BlckBxApprovedBadge } from "./BlckBxApprovedBadge";
import { EndorsementBadges } from "./EndorsementBadges";
import { Recommendation } from "../lib/types";
import { cn, formatPrice, getRecommendationSourceLabel, getRecommendationTags } from "../lib/utils";

export function ResultCard({ item }: { item: Recommendation }) {
  const tags = getRecommendationTags(item).slice(0, 3);
  const sourceLabel = getRecommendationSourceLabel(item);
  const isGuide = item.content_type === "guide";

  return (
    <article className="panel overflow-hidden transition-colors duration-150 hover:border-[var(--black)]">
      <div className="relative aspect-[3/4] w-full bg-[linear-gradient(135deg,#f5f1eb,#e2ddd4)]">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            No Image
          </div>
        )}
        {item.is_blckbx_approved ? <BlckBxApprovedBadge className="absolute left-[10px] top-[10px]" /> : null}
      </div>
      <div className="space-y-3 p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {sourceLabel} · {item.content_type}
        </div>
        {item.brand ? <div className="text-sm text-[var(--muted)]">{item.brand}</div> : null}
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--text)]">{formatPrice(item)}</span>
          {item.in_stock ? (
            <span className="border border-[var(--approved-green)] bg-[var(--success-bg)] px-2.5 py-1 text-[12px] text-[#1b6e2d]">
              In stock
            </span>
          ) : null}
        </div>
        <EndorsementBadges endorsements={item.endorsements} />
        <h3 className="font-serif text-[20px] leading-tight text-[var(--text)]">{item.name}</h3>
        {isGuide ? (
          <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            {item.destination ? <span>{item.destination}</span> : null}
            {typeof item.poi_count === "number" ? <span>{item.poi_count} POIs</span> : null}
          </div>
        ) : null}
        {item.location ? <div className="text-sm text-[var(--muted)]">⌖ {item.location}</div> : null}
        {item.description ? <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p> : null}
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={cn("inline-flex text-sm font-medium text-[var(--link)] underline underline-offset-4")}
          >
            View →
          </a>
        ) : null}
      </div>
    </article>
  );
}
