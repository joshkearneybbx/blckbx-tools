import { useQuery } from "@tanstack/react-query";
import { pocketbaseRecipeId } from "@/lib/meals/api";
import { pb } from "@/lib/pocketbase";

export interface PastMealOccurrence {
  date: string;
  count: number;
}

export interface PastMealRecipe {
  recipeId: string;
  title: string;
  source?: string;
  source_url?: string;
  image_url?: string;
  cook_time?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  latestPlannedAt: string;
  /** Unique planned timestamps, newest first (deduped). */
  plannedDates: string[];
  /**
   * Per-timestamp occurrence counts, newest first.
   * Length can be < totalCount when one plan used the recipe more than once
   * (same meal_plan.created collapses to one date with count > 1).
   */
  plannedOccurrences: PastMealOccurrence[];
  totalCount: number;
  feedback: "liked" | "disliked" | null;
}

function feedbackRank(feedback: "liked" | "disliked" | null | undefined): number {
  if (feedback === "liked") return 2;
  if (feedback === "disliked") return 1;
  return 0;
}

function toIsoDate(value: unknown): string {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString();
  return date.toISOString();
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function recipeSnapshot(recipe: any): Pick<
  PastMealRecipe,
  "title" | "source" | "source_url" | "image_url" | "cook_time" | "servings" | "calories" | "protein" | "carbs" | "fat"
> {
  return {
    title: String(recipe?.title ?? "Untitled recipe"),
    source: recipe?.source ? String(recipe.source) : undefined,
    source_url: optionalString(recipe?.source_url),
    image_url: optionalString(recipe?.image_url ?? recipe?.imageUrl ?? recipe?.image),
    cook_time: optionalNumber(recipe?.cook_time),
    servings: optionalNumber(recipe?.servings),
    calories: optionalNumber(recipe?.calories),
    protein: optionalNumber(recipe?.protein),
    carbs: optionalNumber(recipe?.carbs),
    fat: optionalNumber(recipe?.fat),
  };
}

function addOccurrence(occurrences: PastMealOccurrence[], plannedAt: string): PastMealOccurrence[] {
  const next = occurrences.map((entry) => ({ ...entry }));
  const existing = next.find((entry) => entry.date === plannedAt);
  if (existing) {
    existing.count += 1;
  } else {
    next.push({ date: plannedAt, count: 1 });
  }
  return next.sort((a, b) => b.date.localeCompare(a.date));
}

export function usePastMeals(clientId: string | null, enabled = false) {
  return useQuery<PastMealRecipe[]>({
    queryKey: ["mealcraft-past-meals", clientId],
    enabled: enabled && !!clientId,
    queryFn: async () => {
      if (!clientId) return [];

      const items = await pb.collection("meal_plan_items").getFullList({
        filter: `meal_plan.client = "${clientId}"`,
        expand: "recipe,meal_plan",
        sort: "-meal_plan.created",
      });

      const grouped = new Map<string, PastMealRecipe>();

      items.forEach((item: any) => {
        const recipe = item.expand?.recipe;
        const mealPlan = item.expand?.meal_plan;
        const recipeId = pocketbaseRecipeId(item, recipe);
        if (!recipeId) return;

        const plannedAt = toIsoDate(mealPlan?.created ?? item.created);
        const feedback = (item.feedback ?? null) as "liked" | "disliked" | null;
        const snapshot = recipeSnapshot(recipe);

        const existing = grouped.get(recipeId);
        if (!existing) {
          grouped.set(recipeId, {
            recipeId,
            ...snapshot,
            latestPlannedAt: plannedAt,
            plannedDates: [plannedAt],
            plannedOccurrences: [{ date: plannedAt, count: 1 }],
            totalCount: 1,
            feedback,
          });
          return;
        }

        // First occurrence's recipe snapshot wins (same as title/source previously).
        const latestPlannedAt = plannedAt > existing.latestPlannedAt ? plannedAt : existing.latestPlannedAt;
        const bestFeedback = feedbackRank(feedback) > feedbackRank(existing.feedback) ? feedback : existing.feedback;
        const plannedOccurrences = addOccurrence(existing.plannedOccurrences, plannedAt);

        grouped.set(recipeId, {
          ...existing,
          latestPlannedAt,
          plannedDates: plannedOccurrences.map((entry) => entry.date),
          plannedOccurrences,
          totalCount: existing.totalCount + 1,
          feedback: bestFeedback,
        });
      });

      return Array.from(grouped.values()).sort((a, b) => b.latestPlannedAt.localeCompare(a.latestPlannedAt));
    },
  });
}
