import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import type { MealCraftClient } from "@/lib/meals/api";

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 200;

export type MealPlanStatus = "draft" | "active" | "completed" | "archived";

export interface HouseholdSummary extends MealCraftClient {
  planCount: number;
  lastGeneratedAt: string | null;
  lastSentAt: string | null;
  currentStatus: MealPlanStatus | null;
  favouriteCount: number;
  hasDraft: boolean;
  hasActivePlan: boolean;
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

function asStatus(value: unknown): MealPlanStatus | null {
  const status = String(value ?? "");
  if (status === "draft" || status === "active" || status === "completed" || status === "archived") {
    return status;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapClient(record: RecordModel): MealCraftClient {
  return {
    id: String(record.id),
    name: String(record.name ?? "Unnamed household"),
    dietary: asStringArray(record.dietary),
    dislikes: asStringArray(record.dislikes),
    household_size: typeof record.household_size === "number" && record.household_size > 0
      ? record.household_size
      : undefined,
    notes: record.notes ? String(record.notes) : undefined,
  };
}

async function getAllPages(collection: string, options: Record<string, unknown>): Promise<RecordModel[]> {
  const records: RecordModel[] = [];
  let page = 1;
  let totalItems = 0;

  do {
    const result = await pb.collection(collection).getList(page, PAGE_SIZE, options);
    totalItems = result.totalItems;
    records.push(...result.items);
    page += 1;
  } while (records.length < totalItems);

  return records;
}

export function useHouseholdDashboard(searchTerm: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  return useQuery<HouseholdSummary[]>({
    queryKey: ["mealcraft-household-dashboard", normalizedSearch],
    queryFn: async () => {
      const escapedSearch = escapeFilterValue(normalizedSearch);
      const clientFilter = escapedSearch
        ? `name ~ \"${escapedSearch}\" || notes ~ \"${escapedSearch}\" || dietary ~ \"${escapedSearch}\" || dislikes ~ \"${escapedSearch}\"`
        : "";

      const [clientRecords, planRecords, favouriteRecords] = await Promise.all([
        getAllPages("clients", {
          sort: "-updated",
          fields: "id,name,household_size,dietary,dislikes,notes,updated",
          ...(clientFilter ? { filter: clientFilter } : {}),
        }),
        getAllPages("meal_plans", {
          sort: "+created,+id",
          fields: "id,client,status,created,generated_at,sent_at,updated",
        }),
        getAllPages("meal_favourites", {
          filter: "active = true",
          fields: "id,client,active",
        }),
      ]);

      const planByClient = new Map<string, Array<RecordModel>>();
      planRecords.forEach((plan) => {
        const clientId = String(plan.client ?? "");
        if (!clientId) return;
        const plans = planByClient.get(clientId) ?? [];
        plans.push(plan);
        planByClient.set(clientId, plans);
      });

      const favouritesByClient = new Map<string, number>();
      favouriteRecords.forEach((favourite) => {
        const clientId = String(favourite.client ?? "");
        if (!clientId) return;
        favouritesByClient.set(clientId, (favouritesByClient.get(clientId) ?? 0) + 1);
      });

      return clientRecords.map((record) => {
        const client = mapClient(record);
        const plans = planByClient.get(client.id) ?? [];
        const sortedPlans = [...plans].sort((a, b) => {
          const aDate = asDate(a.generated_at ?? a.created)?.getTime() ?? 0;
          const bDate = asDate(b.generated_at ?? b.created)?.getTime() ?? 0;
          return bDate - aDate;
        });
        const latestPlan = sortedPlans[0];
        const generatedDates = plans
          .map((plan) => asDate(plan.generated_at ?? plan.created))
          .filter((date): date is Date => date !== null)
          .sort((a, b) => b.getTime() - a.getTime());
        const sentDates = plans
          .map((plan) => asDate(plan.sent_at))
          .filter((date): date is Date => date !== null)
          .sort((a, b) => b.getTime() - a.getTime());

        return {
          ...client,
          planCount: plans.length,
          lastGeneratedAt: generatedDates[0]?.toISOString() ?? null,
          lastSentAt: sentDates[0]?.toISOString() ?? null,
          currentStatus: asStatus(latestPlan?.status),
          favouriteCount: favouritesByClient.get(client.id) ?? 0,
          hasDraft: plans.some((plan) => plan.status === "draft"),
          hasActivePlan: plans.some((plan) => plan.status === "active"),
        } satisfies HouseholdSummary;
      });
    },
  });
}
