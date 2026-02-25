import type { TaskGuidePartner } from "@/hooks/task-guide/useTaskGuide";

interface PartnerCardProps {
  partner: TaskGuidePartner;
  onClick?: () => void;
}

function badgeClasses(strength: string): string {
  const normalized = strength.toLowerCase();
  if (normalized === "strong") return "bg-[#D1FAE5] text-[#065F46]";
  if (normalized === "moderate") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-[#FAF9F8] text-[#6B6B68]";
}

export function PartnerCard({ partner, onClick }: PartnerCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 block w-full rounded-[8px] border border-[#E6E5E0] p-3.5 text-left transition-colors last:mb-0 hover:border-[#AAA9A8] hover:bg-[#FAF9F8]"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#1D1C1B]">{partner.name}</h3>
        <span className={`rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] ${badgeClasses(partner.match_strength)}`}>
          {partner.match_strength || "loose"}
        </span>
      </div>

      {partner.category || partner.price_category || partner.partnership_type ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {partner.category ? (
            <span className="rounded-[4px] bg-[#FAF9F8] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6B68]">
              {partner.category}
            </span>
          ) : null}
          {partner.price_category ? (
            <span className="rounded-[4px] bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-medium text-[#4338CA]">
              {partner.price_category}
            </span>
          ) : null}
          {partner.partnership_type ? (
            <span className="rounded-[4px] border border-[#E6E5E0] bg-white px-1.5 py-0.5 text-[9px] font-medium text-[#6B6B68]">
              {partner.partnership_type}
            </span>
          ) : null}
        </div>
      ) : null}

      {partner.description ? (
        <p className="text-[12px] leading-[1.5] text-[#424242]">{partner.description}</p>
      ) : null}

      {partner.relevance ? (
        <p className="mt-2 border-l-2 border-[#E6E5E0] pl-2 text-[11px] italic leading-[1.5] text-[#6B6B68]">
          {partner.relevance}
        </p>
      ) : null}
    </button>
  );
}
