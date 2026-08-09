import { ArrowRight, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "./ChipSelect";
import type { PastMealRecipe } from "@/hooks/meals/usePastMeals";
import { enhanceImageUrl } from "@/lib/meals/api";
import { formatDisplayTitle } from "@/lib/meals/text";
import {
  useUpdateHousehold,
  type HouseholdPatch,
  type HouseholdWorkspaceData,
  type WorkspaceFavourite,
  type WorkspacePlanSummary,
} from "@/hooks/meals/useHouseholdWorkspace";

/** Scope filter (mutually exclusive). Additional flags compose with this. */
type MealScopeFilter = "all" | "favourites";

const AVOID_RECENT_DEFAULT_DAYS = 28;
const RELATIVE_DATE_MAX_DAYS = 14;

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

function parsePlannedDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = value.includes("T") ? parseISO(value) : new Date(value);
  return isValid(date) ? date : null;
}

function daysSincePlanned(value: string | null | undefined, now = new Date()): number | null {
  const date = parsePlannedDate(value);
  if (!date) return null;
  return Math.max(0, differenceInCalendarDays(now, date));
}

/** Day-floored planned label; absolute past ~14 days. */
function formatPlannedLabel(value: string | null | undefined, now = new Date()): string {
  const days = daysSincePlanned(value, now);
  if (days === null) return "Never planned";
  if (days === 0) return "planned today";
  if (days === 1) return "planned yesterday";
  if (days <= RELATIVE_DATE_MAX_DAYS) return `planned ${days} days ago`;
  return `Last planned ${formatDate(value)}`;
}

function usageCountClass(totalCount: number): string {
  if (totalCount >= 3) return "font-semibold text-[#0A0A0A]";
  if (totalCount === 2) return "font-medium text-[#0A0A0A]/85";
  return "font-normal text-[#0A0A0A]/45";
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
  favourites: WorkspaceFavourite[];
  pastMeals: PastMealRecipe[];
  pastMealsLoading: boolean;
  pastMealsError: boolean;
  selectedMealId: string | null;
  onSelectMeal: (meal: PastMealRecipe) => void;
  onToggleFavourite: (recipeId: string, active: boolean) => void;
  isFavouritePending: boolean;
}

export function MealHistoryPane({
  favourites,
  pastMeals: meals,
  pastMealsLoading: isLoading,
  pastMealsError: isError,
  selectedMealId,
  onSelectMeal,
  onToggleFavourite,
  isFavouritePending,
}: MealHistoryPaneProps) {
  const [scopeFilter, setScopeFilter] = useState<MealScopeFilter>("all");
  const [safeOnly, setSafeOnly] = useState(false);
  const [overusedOnly, setOverusedOnly] = useState(false);
  const favouriteIds = useMemo(() => new Set(favourites.map((favourite) => favourite.recipeId)), [favourites]);
  const now = useMemo(() => new Date(), [meals]);

  const visibleMeals = useMemo(() => {
    return meals.filter((meal) => {
      if (scopeFilter === "favourites" && !favouriteIds.has(meal.recipeId)) return false;
      if (safeOnly) {
        const days = daysSincePlanned(meal.latestPlannedAt, now);
        if (days !== null && days <= AVOID_RECENT_DEFAULT_DAYS) return false;
      }
      if (overusedOnly && meal.totalCount < 3) return false;
      return true;
    });
  }, [favouriteIds, meals, now, overusedOnly, safeOnly, scopeFilter]);

  const filterChipClass = (active: boolean) =>
    [
      "border px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px]",
      active ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#D4D0CB] text-[#696969]",
    ].join(" ");

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[#E4E2DD] px-5 py-5">
        <p className="bb-pre">Past meals</p>
        <div className="mt-1 flex flex-col gap-3">
          <div>
            <h2 className="bb-type-section">Meal history</h2>
            <p className="mt-1 bb-mut">Select a meal to inspect its usage and dates.</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setScopeFilter("all")} className={filterChipClass(scopeFilter === "all")}>
              All
            </button>
            <button type="button" onClick={() => setScopeFilter("favourites")} className={filterChipClass(scopeFilter === "favourites")}>
              Favourites
            </button>
            <button
              type="button"
              onClick={() => setSafeOnly((current) => !current)}
              className={filterChipClass(safeOnly)}
              title="Meals not planned in the last 28 days"
            >
              Not planned in 28 days
            </button>
            <button
              type="button"
              onClick={() => setOverusedOnly((current) => !current)}
              className={filterChipClass(overusedOnly)}
              title="Meals used three or more times"
            >
              Used 3×+
            </button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? <p className="px-5 py-10 bb-meta">Loading past meals…</p> : null}
        {isError ? <p className="px-5 py-10 bb-meta">Past meals could not be loaded.</p> : null}
        {!isLoading && !isError && visibleMeals.length === 0 ? <p className="px-5 py-10 bb-meta">No meals in this view yet.</p> : null}
        {visibleMeals.map((meal) => {
          const isFavourite = favouriteIds.has(meal.recipeId);
          const displayTitle = formatDisplayTitle(meal.title);
          const absoluteDate = formatDate(meal.latestPlannedAt);
          const plannedLabel = formatPlannedLabel(meal.latestPlannedAt, now);

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
              className={[
                "block w-full border-b border-[#E4E2DD] px-5 py-3.5 text-left transition-colors hover:bg-[#FAF9F7]",
                selectedMealId === meal.recipeId ? "border-l-4 border-l-[#0A0A0A] bg-[#FAF9F7] pl-4" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="bb-type-card text-[17px] leading-snug text-[#0A0A0A]">{displayTitle}</p>
                <button
                  type="button"
                  aria-label={isFavourite ? `Remove ${displayTitle} from favourites` : `Save ${displayTitle} as a favourite`}
                  disabled={isFavouritePending}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleFavourite(meal.recipeId, !isFavourite);
                  }}
                  className={[
                    "shrink-0 border px-2 py-1 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    isFavourite
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : "border-[#D4D0CB] text-[#696969] hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                  ].join(" ")}
                >
                  {isFavourite ? "Saved ◇" : "Save ♢"}
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-none">
                <span className="bb-mut" title={absoluteDate !== "—" ? absoluteDate : undefined}>
                  {plannedLabel}
                </span>
                <span className={usageCountClass(meal.totalCount)}>
                  {meal.totalCount >= 3 ? (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#0A0A0A] align-middle" aria-hidden />
                  ) : null}
                  Used {meal.totalCount}×
                </span>
                <span className="bb-mut">{formatSource(meal.source)}</span>
                {meal.feedback === "liked" ? <ThumbsUp className="h-3.5 w-3.5 text-[#0A0A0A]/70" /> : null}
                {meal.feedback === "disliked" ? <ThumbsDown className="h-3.5 w-3.5 text-[#0A0A0A]/70" /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatMacroLine(meal: PastMealRecipe): string | null {
  const parts = [
    typeof meal.calories === "number" ? `${Math.round(meal.calories)} kcal` : null,
    typeof meal.protein === "number" ? `${Math.round(meal.protein)}g protein` : null,
    typeof meal.carbs === "number" ? `${Math.round(meal.carbs)}g carbs` : null,
    typeof meal.fat === "number" ? `${Math.round(meal.fat)}g fat` : null,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : null;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#E4E2DD] p-3">
      <p className="bb-label">{label}</p>
      <p className="mt-1 bb-type-section text-[18px] leading-none">{value}</p>
    </div>
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
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = meal?.image_url ? enhanceImageUrl(meal.image_url) : "";

  useEffect(() => {
    setImageFailed(false);
  }, [meal?.recipeId, imageUrl]);

  const displayTitle = meal ? formatDisplayTitle(meal.title) : "Start with this household";
  const sourceLabel = meal ? formatSource(meal.source) : "Review history or create a new plan.";
  const macroLine = meal ? formatMacroLine(meal) : null;
  const cookTimeLabel = typeof meal?.cook_time === "number" ? `${meal.cook_time} min` : "—";
  const servingsLabel = typeof meal?.servings === "number" ? String(meal.servings) : "—";
  const isFavourite = meal ? favouriteIds.has(meal.recipeId) : false;
  const plannedRows = meal
    ? (meal.plannedOccurrences?.length
        ? meal.plannedOccurrences
        : meal.plannedDates.map((date) => ({ date, count: 1 })))
    : [];

  return (
    <aside className="flex min-h-0 flex-col">
      {meal && imageUrl && !imageFailed ? (
        <div className="border-b border-[#E4E2DD]">
          <img
            src={imageUrl}
            alt={displayTitle}
            onError={() => setImageFailed(true)}
            className="max-h-52 w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="border-b border-[#E4E2DD] px-5 py-5">
        <p className="bb-pre">Meal detail</p>
        <h2 className="mt-1 bb-type-section">{displayTitle}</h2>
        {meal ? (
          meal.source_url ? (
            <a
              href={meal.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[13px] text-[#0A0A0A] underline underline-offset-4"
            >
              {sourceLabel}
            </a>
          ) : (
            <p className="mt-1 bb-mut">{sourceLabel}</p>
          )
        ) : (
          <p className="mt-1 bb-mut">{sourceLabel}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {meal ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Times used" value={String(meal.totalCount)} />
              <DetailStat label="Favourite" value={isFavourite ? "Saved" : "Not saved"} />
              <DetailStat label="Cook time" value={cookTimeLabel} />
              <DetailStat label="Servings" value={servingsLabel} />
            </div>

            {macroLine ? (
              <div>
                <p className="bb-label">Macros</p>
                <p className="mt-2 bb-meta">{macroLine}</p>
              </div>
            ) : null}

            <div>
              <p className="bb-label">Planned on</p>
              <div className="mt-2 space-y-2">
                {plannedRows.length === 0 ? (
                  <p className="bb-meta">—</p>
                ) : (
                  plannedRows.map((entry) => (
                    <p key={entry.date} className="bb-meta">
                      {formatDate(entry.date)}
                      {entry.count > 1 ? ` · ${entry.count}×` : ""}
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={isFavouritePending}
                onClick={() => onToggleFavourite(meal.recipeId, !isFavourite)}
                className={[
                  "w-full border px-3 py-3 font-[var(--bb-font-sans)] text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isFavourite
                    ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                    : "border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#FAF9F7]",
                ].join(" ")}
              >
                {isFavourite ? "Remove favourite" : "Save favourite"}
              </button>
              <button
                type="button"
                onClick={onNewPlan}
                className="w-full border border-[#E4E2DD] px-3 py-3 font-[var(--bb-font-sans)] text-[13px] font-medium text-[#0A0A0A] hover:bg-[#FAF9F7]"
              >
                Reuse this context in a new plan →
              </button>
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
