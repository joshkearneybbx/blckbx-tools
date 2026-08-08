import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import type { MealCraftClient } from "@/lib/meals/api";
import type { MealPlanStatus } from "./useHouseholdDashboard";

export interface WorkspacePlanSummary {
  id: string;
  title: string;
  created: string;
  generatedAt: string | null;
  sentAt: string | null;
  status: MealPlanStatus;
  numDays: number;
  mealsPerDay: number;
  recipePreview: string[];
}

export interface WorkspaceFavourite {
  id: string;
  recipeId: string;
  title: string;
  source?: string;
  note?: string;
}

export interface HouseholdWorkspaceData {
  client: MealCraftClient;
  planCount: number;
  lastGeneratedAt: string | null;
  lastSentAt: string | null;
  currentStatus: MealPlanStatus | null;
  favouriteCount: number;
  favourites: WorkspaceFavourite[];
  recentPlans: WorkspacePlanSummary[];
}

export interface HouseholdPatch {
  name: string;
  household_size: number | null;
  dietary: string[];
  dislikes: string[];
  notes: string;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

function asStatus(value: unknown): MealPlanStatus {
  const status = String(value ?? "draft");
  if (status === "active" || status === "completed" || status === "archived") return status;
  return "draft";
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapClient(record: RecordModel): MealCraftClient {
  const householdSize = typeof record.household_size === "number" && record.household_size > 0
    ? record.household_size
    : undefined;

  return {
    id: String(record.id),
    name: String(record.name ?? "Unnamed household"),
    dietary: asStringArray(record.dietary),
    dislikes: asStringArray(record.dislikes),
    household_size: householdSize,
    notes: record.notes ? String(record.notes) : undefined,
  };
}

async function getAllPages(collection: string, options: Record<string, unknown>): Promise<RecordModel[]> {
  const records: RecordModel[] = [];
  let page = 1;
  let totalItems = 0;

  do {
    const result = await pb.collection(collection).getList(page, 200, options);
    totalItems = result.totalItems;
    records.push(...result.items);
    page += 1;
  } while (records.length < totalItems);

  return records;
}

function mapFavourite(record: RecordModel): WorkspaceFavourite {
  const recipe = record.expand?.recipes;
  return {
    id: String(record.id),
    recipeId: String(record.recipes ?? recipe?.id ?? ""),
    title: String(recipe?.title ?? record.title ?? "Untitled recipe"),
    source: recipe?.source ? String(recipe.source) : undefined,
    note: record.note ? String(record.note) : undefined,
  };
}

function mapPlan(record: RecordModel): WorkspacePlanSummary {
  return {
    id: String(record.id),
    title: String(record.title ?? "Meal plan"),
    created: String(record.created ?? ""),
    generatedAt: record.generated_at ? String(record.generated_at) : null,
    sentAt: record.sent_at ? String(record.sent_at) : null,
    status: asStatus(record.status),
    numDays: Number(record.num_days ?? 0),
    mealsPerDay: Number(record.meals_per_day ?? 0),
    recipePreview: [],
  };
}

export function useHouseholdWorkspace(clientId: string | null) {
  return useQuery<HouseholdWorkspaceData>({
    queryKey: ["mealcraft-household-workspace", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      if (!clientId) throw new Error("Household id is required.");

      const [clientRecord, plans, favouriteRecords] = await Promise.all([
        pb.collection("clients").getOne(clientId, {
          fields: "id,name,household_size,dietary,dislikes,notes,updated",
        }),
        getAllPages("meal_plans", {
          filter: `client = "${clientId}"`,
          sort: "-created",
          fields: "id,title,created,status,generated_at,sent_at,num_days,meals_per_day",
        }),
        getAllPages("meal_favourites", {
          filter: `client = "${clientId}" && active = true`,
          sort: "sort_order,created",
          expand: "recipes",
          fields: "id,recipes,note,sort_order,created",
        }),
      ]);

      const sortedByGenerated = [...plans].sort((a, b) => {
        const aDate = asDate(a.generated_at ?? a.created)?.getTime() ?? 0;
        const bDate = asDate(b.generated_at ?? b.created)?.getTime() ?? 0;
        return bDate - aDate;
      });
      const sortedBySent = plans
        .map((plan) => ({ plan, date: asDate(plan.sent_at) }))
        .filter((entry): entry is { plan: RecordModel; date: Date } => entry.date !== null)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return {
        client: mapClient(clientRecord),
        planCount: plans.length,
        lastGeneratedAt: sortedByGenerated[0]
          ? (asDate(sortedByGenerated[0].generated_at)?.toISOString() ?? null)
          : null,
        lastSentAt: sortedBySent[0]?.date.toISOString() ?? null,
        currentStatus: sortedByGenerated[0] ? asStatus(sortedByGenerated[0].status) : null,
        favouriteCount: favouriteRecords.length,
        favourites: favouriteRecords.map(mapFavourite),
        recentPlans: plans.slice(0, 5).map(mapPlan),
      } satisfies HouseholdWorkspaceData;
    },
  });
}

export function useUpdateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, patch }: { clientId: string; patch: HouseholdPatch }) => {
      const record = await pb.collection("clients").update(clientId, patch);
      return mapClient(record);
    },
    onSuccess: (_client, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["mealcraft-household-workspace", variables.clientId] });
      void queryClient.invalidateQueries({ queryKey: ["mealcraft-household-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["mealcraft-clients"] });
    },
  });
}
