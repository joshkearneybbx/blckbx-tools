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
  onGetLink: () => void;
  onGenerateNewLink: () => void;
  isPublishingLink: boolean;
  publishProgress: number;
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
  onGetLink,
  onGenerateNewLink,
  isPublishingLink,
  publishProgress,
}: PlanReviewProps) {
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

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

      <div className="space-y-3 border-t border-[#E4E2DD] pt-4">
        {planResult.document_url ? (
          <div className="space-y-2 border border-[#D4D0CB] bg-[#F5F3F0] px-3 py-3">
            <p className="font-[var(--bb-font-sans)] text-[10px] font-semibold uppercase tracking-[1px] text-[#0A0A0A]">
              Client link
            </p>
            <a
              href={planResult.document_url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-xs text-[#0A0A0A] underline underline-offset-2"
            >
              {planResult.document_url}
            </a>
            {planResult.document_generated_at ? (
              <p className="text-xs text-[#404040]">
                Generated {new Date(planResult.document_generated_at).toLocaleString("en-GB")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#D4D0CB]"
                disabled={isPublishingLink}
                onClick={async () => {
                  await navigator.clipboard.writeText(planResult.document_url ?? "");
                  setCopiedLink(true);
                  window.setTimeout(() => setCopiedLink(false), 1500);
                }}
              >
                {copiedLink ? "Copied" : "Copy link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#D4D0CB]"
                disabled={isPublishingLink}
                onClick={onGenerateNewLink}
              >
                {isPublishingLink ? `Generating… ${publishProgress}%` : "Generate new link"}
              </Button>
            </div>
            <p className="text-xs text-[#404040]">
              Generating a new link creates a fresh URL. The previous link is superseded — share the new one with the client.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#D4D0CB]"
              disabled={isPublishingLink || !planResult.meal_plan_id}
              onClick={onGetLink}
            >
              {isPublishingLink ? `Publishing… ${publishProgress}%` : "Get Link"}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onRegenerate} className="border-[#E6E5E0]" disabled={isPublishingLink}>
            Regenerate
          </Button>
          <button type="button" onClick={onNext} className="bb-btn px-4 py-3 text-[14px] leading-none" disabled={isPublishingLink}>
            View Shopping List →
          </button>
        </div>
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
