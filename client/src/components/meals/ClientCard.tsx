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
          ? "border-[#E7C51C] bg-[#FFFBE8]"
          : "border-[#E6E5E0] hover:border-[#D0D6D0]",
      ].join(" ")}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <h4 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">{client.name}</h4>
        <p className="mb-3 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
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
            <span key={tag} className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] text-[#E33737]">
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
