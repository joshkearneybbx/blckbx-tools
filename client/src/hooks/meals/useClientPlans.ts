import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

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
