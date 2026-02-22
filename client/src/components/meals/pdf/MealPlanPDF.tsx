import { Document } from "@react-pdf/renderer";
import type { MealPlanDay, MealPlanStats, ShoppingList } from "@/lib/meals/api";
import { PDFCoverPage } from "./PDFCoverPage";
import { PDFRecipeItem, PDFRecipePage } from "./PDFRecipePage";
import { PDFShoppingPage } from "./PDFShoppingPage";

interface MealPlanPDFProps {
  clientName: string;
  generatedAt: Date;
  numDays: number;
  mealsPerDay: number;
  focusTags: string[];
  plan: MealPlanDay[];
  shoppingList: ShoppingList;
  stats: MealPlanStats;
  images?: Record<string, string>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function round(value: number): number {
  return Math.round(value);
}

export function MealPlanPDF({
  clientName,
  generatedAt,
  numDays,
  mealsPerDay,
  focusTags,
  plan,
  shoppingList,
  stats,
  images,
}: MealPlanPDFProps) {
  const dateLabel = formatDate(generatedAt);

  const recipes: PDFRecipeItem[] = plan.flatMap((day) =>
    day.meals.map((meal) => ({
      ...meal,
      pdfDayNumber: meal.day_number || day.day_number,
    }))
  );

  const menuOverview = plan.map((day) => ({
    dayLabel: `Day ${day.day_number}`,
    title: day.meals[0]?.title ?? day.meals[0]?.recipe?.title ?? "Meal plan entry",
  }));

  const firstRecipe = recipes[0] ?? null;
  const remainingRecipes = recipes.slice(1);
  const recipePageChunks = chunk(remainingRecipes, 2);

  const totalCalories = plan.reduce((sum, day) => {
    return sum + day.meals.reduce((mealSum, meal) => mealSum + (meal.calories ?? meal.recipe?.calories ?? 0), 0);
  }, 0);

  const averageKcalPerDay = plan.length > 0 ? round(totalCalories / plan.length) : 0;

  return (
    <Document title={`Meal Plan - ${clientName}`}>
      <PDFCoverPage
        dateLabel={dateLabel}
        pageNumber={1}
        numDays={numDays}
        mealsPerDay={mealsPerDay}
        averageKcalPerDay={averageKcalPerDay}
        focusTags={focusTags}
        stats={stats}
        menuOverview={menuOverview}
        firstRecipe={firstRecipe}
        images={images}
      />

      {recipePageChunks.map((recipesChunk, index) => (
        <PDFRecipePage
          key={`recipe-page-${index}`}
          dateLabel={dateLabel}
          pageNumber={index + 2}
          recipes={recipesChunk}
          images={images}
        />
      ))}

      <PDFShoppingPage
        dateLabel={dateLabel}
        numDays={numDays}
        shoppingList={shoppingList}
      />
    </Document>
  );
}
