import type { PlanCriteriaValues } from "@/components/meals/PlanCriteria";
import type { MealType } from "@/lib/meals/api";

const ALLOWED_NUM_DAYS = [1, 3, 5, 7, 14] as const;
const ALLOWED_MEALS_PER_DAY = [1, 2, 3] as const;
const ALLOWED_MEAL_TYPES = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);

export interface LatestPlanDefaults {
  num_days: number;
  meals_per_day: number;
  criteria: unknown;
}

export const INITIAL_CRITERIA: PlanCriteriaValues = {
  free_prompt: "",
  num_days: 3,
  meals_per_day: 2,
  meal_types: ["lunch", "dinner"],
  focus_tags: [],
  reuse: {
    include_favourites: true,
    avoid_recent: true,
    avoid_recent_days: 28,
  },
  advanced: {},
};

function cloneInitial(): PlanCriteriaValues {
  return {
    ...INITIAL_CRITERIA,
    meal_types: [...INITIAL_CRITERIA.meal_types],
    focus_tags: [...INITIAL_CRITERIA.focus_tags],
    reuse: { ...INITIAL_CRITERIA.reuse },
    advanced: { ...INITIAL_CRITERIA.advanced },
  };
}

function parseCriteriaBlob(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return null;
}

function asAllowedNumDays(value: unknown): number | null {
  const next = Number(value);
  return (ALLOWED_NUM_DAYS as readonly number[]).includes(next) ? next : null;
}

function asAllowedMealsPerDay(value: unknown): number | null {
  const next = Number(value);
  return (ALLOWED_MEALS_PER_DAY as readonly number[]).includes(next) ? next : null;
}

function asMealTypes(value: unknown): MealType[] | null {
  if (!Array.isArray(value)) return null;
  const next = value.filter((item): item is MealType => ALLOWED_MEAL_TYPES.has(item as MealType));
  return next.length > 0 ? next : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asPositiveInteger(value: unknown): number | null {
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return null;
  return next;
}

export function criteriaFromLatestPlan(latest: LatestPlanDefaults | null): PlanCriteriaValues {
  const defaults = cloneInitial();
  if (!latest) return defaults;

  const criteria = parseCriteriaBlob(latest.criteria);
  const reuseRaw = criteria?.reuse && typeof criteria.reuse === "object" && !Array.isArray(criteria.reuse)
    ? criteria.reuse as Record<string, unknown>
    : null;

  defaults.num_days = asAllowedNumDays(latest.num_days) ?? defaults.num_days;
  defaults.meals_per_day = asAllowedMealsPerDay(latest.meals_per_day) ?? defaults.meals_per_day;
  defaults.meal_types = asMealTypes(criteria?.meal_types) ?? defaults.meal_types;
  defaults.reuse.include_favourites = asBoolean(reuseRaw?.include_favourites) ?? defaults.reuse.include_favourites;
  defaults.reuse.avoid_recent = asBoolean(reuseRaw?.avoid_recent) ?? defaults.reuse.avoid_recent;
  defaults.reuse.avoid_recent_days = asPositiveInteger(reuseRaw?.avoid_recent_days)
    ?? asPositiveInteger(reuseRaw?.recent_window_days)
    ?? defaults.reuse.avoid_recent_days;

  return defaults;
}
