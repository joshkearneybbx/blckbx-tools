import { getMealMacros, type MacroOverride, type MealPlanDay } from "@/lib/meals/api";
import { MealCard } from "./MealCard";

interface DaySectionProps {
  day: MealPlanDay;
  macroOverrides?: Record<string, MacroOverride>;
  onSwapClick: (mealPlanItemId: string) => void;
  onFeedback: (mealPlanItemId: string, feedback: "liked" | "disliked") => void;
  onSaveMacros: (mealPlanItemId: string, macros: MacroOverride) => void;
  onSaveTitle: (mealPlanItemId: string, title: string) => Promise<void> | void;
}

export function DaySection({ day, macroOverrides, onSwapClick, onFeedback, onSaveMacros, onSaveTitle }: DaySectionProps) {
  const totalCalories = day.meals.reduce(
    (sum, meal) => sum + (getMealMacros(meal, macroOverrides).calories ?? 0),
    0
  );
  const totalProtein = day.meals.reduce(
    (sum, meal) => sum + (getMealMacros(meal, macroOverrides).protein ?? 0),
    0
  );
  const summaryParts = [
    totalCalories > 0 ? `${Math.round(totalCalories)} kcal` : null,
    totalProtein > 0 ? `${Math.round(totalProtein)}g protein` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-[14px] border border-[#E6E5E0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#E7C51C] px-2 py-0.5 text-[11px] font-bold text-black">Day {day.day_number}</span>
          <h3 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">{day.label ?? `Day ${day.day_number}`}</h3>
        </div>
        {summaryParts.length > 0 ? (
          <p className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
            {summaryParts.join(" • ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {day.meals.map((meal) => (
          <MealCard
            key={meal.id}
            item={meal}
            macroOverride={macroOverrides?.[meal.meal_plan_item_id ?? meal.id]}
            onSwap={() => onSwapClick(meal.meal_plan_item_id ?? meal.id)}
            onFeedback={(feedback) => onFeedback(meal.meal_plan_item_id ?? meal.id, feedback)}
            onSaveMacros={(macros) => onSaveMacros(meal.meal_plan_item_id ?? meal.id, macros)}
            onSaveTitle={(title) => onSaveTitle(meal.meal_plan_item_id ?? meal.id, title)}
          />
        ))}
      </div>
    </section>
  );
}
