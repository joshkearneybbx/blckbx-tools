/**
 * Pure renderer: MealPlanResult → standalone client-facing HTML document.
 * Markup/CSS/fonts follow meal-plan-template.html; content is generated for N days.
 * Styles are loaded via Vite ?raw imports so layout CSS cannot be silently dropped.
 */

import {
  getMealMacros,
  getMealPlanItemKey,
  type MealPlanItem,
  type MealPlanResult,
} from "@/lib/meals/api";
import fontsCss from "./assets/mealPlanFonts.css?raw";
import layoutCss from "./assets/mealPlanLayout.css?raw";
import scriptJs from "./assets/mealPlanScript.js?raw";

export interface MealPlanDocumentInput {
  plan: MealPlanResult;
  clientName: string;
}

/** Logo data URI from meal-plan-template.html */
const LOGO_SRC = `data:image/png;base64,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`;

/** Decode common entities so pre-escaped recipe text is not double-escaped. */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'");
}

/** Escape for HTML text/attributes. Idempotent for basic entities. */
function escapeHtml(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mealTitle(meal: MealPlanItem): string {
  return meal.title ?? meal.recipe?.title ?? "Untitled meal";
}

function mealIngredients(meal: MealPlanItem): string[] {
  return meal.ingredients ?? meal.recipe?.ingredients ?? [];
}

function mealInstructions(meal: MealPlanItem): string[] {
  return meal.instructions ?? meal.recipe?.instructions ?? [];
}

function mealCookTime(meal: MealPlanItem): number | undefined {
  // MealCard reads item.cook_time only (not nested recipe).
  return typeof meal.cook_time === "number" && Number.isFinite(meal.cook_time) ? meal.cook_time : undefined;
}

function mealServings(meal: MealPlanItem): number | undefined {
  // MealCard reads item.servings only (not nested recipe).
  return typeof meal.servings === "number" && Number.isFinite(meal.servings) ? meal.servings : undefined;
}

function mealSourceUrl(meal: MealPlanItem): string {
  // MealCard links item.source_url only.
  return (meal.source_url ?? "").trim();
}

/** Only http(s) URLs are safe in this CSP-sandboxed document. */
function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // not a valid absolute URL
  }
  return null;
}

function mealCalories(meal: MealPlanItem, plan: MealPlanResult): number | undefined {
  const macros = getMealMacros(meal, plan.macroOverrides);
  return typeof macros.calories === "number" ? macros.calories : undefined;
}

function assertRenderable(plan: MealPlanResult): void {
  if (!plan.plan?.length) {
    throw new Error("Cannot render meal plan document: plan has no days.");
  }
  if (plan.plan.some((day) => !day.meals?.length)) {
    throw new Error("Cannot render meal plan document: every day must include at least one meal.");
  }
  if (!plan.shopping_list || Object.keys(plan.shopping_list).length === 0) {
    throw new Error("Cannot render meal plan document: shopping list is empty.");
  }
}

function averageKcalPerDay(plan: MealPlanResult): number | null {
  if (plan.daily_summary?.length) {
    const values = plan.daily_summary
      .map((entry) => entry.calories)
      .filter((value): value is number => typeof value === "number" && value > 0);
    if (values.length) {
      return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
    }
  }

  const dayTotals = plan.plan.map((day) =>
    day.meals.reduce((sum, meal) => sum + (mealCalories(meal, plan) ?? 0), 0),
  );
  const positive = dayTotals.filter((value) => value > 0);
  if (!positive.length) return null;
  return Math.round(positive.reduce((sum, value) => sum + value, 0) / positive.length);
}

function mealsPerDay(plan: MealPlanResult): number {
  if (typeof plan.meals_per_day === "number" && plan.meals_per_day > 0) return plan.meals_per_day;
  const counts = plan.plan.map((day) => day.meals.length);
  if (!counts.length) return 0;
  return Math.round(counts.reduce((sum, value) => sum + value, 0) / counts.length);
}

type FlatMeal = {
  recipeDomId: string;
  dayNumber: number;
  meal: MealPlanItem;
};

function flattenMeals(plan: MealPlanResult): FlatMeal[] {
  const flat: FlatMeal[] = [];
  let index = 1;
  plan.plan.forEach((day) => {
    day.meals.forEach((meal) => {
      flat.push({
        recipeDomId: `recipe-${index}`,
        dayNumber: day.day_number,
        meal,
      });
      index += 1;
    });
  });
  return flat;
}

function renderMenuCards(flat: FlatMeal[]): string {
  return flat
    .map(({ recipeDomId, dayNumber, meal }) => {
      const dish = escapeHtml(mealTitle(meal));
      const mealType = escapeHtml(meal.meal_type);
      return [
        `        <a class="menu-card" href="#${recipeDomId}" onclick="openRecipe('${recipeDomId}'); return false;">`,
        `          <p class="menu-day">Day ${dayNumber} · ${mealType}</p>`,
        `          <p class="menu-dish">${dish}</p>`,
        `        </a>`,
      ].join("\n");
    })
    .join("\n\n");
}

function renderRecipeArticles(flat: FlatMeal[], plan: MealPlanResult): string {
  return flat
    .map(({ recipeDomId, dayNumber, meal }) => {
      const title = escapeHtml(mealTitle(meal));
      const cook = mealCookTime(meal);
      const calories = mealCalories(meal, plan);
      const servings = mealServings(meal);
      const sourceUrl = safeHttpUrl(mealSourceUrl(meal));
      const ingredients = mealIngredients(meal);
      const steps = mealInstructions(meal);

      const metaBits: string[] = [];
      if (typeof cook === "number") metaBits.push(`${cook} min`);
      if (typeof calories === "number") metaBits.push(`${Math.round(calories)} kcal`);
      if (typeof servings === "number") metaBits.push(`${servings} servings`);

      const ingredientsHtml = ingredients.length
        ? [
            `            <div class="recipe-col">`,
            `              <p class="col-label">Ingredients</p>`,
            `              <ul class="ingredients">`,
            ...ingredients.map((ingredient) => {
              const text = escapeHtml(ingredient);
              return `                <li data-shop="${text}">${text}<button class="add-btn" type="button" aria-label="Add to shopping list" onclick="addShop(this)"></button></li>`;
            }),
            `              </ul>`,
            `            </div>`,
          ].join("\n")
        : "";

      const methodHtml = steps.length
        ? [
            `            <div class="recipe-col">`,
            `              <p class="col-label">Method</p>`,
            `              <ol class="method">`,
            ...steps.map((step) => `                <li>${escapeHtml(step)}</li>`),
            `              </ol>`,
            `            </div>`,
          ].join("\n")
        : "";

      const sourceHtml = sourceUrl
        ? `            <p class="block-note"><a class="recipe-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">View source</a></p>`
        : "";

      const metaHtml = metaBits.length
        ? `            <div class="recipe-meta">${escapeHtml(metaBits.join(" · "))}</div>`
        : "";

      return [
        `        <article class="recipe" id="${recipeDomId}">`,
        `          <div class="recipe-head" role="button" tabindex="0" aria-expanded="false" onclick="toggleRecipe('${recipeDomId}')">`,
        `            <div class="recipe-head-main">`,
        `              <span class="day-badge">Day ${dayNumber}</span>`,
        `              <span class="recipe-title">${title}</span>`,
        `            </div>`,
        `            <span class="entry-toggle"></span>`,
        `          </div>`,
        `          <div class="recipe-body">`,
        metaHtml,
        sourceHtml,
        ingredientsHtml,
        methodHtml,
        `          </div>`,
        `        </article>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function buildBlckbxData(input: MealPlanDocumentInput, flat: FlatMeal[]) {
  const { plan, clientName } = input;
  const days = plan.num_days && plan.num_days > 0 ? plan.num_days : plan.plan.length;
  const mpd = mealsPerDay(plan);
  const kcal = averageKcalPerDay(plan);
  const stats = plan.stats;

  const shoppingQuantities: Record<string, string> = {};
  Object.entries(plan.shopping_list).forEach(([category, items]) => {
    items.forEach((item) => {
      shoppingQuantities[item] = category;
    });
  });

  return {
    blckbxDataVersion: 1 as const,
    type: "meal-plan" as const,
    subtype: "meal-plan",
    meta: {
      title: plan.title?.trim() || `Meal plan for ${clientName}`,
      documentTitle: `Meal plan for ${clientName}`,
      preHeading: "WEEKLY MEAL PLAN",
      location: null,
      preparedFor: clientName,
      compiledBy: null,
      sourceNote: null,
      intro: null,
    },
    summary: {
      days,
      mealsPerDay: mpd,
      kcalPerDay: kcal,
      recipeCount: stats.recipesCount,
      ingredientCount: stats.ingredientsCount,
      avgCookTimePerMeal:
        stats.recipesCount > 0
          ? `${Math.round(stats.totalCookTimeMinutes / stats.recipesCount)} min`
          : null,
      estimatedCost: stats.estimatedCost || null,
    },
    menu: flat.map(({ recipeDomId, dayNumber, meal }) => ({
      day: dayNumber,
      dish: mealTitle(meal),
      recipeId: recipeDomId,
      mealType: meal.meal_type,
      mealPlanItemId: getMealPlanItemKey(meal),
    })),
    recipes: flat.map(({ recipeDomId, dayNumber, meal }) => {
      const calories = mealCalories(meal, plan);
      const sourceUrl = safeHttpUrl(mealSourceUrl(meal));
      const cook = mealCookTime(meal);
      const servings = mealServings(meal);
      return {
        id: recipeDomId,
        day: dayNumber,
        title: mealTitle(meal),
        cookTime: typeof cook === "number" ? `${cook} min` : null,
        calories: typeof calories === "number" ? Math.round(calories) : null,
        servings: typeof servings === "number" ? servings : null,
        sourceUrl,
        ingredients: mealIngredients(meal).map((text) => ({ text, shop: text })),
        method: mealInstructions(meal),
      };
    }),
    shoppingListMode: "categorised",
    shoppingList: plan.shopping_list,
    shoppingQuantities,
    shoppingTips: [
      "Check your cupboards first and buy produce last to keep it fresh.",
      "Batch-cook proteins to save time mid-week.",
    ],
    footerCta: {
      eyebrow: "Want to adjust anything?",
      headline: "Happy to tailor the week",
      body: "Swaps for preferences, extra portions, or a different cuisine are all easy.",
      footline: "Let your assistant know how you'd like to proceed.",
    },
  };
}

export function renderMealPlanDocument(input: MealPlanDocumentInput): string {
  const clientName = input.clientName.trim() || "Client";
  const plan = input.plan;

  assertRenderable(plan);

  if (!fontsCss.includes("@font-face") || fontsCss.length <= 100_000) {
    throw new Error("Meal plan document fonts CSS failed to load (expected embedded @font-face block).");
  }
  if (!layoutCss.includes(".wrap") || !layoutCss.includes(".shop-count")) {
    throw new Error("Meal plan document layout CSS failed to load (missing .wrap / .shop-count).");
  }
  if (
    !scriptJs.includes("function toggleRecipe")
    || !scriptJs.includes("function addShop")
    || !scriptJs.includes("function hydrateShop")
    || !scriptJs.includes("getElementById('shop-list')")
  ) {
    throw new Error("Meal plan document script failed to load (missing toggleRecipe/addShop/hydrateShop/shop-list).");
  }

  const flat = flattenMeals(plan);
  const days = plan.num_days && plan.num_days > 0 ? plan.num_days : plan.plan.length;
  const mpd = mealsPerDay(plan);
  const kcal = averageKcalPerDay(plan);
  const stats = plan.stats;
  const planTitle = plan.title?.trim() || `Meal plan for ${clientName}`;
  const avgCook =
    stats.recipesCount > 0 ? `${Math.round(stats.totalCookTimeMinutes / stats.recipesCount)} min` : "—";

  const blckbxData = buildBlckbxData({ plan, clientName }, flat);
  // Prevent </script> breakout inside the JSON blob.
  const blckbxJson = JSON.stringify(blckbxData).replace(/</g, "\\u003c");

  const document = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#ffffff">
<meta property="og:title" content="${escapeHtml(`Meal plan for ${clientName} — BlckBx`)}">
<meta property="og:description" content="${escapeHtml(`A ${days}-day meal plan with recipes and shopping list, prepared by BlckBx`)}">
<meta property="og:type" content="article">
<title>${escapeHtml(`BlckBx — Meal plan for ${clientName}`)}</title>
<style>
${fontsCss}
${layoutCss}
</style>
</head>
<body>
<header class="header">
  <div class="wrap">
    <div class="logo"><img src="${LOGO_SRC}" alt="BLCKBX"></div>
    <div class="header-tag">Meal plan</div>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <p class="pre-heading">WEEKLY MEAL PLAN</p>
    <h1>${escapeHtml(planTitle)}</h1>
    <p class="hero-sub"><strong>Prepared for ${escapeHtml(clientName)}</strong></p>
    <div class="plan-pills">
      <span class="plan-pill"><strong>${days}</strong> days</span>
      <span class="plan-pill"><strong>${mpd}</strong> meal${mpd === 1 ? "" : "s"} / day</span>
      ${kcal != null ? `<span class="plan-pill">~<strong>${kcal}</strong> kcal / day</span>` : ""}
    </div>
  </div>
</section>

<div class="wrap">
  <div class="stats-bar">
    <div class="stat"><span class="stat-num">${stats.recipesCount}</span><span class="stat-label">Recipes</span></div>
    <div class="stat"><span class="stat-num">${stats.ingredientsCount}</span><span class="stat-label">Ingredients</span></div>
    <div class="stat"><span class="stat-num">${escapeHtml(avgCook)}</span><span class="stat-label">Avg. per meal</span></div>
    <div class="stat"><span class="stat-num">${escapeHtml(stats.estimatedCost)}</span><span class="stat-label">Est. cost</span></div>
  </div>
</div>

<nav class="section-nav" aria-label="Meal plan sections">
  <div class="wrap">
    <div class="section-nav-inner">
      <a class="nav-link" href="#menu">This week</a>
      <a class="nav-link" href="#recipes">Recipes</a>
      <a class="nav-link" href="#shopping">Shopping list</a>
    </div>
  </div>
</nav>

<main class="main">
  <div class="wrap">
    <section id="menu">
      <h2 class="block-title">This week's menu</h2>
      <p class="block-note">${days} day${days === 1 ? "" : "s"} of meals. <strong>Tap a dish to jump to its recipe.</strong></p>
      <div class="menu-grid">
${renderMenuCards(flat)}
      </div>
    </section>

    <section id="recipes">
      <h2 class="block-title">Recipes</h2>
      <p class="block-note">Full method and ingredients for each dish. <strong>Tap a recipe to expand.</strong></p>
      <div class="recipe-list">
${renderRecipeArticles(flat, plan)}
      </div>
    </section>

    <section id="shopping">
      <h2 class="block-title">Shopping list <span id="shop-count" class="shop-count"></span></h2>
      <p class="block-note">Tap the <span class="inline-plus">+</span> beside any recipe ingredient to add it here. Build a personal list as you plan the shop.</p>
      <div id="shop-panel">
        <p id="shop-empty" class="shop-empty">Your list is empty. Open a recipe above and tap <span class="inline-plus">+</span> on what you need.</p>
        <ul id="shop-list" class="shop-list"></ul>
        <button id="shop-clear" class="shop-clear" type="button" onclick="clearShop()" hidden>Clear list</button>
      </div>
      <div class="tips">
        <p class="tips-label">Shopping tips</p>
        <ul>
          <li>Check your cupboards first and buy produce last to keep it fresh.</li>
          <li>Batch-cook proteins to save time mid-week.</li>
        </ul>
      </div>
    </section>

    <div class="footer-cta">
      <p class="eyebrow">Want to adjust anything?</p>
      <h3>Happy to tailor the week</h3>
      <p>Swaps for preferences, extra portions, or a different cuisine are all easy.</p>
      <p class="cta-footline">Let your assistant know how you'd like to proceed.</p>
    </div>
  </div>
</main>

<footer class="page-footer">
  <div class="wrap">
    <p><span class="brand">BLCKBX</span>blckbx.co.uk · Prepared for ${escapeHtml(clientName)}</p>
  </div>
</footer>

<script type="application/json" id="blckbx-data">${blckbxJson}</script>
<script>
${scriptJs}
</script>
</body>
</html>
`;

  if (document.includes("{{")) {
    throw new Error("Meal plan document still contains unresolved template tokens.");
  }

  return document;
}
