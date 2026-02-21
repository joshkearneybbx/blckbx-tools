import type { MealPlanStats } from "@/lib/meals/api";

interface PlanSummaryStatsProps {
  stats: MealPlanStats;
}

export function PlanSummaryStats({ stats }: PlanSummaryStatsProps) {
  const entries = [
    { label: "Recipes", value: stats.recipesCount },
    { label: "Ingredients", value: stats.ingredientsCount },
    { label: "Cook Time", value: `${stats.totalCookTimeMinutes} min` },
    { label: "Est. Cost", value: stats.estimatedCost },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {entries.map((entry) => (
        <div key={entry.label} className="rounded-lg bg-[#1a1a1a] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.5px] text-[#D0D6D0] [font-family:Inter,sans-serif]">{entry.label}</p>
          <p className="text-[22px] font-extrabold text-[#E7C51C] [font-family:Inter,sans-serif]">{entry.value}</p>
        </div>
      ))}
    </div>
  );
}
