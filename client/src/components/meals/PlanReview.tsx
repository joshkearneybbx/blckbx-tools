import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MealPlanResult } from "@/lib/meals/api";
import { DaySection } from "./DaySection";
import { PlanSummaryStats } from "./PlanSummaryStats";
import { SwapModal } from "./SwapModal";

interface PlanReviewProps {
  planResult: MealPlanResult;
  onRegenerate: () => void;
  onNext: () => void;
  onSwapMeal: (mealPlanItemId: string, payload: { mode: "suggest" | "specific"; reason?: string; replacement_recipe_id?: string }) => Promise<void>;
  isSwapping: boolean;
  onFeedback: (mealPlanItemId: string, feedback: "liked" | "disliked") => void;
}

export function PlanReview({ planResult, onRegenerate, onNext, onSwapMeal, isSwapping, onFeedback }: PlanReviewProps) {
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  const swapOpen = useMemo(() => !!swapTargetId, [swapTargetId]);

  return (
    <div className="space-y-4">
      <PlanSummaryStats stats={planResult.stats} />

      {planResult.warnings?.length ? (
        <div className="rounded-md border border-[#E7C51C] bg-[#FFFBE8] px-3 py-2 text-xs text-[#424242]">
          {planResult.warnings.join(" • ")}
        </div>
      ) : null}

      {planResult.plan.map((day) => (
        <DaySection
          key={day.day_number}
          day={day}
          onSwapClick={(mealPlanItemId) => setSwapTargetId(mealPlanItemId)}
          onFeedback={onFeedback}
        />
      ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onRegenerate} className="border-[#E6E5E0]">
          Regenerate
        </Button>
        <Button type="button" onClick={onNext} className="bg-[#E7C51C] text-black hover:bg-[#d4b419]">
          View Shopping List
        </Button>
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
