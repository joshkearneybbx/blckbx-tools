import { ExternalLink } from "lucide-react";
import type { TaskGuidePartner } from "@/hooks/task-guide/useTaskGuide";

interface PartnerCardProps {
  partner: TaskGuidePartner;
}

function badgeClasses(strength: string): string {
  const normalized = strength.toLowerCase();
  if (normalized === "strong") return "bg-[#D1FAE5] text-[#065F46]";
  if (normalized === "moderate") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-[#FAF9F8] text-[#6B6B68]";
}

export function PartnerCard({ partner }: PartnerCardProps) {
  const website = partner.website || partner.url;

  return (
    <article className="mb-2 rounded-[8px] border border-[#E6E5E0] p-3.5 last:mb-0 hover:border-[#AAA9A8]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#1D1C1B]">{partner.name}</h3>
        <span className={`rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] ${badgeClasses(partner.match_strength)}`}>
          {partner.match_strength || "loose"}
        </span>
      </div>

      {partner.category ? (
        <p className="mb-1.5 text-[11px] font-medium text-[#9B9797]">{partner.category}</p>
      ) : null}

      {partner.description ? (
        <p className="text-[12px] leading-[1.5] text-[#424242]">{partner.description}</p>
      ) : null}

      {partner.relevance ? (
        <p className="mt-2 border-l-2 border-[#E6E5E0] pl-2 text-[11px] italic leading-[1.5] text-[#6B6B68]">
          {partner.relevance}
        </p>
      ) : null}

      {website ? (
        <a
          href={website}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D1C1B] hover:text-[#6B6B68]"
        >
          Visit website
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </article>
  );
}
