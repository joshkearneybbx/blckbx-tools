import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealCraftClient, MealType, PlanReuseConfig } from "@/lib/meals/api";
import type { PastMealRecipe } from "@/hooks/meals/usePastMeals";
import type { WorkspaceFavourite, WorkspacePlanSummary } from "@/hooks/meals/useHouseholdWorkspace";
import { ChipSelect } from "./ChipSelect";

export interface PlanCriteriaValues {
  free_prompt: string;
  num_days: number;
  meals_per_day: number;
  meal_types: MealType[];
  focus_tags: string[];
  reuse: PlanReuseConfig;
  advanced: {
    calorie_target?: string;
    cooking_skill?: string;
    cuisine_preference?: string;
    protein_target?: string;
  };
}

interface PlanCriteriaProps {
  client: MealCraftClient;
  values: PlanCriteriaValues;
  onChange: (next: PlanCriteriaValues) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  favourites: WorkspaceFavourite[];
  pastMeals: PastMealRecipe[];
  pastMealsLoading: boolean;
  pastMealsError: boolean;
  recentPlans: WorkspacePlanSummary[];
}

const MEAL_TYPES: Array<{ label: string; value: MealType }> = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

const FOCUS_TAGS = [
  { label: "Budget-Friendly", value: "budget-friendly" },
  { label: "Quick", value: "quick" },
  { label: "Batch Cooking", value: "batch-cooking" },
  { label: "Family Friendly", value: "family-friendly" },
  { label: "Healthy", value: "healthy" },
  { label: "One-Pot", value: "one-pot" },
  { label: "Comfort Food", value: "comfort-food" },
];

export function PlanCriteria({
  client,
  values,
  onChange,
  onGenerate,
  isGenerating,
  favourites,
  pastMeals,
  pastMealsLoading,
  pastMealsError,
  recentPlans,
}: PlanCriteriaProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const setField = <K extends keyof PlanCriteriaValues>(key: K, value: PlanCriteriaValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const setReuse = (patch: Partial<PlanReuseConfig>) => {
    setField("reuse", { ...values.reuse, ...patch });
  };

  const toggleSpecificRecipe = (recipeId: string) => {
    const selected = values.reuse.specific_recipe_ids ?? [];
    const next = selected.includes(recipeId)
      ? selected.filter((id) => id !== recipeId)
      : [...selected, recipeId];
    setReuse({ specific_recipe_ids: next.length ? next : undefined });
  };

  const startFresh = () => {
    setField("reuse", {
      include_favourites: false,
      avoid_recent: false,
    });
  };

  return (
    <div className="border border-[#D4D0CB] bg-white">
      <div className="flex items-center justify-between border-b border-[#D4D0CB] px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-[#0A0A0A]">Plan Criteria</h3>
          <p className="text-xs text-[#0A0A0A]/60">Client: {client.name}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#0A0A0A]">What are you looking for?</label>
          <Textarea
            value={values.free_prompt}
            onChange={(event) => setField("free_prompt", event.target.value)}
            placeholder="keep it simple, nothing too fancy"
            className="min-h-[90px] resize-y border-[#D4D0CB] text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#0A0A0A]">Number of Days</label>
            <Select
              value={String(values.num_days)}
              onValueChange={(value) => setField("num_days", Number(value))}
            >
              <SelectTrigger className="h-10 border-[#E6E5E0] text-sm">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 5, 7, 14].map((days) => (
                  <SelectItem key={days} value={String(days)}>{days}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242]">Meals Per Day</label>
            <Select
              value={String(values.meals_per_day)}
              onValueChange={(value) => setField("meals_per_day", Number(value))}
            >
              <SelectTrigger className="h-10 border-[#E6E5E0] text-sm">
                <SelectValue placeholder="Select meals" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((count) => (
                  <SelectItem key={count} value={String(count)}>{count}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#424242]">Meal Types</label>
          <ChipSelect
            options={MEAL_TYPES}
            selected={values.meal_types}
            onChange={(next) => setField("meal_types", next as MealType[])}
          />
        </div>

        <div className="border-t border-[#D4D0CB] pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0A0A0A]">Reuse controls</label>
              <p className="mt-1 text-xs text-[#696969]">Choose how much of this household&apos;s meal history should influence the plan.</p>
            </div>
            <button
              type="button"
              onClick={startFresh}
              className="shrink-0 border border-[#D4D0CB] px-2.5 py-1.5 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px] text-[#0A0A0A] hover:border-[#0A0A0A]"
            >
              Start fresh
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              role="switch"
              aria-checked={values.reuse.include_favourites}
              onClick={() => setReuse({ include_favourites: !values.reuse.include_favourites })}
              className="flex w-full items-center justify-between border border-[#D4D0CB] px-3 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-medium text-[#0A0A0A]">Include favourites</span>
                <span className="mt-1 block text-xs text-[#696969]">{favourites.length} saved favourite{favourites.length === 1 ? "" : "s"}</span>
              </span>
              <span className={values.reuse.include_favourites ? "border border-[#0A0A0A] bg-[#0A0A0A] px-2 py-1 text-[10px] uppercase tracking-[1px] text-white" : "border border-[#D4D0CB] px-2 py-1 text-[10px] uppercase tracking-[1px] text-[#696969]"}>
                {values.reuse.include_favourites ? "On" : "Off"}
              </span>
            </button>

            <div className="flex items-center justify-between gap-3 border border-[#D4D0CB] px-3 py-3">
              <button
                type="button"
                role="switch"
                aria-checked={values.reuse.avoid_recent}
                onClick={() => setReuse({ avoid_recent: !values.reuse.avoid_recent })}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-[#0A0A0A]">Avoid meals used recently</span>
                  <span className="mt-1 block text-xs text-[#696969]">Skip recipes used within the selected window.</span>
                </span>
                <span className={values.reuse.avoid_recent ? "border border-[#0A0A0A] bg-[#0A0A0A] px-2 py-1 text-[10px] uppercase tracking-[1px] text-white" : "border border-[#D4D0CB] px-2 py-1 text-[10px] uppercase tracking-[1px] text-[#696969]"}>
                  {values.reuse.avoid_recent ? "On" : "Off"}
                </span>
              </button>
              <Input
                type="number"
                min={1}
                value={values.reuse.recent_window_days ?? 28}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setReuse({ recent_window_days: Number.isFinite(next) && next > 0 ? next : undefined });
                }}
                disabled={!values.reuse.avoid_recent}
                aria-label="Recent meal window in days"
                className="h-9 w-20 border-[#D4D0CB] text-sm disabled:opacity-40"
              />
            </div>

            <div className="border border-[#D4D0CB] px-3 py-3">
              <p className="text-sm font-medium text-[#0A0A0A]">Choose specific previous meals</p>
              <p className="mt-1 text-xs text-[#696969]">Select any meals to reuse directly.</p>
              <div className="mt-3 space-y-2">
                {pastMealsLoading ? <p className="text-xs text-[#696969]">Loading past meals…</p> : null}
                {pastMealsError ? <p className="text-xs text-[#696969]">Past meals could not be loaded.</p> : null}
                {!pastMealsLoading && !pastMealsError && pastMeals.length === 0 ? <p className="text-xs text-[#696969]">No past meals available.</p> : null}
                {!pastMealsLoading && !pastMealsError ? pastMeals.map((meal) => {
                  const selected = (values.reuse.specific_recipe_ids ?? []).includes(meal.recipeId);
                  return (
                    <label key={meal.recipeId} className="flex cursor-pointer items-start gap-2 border-t border-[#F0EEEB] pt-2 text-sm text-[#0A0A0A]">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSpecificRecipe(meal.recipeId)}
                        className="mt-0.5 accent-[#0A0A0A]"
                      />
                      <span>
                        {meal.title}
                        <span className="ml-1 text-xs text-[#696969]">({meal.totalCount}× used)</span>
                      </span>
                    </label>
                  );
                }) : null}
              </div>
            </div>

            <div className="border border-[#D4D0CB] px-3 py-3">
              <label className="block text-sm font-medium text-[#0A0A0A]">Reuse from a previous plan</label>
              <p className="mt-1 text-xs text-[#696969]">Optionally use a recent plan as another source.</p>
              <Select
                value={values.reuse.source_plan_id ?? "__none__"}
                onValueChange={(value) => setReuse({ source_plan_id: value === "__none__" ? undefined : value })}
              >
                <SelectTrigger className="mt-3 h-10 border-[#D4D0CB] text-sm">
                  <SelectValue placeholder="No source plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No source plan</SelectItem>
                  {recentPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between border border-[#D4D0CB] bg-[#F5F3F0] px-3 py-2 text-xs font-semibold text-[#0A0A0A]">
            Advanced Options
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={values.advanced.calorie_target ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, calorie_target: event.target.value })}
                placeholder="Calorie target"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.cooking_skill ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, cooking_skill: event.target.value })}
                placeholder="Cooking skill"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.cuisine_preference ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, cuisine_preference: event.target.value })}
                placeholder="Cuisine preference"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.protein_target ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, protein_target: event.target.value })}
                placeholder="Protein target"
                className="h-10 border-[#E6E5E0] text-sm"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || values.meal_types.length === 0}
            className="bb-btn w-full px-4 py-4 text-[16px] leading-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Plan"}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
