import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskGuidePartner } from "@/hooks/task-guide/useTaskGuide";

interface PartnerDetailModalProps {
  partner: TaskGuidePartner | null;
  open: boolean;
  onClose: () => void;
}

function badgeClasses(strength: string): string {
  const normalized = strength.toLowerCase();
  if (normalized === "strong") return "bg-[#D1FAE5] text-[#065F46]";
  if (normalized === "moderate") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-[#FAF9F8] text-[#6B6B68]";
}

export function PartnerDetailModal({ partner, open, onClose }: PartnerDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="max-h-[calc(100vh-120px)] w-[640px] max-w-[95vw] overflow-y-auto rounded-xl border border-[#E6E5E0] p-0">
        {partner ? (
          <>
            <DialogHeader className="border-b border-[#E6E5E0] px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-left text-[22px] font-bold leading-tight text-[#1D1C1B]">
                      {partner.name}
                    </DialogTitle>
                    <span
                      className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] ${badgeClasses(partner.match_strength)}`}
                    >
                      {partner.match_strength || "loose"}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
              {partner.category || partner.price_category || partner.partnership_type ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {partner.category ? (
                    <span className="rounded-[5px] bg-[#FAF9F8] px-2 py-1 text-[10px] font-medium text-[#6B6B68]">
                      {partner.category}
                    </span>
                  ) : null}
                  {partner.price_category ? (
                    <span className="rounded-[5px] bg-[#EEF2FF] px-2 py-1 text-[10px] font-medium text-[#4338CA]">
                      {partner.price_category}
                    </span>
                  ) : null}
                  {partner.partnership_type ? (
                    <span className="rounded-[5px] border border-[#E6E5E0] bg-white px-2 py-1 text-[10px] font-medium text-[#6B6B68]">
                      {partner.partnership_type}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {partner.description ? (
                <div>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B6B68]">
                    Description
                  </h4>
                  <p className="text-[13px] leading-[1.6] text-[#424242]">{partner.description}</p>
                </div>
              ) : null}

              {partner.relevance ? (
                <div>
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B6B68]">
                    Relevance
                  </h4>
                  <p className="text-[13px] leading-[1.6] text-[#424242]">{partner.relevance}</p>
                </div>
              ) : null}

              {partner.login_notes ? (
                <div className="rounded-[8px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3.5">
                  <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#1E40AF]">
                    Login Notes
                  </h4>
                  <p className="text-[13px] leading-[1.6] text-[#1E3A8A]">{partner.login_notes}</p>
                </div>
              ) : null}

              {partner.commission ? (
                <p className="text-[12px] font-medium text-[#6B6B68]">Commission: {partner.commission}</p>
              ) : null}

              {partner.url || partner.website || partner.partnership_link ? (
                <div className="border-t border-[#E6E5E0] pt-4">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#6B6B68]">
                    Links
                  </h4>
                  <div className="flex flex-col items-start gap-2">
                    {partner.url || partner.website ? (
                      <a
                        href={partner.url || partner.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D1C1B] hover:text-[#6B6B68]"
                      >
                        Visit website {"\u2192"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    {partner.partnership_link ? (
                      <a
                        href={partner.partnership_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D1C1B] hover:text-[#6B6B68]"
                      >
                        Partnership link {"\u2192"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
