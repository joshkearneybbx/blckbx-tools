import { Sparkles } from "lucide-react";
import type { TaskGuideCortexItem } from "@/hooks/task-guide/useTaskGuide";
import { CortexCard } from "./CortexCard";

interface CortexPanelProps {
  items: TaskGuideCortexItem[];
}

export function CortexPanel({ items }: CortexPanelProps) {
  return (
    <section className="overflow-hidden rounded-[10px] bg-white">
      <header className="flex items-center gap-2 border-b border-[#E6E5E0] px-5 py-3.5">
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#F0FDF4] text-[#1EA86B]">
          <Sparkles className="h-[15px] w-[15px]" />
        </span>
        <div>
          <h2 className="text-[13px] font-bold text-[#1D1C1B]">Cortex Recommendations</h2>
          <p className="text-[11px] text-[#9B9797]">{items.length} results</p>
        </div>
      </header>

      <div className="max-h-[650px] overflow-y-auto p-4 max-[1100px]:max-h-[400px]">
        {items.length === 0 ? (
          <p className="py-7 text-center text-[12px] text-[#9B9797]">No Cortex recommendations found</p>
        ) : (
          items.map((item, index) => (
            <CortexCard key={`${item.name}-${index}`} item={item} />
          ))
        )}
      </div>
    </section>
  );
}
