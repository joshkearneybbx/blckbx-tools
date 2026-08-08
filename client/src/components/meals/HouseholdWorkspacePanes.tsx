import { ArrowRight, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "./ChipSelect";
import { usePastMeals, type PastMealRecipe } from "@/hooks/meals/usePastMeals";
import {
  useUpdateHousehold,
  type HouseholdPatch,
  type HouseholdWorkspaceData,
  type WorkspaceFavourite,
  type WorkspacePlanSummary,
} from "@/hooks/meals/useHouseholdWorkspace";

type MealFilter = "all" | "favourites";

const STRICT_DIETARY = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Vegan", value: "vegan" },
  { label: "Gluten-free", value: "gluten_free" },
  { label: "Halal", value: "halal" },
  { label: "Kosher", value: "kosher" },
];
const MODEL_EXCLUSIONS = [
  { label: "Nut-free", value: "nut_free" },
  { label: "Dairy-free", value: "dairy_free" },
];
const STRICT_VALUES = STRICT_DIETARY.map((item) => item.value);
const MODEL_VALUES = MODEL_EXCLUSIONS.map((item) => item.value);

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitTags(value: string): string[] {
  return unique(value.split(","));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSource(source?: string): string {
  if (!source) return "Source unavailable";
  return source.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function statusLabel(status: WorkspacePlanSummary["status"]): string {
  if (status === "active") return "Sent";
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  return "Draft";
}

interface HouseholdProfilePaneProps {
  data: HouseholdWorkspaceData;
  onNewPlan: () => void;
}

export function HouseholdProfilePane({ data, onNewPlan }: HouseholdProfilePaneProps) {
  const [name, setName] = useState(data.client.name);
  const [householdSize, setHouseholdSize] = useState(data.client.household_size ? String(data.client.household_size) : "");
  const [dietary, setDietary] = useState(unique(data.client.dietary ?? []));
  const [dislikes, setDislikes] = useState(unique(data.client.dislikes ?? []));
  const [notes, setNotes] = useState(data.client.notes ?? "");
  const updateHousehold = useUpdateHousehold();

  useEffect(() => {
    setName(data.client.name);
    setHouseholdSize(data.client.household_size ? String(data.client.household_size) : "");
    setDietary(unique(data.client.dietary ?? []));
    setDislikes(unique(data.client.dislikes ?? []));
    setNotes(data.client.notes ?? "");
  }, [data.client]);

  const strictDietary = dietary.filter((value) => STRICT_VALUES.includes(value));
  const modelExclusions = dietary.filter((value) => MODEL_VALUES.includes(value));
  const loosePreferences = dietary.filter((value) => !STRICT_VALUES.includes(value) && !MODEL_VALUES.includes(value));
  const parsedSize = Number(householdSize);
  const patch: HouseholdPatch = {
    name: name.trim() || data.client.name,
    household_size: Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : null,
    dietary: unique(dietary),
    dislikes: unique(dislikes),
    notes: notes.trim(),
  };
  const saved = {
    name: data.client.name,
    household_size: data.client.household_size ?? null,
    dietary: unique(data.client.dietary ?? []),
    dislikes: unique(data.client.dislikes ?? []),
    notes: (data.client.notes ?? "").trim(),
  };
  const dirty = JSON.stringify(patch) !== JSON.stringify(saved);

  const setGroup = (values: string[], group: string[]) => {
    setDietary((current) => unique([...current.filter((value) => !group.includes(value)), ...values]));
  };
  const save = async () => {
    await updateHousehold.mutateAsync({ clientId: data.client.id, patch });
  };

  return (
    <aside className="flex min-h-0 flex-col">
      <div className="border-b border-[#E4E2DD] px-5 py-5">
        <p className="bb-pre">Overview</p>
        <h2 className="mt-1 bb-type-section">{data.client.name}</h2>
        <p className="mt-2 bb-mut">{data.planCount} plans · ◇ {data.favouriteCount} favourites</p>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <button type="button" className="bb-btn w-full px-4 py-4 text-[16px] leading-none" onClick={onNewPlan}>
          New meal plan
          <ArrowRight className="h-4 w-4" />
        </button>

        <div>
          <label className="bb-label">Name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-10 rounded-none border-[#E4E2DD] text-[14px]" />
        </div>
        <div>
          <label className="bb-label">Household size</label>
          <Input type="number" min={1} value={householdSize} onChange={(event) => setHouseholdSize(event.target.value)} placeholder="Not set" className="mt-2 h-10 rounded-none border-[#E4E2DD] text-[14px]" />
        </div>

        <div>
          <p className="bb-label">Hard dietary constraints</p>
          <ChipSelect className="mt-2" options={STRICT_DIETARY} selected={strictDietary} onChange={(values) => setGroup(values, STRICT_VALUES)} />
        </div>
        <div>
          <p className="bb-label">Ingredient exclusions</p>
          <ChipSelect className="mt-2" options={MODEL_EXCLUSIONS} selected={modelExclusions} onChange={(values) => setGroup(values, MODEL_VALUES)} />
        </div>
        <div>
          <label className="bb-label">Other preferences</label>
          <Input
            value={loosePreferences.join(", ")}
            onChange={(event) => setDietary(unique([...strictDietary, ...modelExclusions, ...splitTags(event.target.value)]))}
            placeholder="Low carb, Mediterranean"
            className="mt-2 h-10 rounded-none border-[#E4E2DD] text-[14px]"
          />
        </div>
        <div>
          <label className="bb-label">Dislikes</label>
          <Input value={dislikes.join(", ")} onChange={(event) => setDislikes(splitTags(event.target.value))} placeholder="Mushrooms, coriander" className="mt-2 h-10 rounded-none border-[#E4E2DD] text-[14px]" />
        </div>
        <div>
          <label className="bb-label">Notes</label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Context for the assistant" className="mt-2 min-h-[90px] rounded-none border-[#E4E2DD] text-[14px]" />
        </div>
      </div>
      <div className="border-t border-[#E4E2DD] px-5 py-4">
        <button type="button" disabled={!dirty || updateHousehold.isPending} onClick={() => void save()} className="w-full border border-[#E4E2DD] px-3 py-2 font-[var(--bb-font-sans)] text-[12px] font-medium text-[#171717] disabled:cursor-not-allowed disabled:opacity-40">
          {updateHousehold.isPending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save changes"}
        </button>
      </div>
    </aside>
  );
}

interface MealHistoryPaneProps {
  clientId: string;
  favourites: WorkspaceFavourite[];
  selectedMealId: string | null;
  onSelectMeal: (meal: PastMealRecipe) => void;
  onToggleFavourite: (recipeId: string, active: boolean) => void;
  isFavouritePending: boolean;
}

export function MealHistoryPane({ clientId, favourites, selectedMealId, onSelectMeal, onToggleFavourite, isFavouritePending }: MealHistoryPaneProps) {
  const [filter, setFilter] = useState<MealFilter>("all");
  const { data: meals = [], isLoading, isError } = usePastMeals(clientId, true);
  const favouriteIds = useMemo(() => new Set(favourites.map((favourite) => favourite.recipeId)), [favourites]);
  const visibleMeals = filter === "favourites" ? meals.filter((meal) => favouriteIds.has(meal.recipeId)) : meals;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[#E4E2DD] px-5 py-5">
        <p className="bb-pre">Past meals</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <h2 className="bb-type-section">Meal history</h2>
            <p className="mt-1 bb-mut">Select a meal to inspect its usage and dates.</p>
          </div>
          <div className="flex gap-1">
            {(["all", "favourites"] as MealFilter[]).map((value) => (
              <button key={value} type="button" onClick={() => setFilter(value)} className={["border px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px]", filter === value ? "border-[#171717] bg-[#171717] text-white" : "border-[#E4E2DD] text-[#696969]"].join(" ")}>{value === "all" ? "All" : "Favourites"}</button>
            ))}
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? <p className="px-5 py-10 bb-meta">Loading past meals…</p> : null}
        {isError ? <p className="px-5 py-10 bb-meta">Past meals could not be loaded.</p> : null}
        {!isLoading && !isError && visibleMeals.length === 0 ? <p className="px-5 py-10 bb-meta">No meals in this view yet.</p> : null}
        {visibleMeals.map((meal) => {
            const isFavourite = favouriteIds.has(meal.recipeId);
            return (
              <div
                key={meal.recipeId}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMeal(meal)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectMeal(meal);
                  }
                }}
                className={["block w-full border-b border-[#E4E2DD] px-5 py-4 text-left transition-colors hover:bg-[#FAF9F7]", selectedMealId === meal.recipeId ? "border-l-4 border-l-[#171717] bg-[#FAF9F7] pl-4" : ""].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="bb-type-card text-[18px]">{meal.title}</p>
                    <p className="mt-1 bb-mut">{formatSource(meal.source)}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={isFavourite ? `Remove ${meal.title} from favourites` : `Save ${meal.title} as a favourite`}
                    disabled={isFavouritePending}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavourite(meal.recipeId, !isFavourite);
                    }}
                    className={["shrink-0 border px-2 py-1 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px] transition-colors disabled:cursor-not-allowed disabled:opacity-50", isFavourite ? "border-[#171717] bg-[#171717] text-white" : "border-[#E4E2DD] text-[#696969] hover:border-[#171717] hover:text-[#171717]"].join(" ")}
                  >
                    {isFavourite ? "Saved ◇" : "Save ♢"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 bb-mut">
                  <span>Last planned {formatDate(meal.latestPlannedAt)}</span>
                  <span>Used {meal.totalCount}×</span>
                  {meal.feedback === "liked" ? <ThumbsUp className="h-4 w-4" /> : null}
                  {meal.feedback === "disliked" ? <ThumbsDown className="h-4 w-4" /> : null}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

export function MealDetailPane({ meal, favourites, recentPlans, onNewPlan, onContinuePlan, onToggleFavourite, isFavouritePending }: {
  meal: PastMealRecipe | null;
  favourites: WorkspaceFavourite[];
  recentPlans: WorkspacePlanSummary[];
  onNewPlan: () => void;
  onContinuePlan: (planId: string) => void;
  onToggleFavourite: (recipeId: string, active: boolean) => void;
  isFavouritePending: boolean;
}) {
  const favouriteIds = new Set(favourites.map((favourite) => favourite.recipeId));

  return (
    <aside className="flex min-h-0 flex-col">
      <div className="border-b border-[#E4E2DD] px-5 py-5">
        <p className="bb-pre">Meal detail</p>
        <h2 className="mt-1 bb-type-section">{meal?.title ?? "Start with this household"}</h2>
        <p className="mt-1 bb-mut">{meal ? formatSource(meal.source) : "Review history or create a new plan."}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {meal ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#E4E2DD] p-3"><p className="bb-label">Times used</p><p className="mt-1 bb-type-section">{meal.totalCount}</p></div>
              <div className="border border-[#E4E2DD] p-3"><p className="bb-label">Favourite</p><p className="mt-1 bb-meta">{favouriteIds.has(meal.recipeId) ? "Saved" : "Not saved"}</p></div>
            </div>
            <div>
              <p className="bb-label">Planned on</p>
              <div className="mt-2 space-y-2">{meal.plannedDates.map((date) => <p key={date} className="bb-meta">{formatDate(date)}</p>)}</div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                disabled={isFavouritePending}
                onClick={() => onToggleFavourite(meal.recipeId, !favouriteIds.has(meal.recipeId))}
                className={["w-full border px-3 py-3 font-[var(--bb-font-sans)] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", favouriteIds.has(meal.recipeId) ? "border-[#171717] bg-[#171717] text-white" : "border-[#171717] text-[#171717] hover:bg-[#FAF9F7]"].join(" ")}
              >
                {favouriteIds.has(meal.recipeId) ? "Remove favourite" : "Save favourite"}
              </button>
              <button type="button" onClick={onNewPlan} className="w-full border border-[#E4E2DD] px-3 py-3 font-[var(--bb-font-sans)] text-[13px] font-medium text-[#171717] hover:bg-[#FAF9F7]">Reuse this context in a new plan →</button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="bb-meta">Choose a past meal in the middle pane to see every date it was used. Your household profile stays visible while you work.</p>
            <div>
              <p className="bb-label">Recent plans</p>
              <div className="mt-2 divide-y divide-[#E4E2DD] border-y border-[#E4E2DD]">
                {recentPlans.length === 0 ? <p className="py-4 bb-mut">No plans yet.</p> : recentPlans.map((plan) => (
                  <button key={plan.id} type="button" onClick={() => onContinuePlan(plan.id)} className="block w-full py-3 text-left hover:bg-[#FAF9F7]">
                    <p className="bb-meta">{plan.title}</p>
                    <p className="mt-1 bb-mut">{formatDate(plan.generatedAt ?? plan.created)} · {statusLabel(plan.status)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
