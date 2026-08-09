import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MacroOverride, MealPlanResult } from "@/lib/meals/api";
import type { PastMealRecipe } from "@/hooks/meals/usePastMeals";
import { DaySection } from "./DaySection";
import { PlanSummaryStats } from "./PlanSummaryStats";
import { SwapModal } from "./SwapModal";

export interface MealReviewLookups {
  reusedRecipeIds: Set<string>;
  favouriteRecipeIds: Set<string>;
  pastByRecipeId: Map<string, PastMealRecipe>;
}

interface PlanReviewProps {
  planResult: MealPlanResult;
  pastMeals?: PastMealRecipe[];
  onRegenerate: () => void;
  onNext: () => void;
  onSwapMeal: (mealPlanItemId: string, payload: { mode: "suggest" | "specific"; reason?: string; replacement_recipe_id?: string }) => Promise<void>;
  isSwapping: boolean;
  onFeedback: (mealPlanItemId: string, feedback: "liked" | "disliked") => void;
  onSaveMacros: (mealPlanItemId: string, macros: MacroOverride) => void;
  onSaveNote: (mealPlanItemId: string, note: string) => Promise<void> | void;
  onSaveTitle: (mealPlanItemId: string, title: string) => Promise<void> | void;
  isPublishingLink?: boolean;
}

export function PlanReview({
  planResult,
  pastMeals = [],
  onRegenerate,
  onNext,
  onSwapMeal,
  isSwapping,
  onFeedback,
  onSaveMacros,
  onSaveNote,
  onSaveTitle,
  isPublishingLink = false,
}: PlanReviewProps) {
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  const swapOpen = useMemo(() => !!swapTargetId, [swapTargetId]);

  const lookups = useMemo<MealReviewLookups>(() => {
    const pastByRecipeId = new Map<string, PastMealRecipe>();
    pastMeals.forEach((meal) => {
      if (meal.recipeId) {
        pastByRecipeId.set(meal.recipeId, meal);
      }
    });

    return {
      reusedRecipeIds: new Set(planResult.reused_recipe_ids ?? []),
      favouriteRecipeIds: new Set(planResult.favourite_recipe_ids_used ?? []),
      pastByRecipeId,
    };
  }, [planResult.reused_recipe_ids, planResult.favourite_recipe_ids_used, pastMeals]);

  return (
    <div className="space-y-4">
      <PlanSummaryStats stats={planResult.stats} />

      {planResult.warnings?.length ? (
        <div className="border border-[#E4E2DD] bg-[#FAF9F7] px-3 py-2 text-xs text-[#404040]">
          <ul className="space-y-1.5">
            {planResult.warnings.map((warning, index) => (
              <li key={`${warning.type}-${warning.recipe_id ?? "none"}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-[var(--bb-font-sans)] text-[10px] font-semibold uppercase tracking-[1px] text-[#0A0A0A]">
                  {warning.type === "recent_repeat"
                    ? "Recently used"
                    : warning.type === "selection_excluded"
                      ? "Selection excluded"
                      : "Favourite excluded"}
                </span>
                <span className="text-[#404040]">{warning.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {planResult.plan.map((day) => (
        <DaySection
          key={day.day_number}
          day={day}
          lookups={lookups}
          macroOverrides={planResult.macroOverrides}
          noteOverrides={planResult.noteOverrides}
          onSwapClick={(mealPlanItemId) => setSwapTargetId(mealPlanItemId)}
          onFeedback={onFeedback}
          onSaveMacros={onSaveMacros}
          onSaveNote={onSaveNote}
          onSaveTitle={onSaveTitle}
        />
      ))}

      <div className="flex flex-wrap justify-end gap-2 border-t border-[#E4E2DD] pt-4">
        <Button type="button" variant="outline" onClick={onRegenerate} className="border-[#E6E5E0]" disabled={isPublishingLink}>
          Regenerate
        </Button>
        <button type="button" onClick={onNext} className="bb-btn px-4 py-3 text-[14px] leading-none" disabled={isPublishingLink}>
          View Shopping List →
        </button>
      </div>

      <SwapModal
        open={swapOpen}
        onOpenChange={(open) => {
          if (!open) setSwapTargetId(null);
        }}
        isSwapping={isSwapping}
        onConfirm={async (payload) => {
          if (!swapTargetId) return;
          await onSwapMeal(swapTargetId, payload);
          setSwapTargetId(null);
        }}
      />
    </div>
  );
}
