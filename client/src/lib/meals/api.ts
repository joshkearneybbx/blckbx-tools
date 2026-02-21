export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealCraftClient {
  id: string;
  name: string;
  dietary?: string[];
  dislikes?: string[];
  household_size?: number;
  notes?: string;
}

export interface MealCraftRecipe {
  id: string;
  title: string;
  source?: string;
  source_url?: string;
  image_url?: string;
  cook_time?: number;
  prep_time?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servings?: number;
  ingredients?: string[];
  instructions?: string[];
  meal_type?: MealType[];
}

export interface MealPlanItem {
  id: string;
  meal_plan_item_id?: string;
  recipe_id?: string;
  day_number: number;
  meal_type: MealType;
  feedback?: "liked" | "disliked" | null;
  recipe?: MealCraftRecipe;
  title?: string;
  source?: string;
  source_url?: string;
  ingredients?: string[];
  instructions?: string[];
  cook_time?: number;
  calories?: number;
  protein?: number;
  servings?: number;
}

export interface MealPlanDay {
  day_number: number;
  label?: string;
  meals: MealPlanItem[];
  calories?: number;
  protein?: number;
}

export type ShoppingList = Record<string, string[]>;

export interface MealPlanStats {
  recipesCount: number;
  ingredientsCount: number;
  totalCookTimeMinutes: number;
  estimatedCost: string;
}

export interface MealPlanResult {
  meal_plan_id: string;
  title?: string;
  status?: "draft" | "active" | "completed" | "archived";
  num_days?: number;
  meals_per_day?: number;
  plan: MealPlanDay[];
  daily_summary?: Array<{ day_number: number; calories?: number; protein?: number }>;
  shopping_list: ShoppingList;
  warnings?: string[];
  shopping_overlap_notes?: string;
  stats: MealPlanStats;
}

export interface GenerateMealPlanPayload {
  client_id: string;
  num_days: number;
  meals_per_day: number;
  meal_types: MealType[];
  focus_tags: string[];
  free_prompt: string;
}

export interface SwapMealPayload {
  meal_plan_id: string;
  meal_plan_item_id: string;
  mode: "suggest" | "specific";
  reason?: string;
  replacement_recipe_id?: string;
}

export interface SwapMealResult {
  meal_plan_id: string;
  swapped: {
    meal_plan_item_id: string;
    new_recipe_id: string;
    new_title: string;
    reasoning: string;
  };
  shopping_list: ShoppingList;
}

const GENERATE_TIMEOUT_MS = 180_000;
const SWAP_TIMEOUT_MS = 120_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  if (!url) {
    throw new Error("MealCraft webhook URL is missing from environment variables.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: withTimeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `MealCraft request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function asArrayString(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  return [];
}

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function computeMealPlanStats(days: MealPlanDay[]): MealPlanStats {
  const meals = days.flatMap((day) => day.meals);
  const recipeIds = new Set<string>();
  let totalCookTimeMinutes = 0;
  let ingredientsCount = 0;

  meals.forEach((meal) => {
    if (meal.recipe?.id) {
      recipeIds.add(meal.recipe.id);
    } else if (meal.recipe_id) {
      recipeIds.add(meal.recipe_id);
    } else if (meal.meal_plan_item_id) {
      recipeIds.add(meal.meal_plan_item_id);
    }

    totalCookTimeMinutes += meal.cook_time ?? meal.recipe?.cook_time ?? 0;
    ingredientsCount += (meal.ingredients ?? meal.recipe?.ingredients ?? []).length;
  });

  const costEstimate = Math.max(18, Math.round(ingredientsCount * 0.7));

  return {
    recipesCount: recipeIds.size || meals.length,
    ingredientsCount,
    totalCookTimeMinutes,
    estimatedCost: `~£${costEstimate}`,
  };
}

function normalizeMeal(rawMeal: any, dayNumber: number): MealPlanItem {
  const recipe = rawMeal.recipe
    ? {
        id: String(rawMeal.recipe.id ?? rawMeal.recipe.recipe_id ?? rawMeal.recipe.title ?? crypto.randomUUID()),
        title: String(rawMeal.recipe.title ?? rawMeal.title ?? "Untitled meal"),
        source: rawMeal.recipe.source,
        source_url: rawMeal.recipe.source_url,
        image_url: rawMeal.recipe.image_url,
        cook_time: toNumber(rawMeal.recipe.cook_time),
        prep_time: toNumber(rawMeal.recipe.prep_time),
        calories: toNumber(rawMeal.recipe.calories),
        protein: toNumber(rawMeal.recipe.protein),
        carbs: toNumber(rawMeal.recipe.carbs),
        fat: toNumber(rawMeal.recipe.fat),
        servings: toNumber(rawMeal.recipe.servings),
        ingredients: asArrayString(rawMeal.recipe.ingredients),
        instructions: asArrayString(rawMeal.recipe.instructions),
      }
    : undefined;

  const mealType = String(rawMeal.meal_type ?? rawMeal.type ?? "dinner") as MealType;

  return {
    id: String(rawMeal.id ?? rawMeal.meal_plan_item_id ?? crypto.randomUUID()),
    meal_plan_item_id: rawMeal.meal_plan_item_id ? String(rawMeal.meal_plan_item_id) : undefined,
    day_number: toNumber(rawMeal.day_number) ?? dayNumber,
    meal_type: mealType,
    feedback: rawMeal.feedback ?? null,
    recipe,
    title: String(rawMeal.title ?? recipe?.title ?? "Untitled meal"),
    source: String(rawMeal.source ?? recipe?.source ?? ""),
    source_url: String(rawMeal.source_url ?? recipe?.source_url ?? ""),
    ingredients: asArrayString(rawMeal.ingredients).length
      ? asArrayString(rawMeal.ingredients)
      : recipe?.ingredients,
    instructions: asArrayString(rawMeal.instructions).length
      ? asArrayString(rawMeal.instructions)
      : recipe?.instructions,
    cook_time: toNumber(rawMeal.cook_time) ?? recipe?.cook_time,
    calories: toNumber(rawMeal.calories) ?? recipe?.calories,
    protein: toNumber(rawMeal.protein) ?? recipe?.protein,
    servings: toNumber(rawMeal.servings) ?? recipe?.servings,
  };
}

function normalizePlanResponse(raw: any): MealPlanResult {
  const rawPlan = Array.isArray(raw?.plan) ? raw.plan : [];

  const plan = rawPlan.map((rawDay: any, index: number) => {
    const dayNumber = toNumber(rawDay.day_number) ?? index + 1;
    const rawMeals = Array.isArray(rawDay.meals) ? rawDay.meals : [];

    return {
      day_number: dayNumber,
      label: rawDay.label ? String(rawDay.label) : `Day ${dayNumber}`,
      calories: toNumber(rawDay.calories),
      protein: toNumber(rawDay.protein),
      meals: rawMeals.map((meal: any) => normalizeMeal(meal, dayNumber)),
    } satisfies MealPlanDay;
  });

  const dailySummary = Array.isArray(raw?.daily_summary)
    ? raw.daily_summary.map((s: any) => ({
        day_number: toNumber(s.day_number) ?? 0,
        calories: toNumber(s.calories),
        protein: toNumber(s.protein),
      }))
    : undefined;

  const shoppingList = raw?.shopping_list && typeof raw.shopping_list === "object"
    ? (Object.entries(raw.shopping_list).reduce<ShoppingList>((acc, [key, value]) => {
        acc[key] = asArrayString(value);
        return acc;
      }, {}))
    : {};

  return {
    meal_plan_id: String(raw?.meal_plan_id ?? ""),
    plan,
    daily_summary: dailySummary,
    shopping_list: shoppingList,
    warnings: asArrayString(raw?.warnings),
    shopping_overlap_notes: raw?.shopping_overlap_notes ? String(raw.shopping_overlap_notes) : undefined,
    stats: computeMealPlanStats(plan),
  };
}

function normalizeShoppingList(rawShoppingList: unknown): ShoppingList {
  if (!rawShoppingList || typeof rawShoppingList !== "object") {
    return {};
  }

  return Object.entries(rawShoppingList as Record<string, unknown>).reduce<ShoppingList>((acc, [key, value]) => {
    acc[key] = asArrayString(value);
    return acc;
  }, {});
}

export async function generateMealPlan(payload: GenerateMealPlanPayload): Promise<MealPlanResult> {
  const raw = await postJson<any>(import.meta.env.VITE_MEALCRAFT_GENERATE_WEBHOOK, payload, GENERATE_TIMEOUT_MS);
  return normalizePlanResponse(raw);
}

export async function swapMeal(payload: SwapMealPayload): Promise<SwapMealResult> {
  const raw = await postJson<any>(import.meta.env.VITE_MEALCRAFT_SWAP_WEBHOOK, payload, SWAP_TIMEOUT_MS);

  return {
    meal_plan_id: String(raw?.meal_plan_id ?? ""),
    swapped: {
      meal_plan_item_id: String(raw?.swapped?.meal_plan_item_id ?? ""),
      new_recipe_id: String(raw?.swapped?.new_recipe_id ?? ""),
      new_title: String(raw?.swapped?.new_title ?? ""),
      reasoning: String(raw?.swapped?.reasoning ?? ""),
    },
    shopping_list: normalizeShoppingList(raw?.shopping_list),
  };
}
