import type { MealCraftClient } from "@/lib/meals/api";

interface ClientCardProps {
  client: MealCraftClient;
  selected: boolean;
  onSelect: () => void;
  onOpenPastPlans: () => void;
}

export function ClientCard({ client, selected, onSelect, onOpenPastPlans }: ClientCardProps) {
  return (
    <div
      className={[
        "w-full rounded-[14px] border bg-white p-4 text-left shadow-sm transition-colors",
        selected
          ? "border-[#171717] bg-[#FAF9F7]"
          : "border-[#E4E2DD] hover:border-[#898479]",
      ].join(" ")}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <h4 className="text-sm font-bold text-[#1a1a1a]">{client.name}</h4>
        <p className="mb-3 text-xs text-[#6B6B68]">
          Household of {client.household_size ?? 1}
        </p>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {(client.dietary ?? []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-[#F8F8F8] px-2 py-0.5 text-[11px] text-[#424242]">
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(client.dislikes ?? []).slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full border border-[#E4E2DD] px-2 py-0.5 text-[11px] text-[#696969]">
              {tag}
            </span>
          ))}
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenPastPlans}
        className="mt-3 text-xs font-medium text-[#424242] underline underline-offset-2 hover:text-[#1a1a1a]"
      >
        Past Plans
      </button>
    </div>
  );
}
