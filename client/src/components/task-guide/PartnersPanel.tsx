import { Handshake } from "lucide-react";
import type { TaskGuidePartner } from "@/hooks/task-guide/useTaskGuide";
import { PartnerCard } from "./PartnerCard";

interface PartnersPanelProps {
  partners: TaskGuidePartner[];
}

export function PartnersPanel({ partners }: PartnersPanelProps) {
  return (
    <section className="overflow-hidden rounded-[10px] bg-white">
      <header className="flex items-center gap-2 border-b border-[#E6E5E0] px-5 py-3.5">
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#FEF3C7] text-[#D97706]">
          <Handshake className="h-[15px] w-[15px]" />
        </span>
        <div>
          <h2 className="text-[13px] font-bold text-[#1D1C1B]">Matched Partners</h2>
          <p className="text-[11px] text-[#9B9797]">{partners.length} matches</p>
        </div>
      </header>

      <div className="max-h-[650px] overflow-y-auto p-4 max-[1100px]:max-h-[400px]">
        {partners.length === 0 ? (
          <p className="py-7 text-center text-[12px] text-[#9B9797]">No matching partners found</p>
        ) : (
          partners.map((partner, index) => (
            <PartnerCard key={`${partner.name}-${index}`} partner={partner} />
          ))
        )}
      </div>
    </section>
  );
}
