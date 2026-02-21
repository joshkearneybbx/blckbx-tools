import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

export interface PastMealRecipe {
  recipeId: string;
  title: string;
  source?: string;
  latestPlannedAt: string;
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
        const recipeId = String(recipe?.id ?? item.recipe ?? "");
        if (!recipeId) return;

        const title = String(recipe?.title ?? "Untitled recipe");
        const source = recipe?.source ? String(recipe.source) : undefined;
        const plannedAt = toIsoDate(mealPlan?.created ?? item.created);
        const feedback = (item.feedback ?? null) as "liked" | "disliked" | null;

        const existing = grouped.get(recipeId);
        if (!existing) {
          grouped.set(recipeId, {
            recipeId,
            title,
            source,
            latestPlannedAt: plannedAt,
            totalCount: 1,
            feedback,
          });
          return;
        }

        const latestPlannedAt = plannedAt > existing.latestPlannedAt ? plannedAt : existing.latestPlannedAt;
        const bestFeedback = feedbackRank(feedback) > feedbackRank(existing.feedback) ? feedback : existing.feedback;

        grouped.set(recipeId, {
          ...existing,
          latestPlannedAt,
          totalCount: existing.totalCount + 1,
          feedback: bestFeedback,
        });
      });

      return Array.from(grouped.values()).sort((a, b) => b.latestPlannedAt.localeCompare(a.latestPlannedAt));
    },
  });
}
