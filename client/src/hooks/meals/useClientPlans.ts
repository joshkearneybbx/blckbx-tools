import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { MealType } from "@/lib/meals/api";

export interface ClientPlanItemSummary {
  meal_plan_item_id: string;
  day_number: number;
  meal_type: MealType;
  title: string;
  feedback: "liked" | "disliked" | null;
  recipe_id: string;
  source?: string;
}

export interface ClientPlanSummary {
  id: string;
  title: string;
  created: string;
  status: "draft" | "active" | "completed" | "archived";
  num_days: number;
  meals_per_day: number;
  recipePreview: string[];
  items: ClientPlanItemSummary[];
}

export interface RecentPlanSummary {
  id: string;
  title: string;
  created: string;
  status: "draft" | "active" | "completed" | "archived";
  num_days: number;
  meals_per_day: number;
  client_id: string;
  client_name: string;
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStatus(value: unknown): "draft" | "active" | "completed" | "archived" {
  const status = String(value ?? "draft");
  if (status === "active" || status === "completed" || status === "archived") return status;
  return "draft";
}

export function useClientPlans(clientId: string | null, enabled = false) {
  return useQuery<ClientPlanSummary[]>({
    queryKey: ["mealcraft-client-plans", clientId],
    enabled: enabled && !!clientId,
    queryFn: async () => {
      if (!clientId) return [];

      const plans = await pb.collection("meal_plans").getFullList({
        filter: `client = "${clientId}"`,
        sort: "-created",
      });

      if (plans.length === 0) return [];

      const items = await pb.collection("meal_plan_items").getFullList({
        filter: `meal_plan.client = "${clientId}"`,
        expand: "recipe,meal_plan",
        sort: "-meal_plan.created,-day_number",
      });

      const itemMap = new Map<string, ClientPlanItemSummary[]>();

      items.forEach((item: any) => {
        const planId = String(item.meal_plan ?? item.expand?.meal_plan?.id ?? "");
        if (!planId) return;

        const recipe = item.expand?.recipe;
        const title = String(recipe?.title ?? "Untitled recipe");
        const feedback = (item.feedback ?? null) as "liked" | "disliked" | null;

        const nextItem: ClientPlanItemSummary = {
          meal_plan_item_id: String(item.id),
          day_number: asNumber(item.day_number, 0),
          meal_type: String(item.meal_type ?? "dinner") as MealType,
          title,
          feedback,
          recipe_id: String(recipe?.id ?? item.recipe ?? ""),
          source: recipe?.source ? String(recipe.source) : undefined,
        };

        const list = itemMap.get(planId) ?? [];
        list.push(nextItem);
        itemMap.set(planId, list);
      });

      return plans.map((plan: any) => {
        const groupedItems = itemMap.get(String(plan.id)) ?? [];
        const uniqueTitles = Array.from(new Set(groupedItems.map((item) => item.title)));

        return {
          id: String(plan.id),
          title: String(plan.title ?? `Meal Plan - ${new Date(plan.created).toLocaleDateString("en-GB")}`),
          created: String(plan.created ?? new Date().toISOString()),
          status: asStatus(plan.status),
          num_days: asNumber(plan.num_days, 0),
          meals_per_day: asNumber(plan.meals_per_day, 0),
          recipePreview: uniqueTitles,
          items: groupedItems,
        } satisfies ClientPlanSummary;
      });
    },
  });
}

export function useRecentPlans(enabled = true) {
  return useQuery<RecentPlanSummary[]>({
    queryKey: ["mealcraft-recent-plans"],
    enabled,
    queryFn: async () => {
      const result = await pb.collection("meal_plans").getList(1, 5, {
        sort: "-updated",
        expand: "client",
      });

      return result.items.map((plan: any) => ({
        id: String(plan.id),
        title: String(plan.title ?? `Meal Plan - ${new Date(plan.created).toLocaleDateString("en-GB")}`),
        created: String(plan.created ?? new Date().toISOString()),
        status: asStatus(plan.status),
        num_days: asNumber(plan.num_days, 0),
        meals_per_day: asNumber(plan.meals_per_day, 0),
        client_id: String(plan.client ?? plan.expand?.client?.id ?? ""),
        client_name: String(plan.expand?.client?.name ?? "Unknown client"),
      }));
    },
  });
}
