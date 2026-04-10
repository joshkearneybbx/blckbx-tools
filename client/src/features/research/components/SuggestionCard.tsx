import { BlckBxApprovedBadge } from "./BlckBxApprovedBadge";
import { EndorsementBadges } from "./EndorsementBadges";
import { Recommendation, Suggestion } from "../lib/types";
import { formatPrice } from "../lib/utils";

export function SuggestionCard({
  index,
  suggestion,
  recommendation,
}: {
  index: number;
  suggestion: Suggestion;
  recommendation: Recommendation;
}) {
  return (
    <article className="border-t border-[var(--border)] px-1 py-5 first:border-t-0">
      <div className="grid gap-4 md:grid-cols-[64px_1fr_auto] md:items-start">
        <div className="text-[32px] leading-none text-[var(--muted)]">{index + 1}</div>
        <div className="space-y-3">
          <div className="text-sm text-[var(--muted)]">
            {formatPrice(recommendation)} · {recommendation.category.replaceAll("_", " ")}
          </div>
          {recommendation.is_blckbx_approved ? <BlckBxApprovedBadge compact /> : null}
          <EndorsementBadges endorsements={recommendation.endorsements} />
          <h3 className="font-serif text-[20px] leading-tight">{recommendation.name}</h3>
          <div className="note-panel px-4 py-3 text-sm italic leading-6">
            {suggestion.reason}
          </div>
          <div>
            <div className="label mb-2">Match Tags</div>
            <div className="flex flex-wrap gap-2">
              {suggestion.match_tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="md:justify-self-end">
          {recommendation.url ? (
            <a href={recommendation.url} target="_blank" rel="noreferrer" className="button-secondary">
              View →
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
