import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "@/hooks/use-toast";
import type { MealCraftClient, MealCraftRecipe, MealPlanDay, MealPlanItem, MealPlanResult, ShoppingList } from "@/lib/meals/api";
import { computeMealPlanStats, enhanceImageUrl } from "@/lib/meals/api";
import { StepIndicator } from "@/components/meals/StepIndicator";
import { ClientSelect } from "@/components/meals/ClientSelect";
import { PlanCriteria, type PlanCriteriaValues } from "@/components/meals/PlanCriteria";
import { GeneratingLoader } from "@/components/meals/GeneratingLoader";
import { PlanReview } from "@/components/meals/PlanReview";
import { ShoppingList as ShoppingListSection } from "@/components/meals/ShoppingList";
import { Button } from "@/components/ui/button";
import { useGeneratePlan } from "@/hooks/meals/useGeneratePlan";
import { useSwapMeal } from "@/hooks/meals/useSwapMeal";
import { useMealFeedback } from "@/hooks/meals/useMealFeedback";
import { MealPlanPDF } from "@/components/meals/pdf/MealPlanPDF";
import { pb } from "@/lib/pocketbase";
import { useRecentPlans } from "@/hooks/meals/useClientPlans";
import { fetchRecipeImages } from "@/lib/meals/pdfImages";

const INITIAL_CRITERIA: PlanCriteriaValues = {
  free_prompt: "",
  num_days: 3,
  meals_per_day: 2,
  meal_types: ["lunch", "dinner"],
  focus_tags: [],
  advanced: {},
};

function mergeDailySummary(result: MealPlanResult): MealPlanResult {
  if (!result.daily_summary?.length) return result;

  const summaryMap = new Map(result.daily_summary.map((s) => [s.day_number, s]));
  return {
    ...result,
    plan: result.plan.map((day) => {
      const summary = summaryMap.get(day.day_number);
      return {
        ...day,
        calories: summary?.calories ?? day.calories,
        protein: summary?.protein ?? day.protein,
      };
    }),
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClasses(status: string): string {
  if (status === "active") return "bg-[#E8F5E9] text-[#1EA86B]";
  if (status === "completed") return "bg-[#F8F8F8] text-[#6B6B68]";
  if (status === "archived") return "bg-[#F8F8F8] text-[#9B9797]";
  return "bg-[#E6E5E0] text-[#424242]";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizeShoppingList(value: unknown): ShoppingList {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value as Record<string, unknown>).reduce<ShoppingList>((acc, [key, rawItems]) => {
    acc[key] = asStringArray(rawItems);
    return acc;
  }, {});
}

function mapRecipeRecord(record: any): MealCraftRecipe {
  return {
    id: String(record.id),
    title: String(record.title ?? "Untitled recipe"),
    source: record.source ? String(record.source) : undefined,
    source_url: record.source_url ? String(record.source_url) : undefined,
    image_url: record.image_url ? enhanceImageUrl(String(record.image_url)) : undefined,
    cook_time: typeof record.cook_time === "number" ? record.cook_time : undefined,
    prep_time: typeof record.prep_time === "number" ? record.prep_time : undefined,
    calories: typeof record.calories === "number" ? record.calories : undefined,
    protein: typeof record.protein === "number" ? record.protein : undefined,
    carbs: typeof record.carbs === "number" ? record.carbs : undefined,
    fat: typeof record.fat === "number" ? record.fat : undefined,
    servings: typeof record.servings === "number" ? record.servings : undefined,
    ingredients: asStringArray(record.ingredients),
    instructions: asStringArray(record.instructions),
  };
}

function buildPlanResultFromPocketBase(planRecord: any, itemRecords: any[]): MealPlanResult {
  const dayMap = new Map<number, MealPlanItem[]>();

  itemRecords.forEach((item) => {
    const dayNumber = Number(item.day_number ?? 0);
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) return;

    const recipe = item.expand?.recipe ? mapRecipeRecord(item.expand.recipe) : undefined;

    const meal: MealPlanItem = {
      id: String(item.id),
      meal_plan_item_id: String(item.id),
      recipe_id: String(item.recipe ?? recipe?.id ?? ""),
      day_number: dayNumber,
      meal_type: String(item.meal_type ?? "dinner") as MealPlanItem["meal_type"],
      feedback: (item.feedback ?? null) as "liked" | "disliked" | null,
      recipe,
      title: recipe?.title ?? "Untitled meal",
      source: recipe?.source,
      source_url: recipe?.source_url,
      image_url: recipe?.image_url,
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
      cook_time: recipe?.cook_time,
      calories: recipe?.calories,
      protein: recipe?.protein,
      servings: recipe?.servings,
    };

    const dayMeals = dayMap.get(dayNumber) ?? [];
    dayMeals.push(meal);
    dayMap.set(dayNumber, dayMeals);
  });

  const plan: MealPlanDay[] = Array.from(dayMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([dayNumber, meals]) => ({
      day_number: dayNumber,
      label: `Day ${dayNumber}`,
      meals,
    }));

  return {
    meal_plan_id: String(planRecord.id),
    title: String(planRecord.title ?? `Meal Plan - ${formatDate(String(planRecord.created ?? ""))}`),
    status: (String(planRecord.status ?? "draft") as MealPlanResult["status"]) ?? "draft",
    num_days: Number(planRecord.num_days ?? plan.length),
    meals_per_day: Number(planRecord.meals_per_day ?? 0),
    plan,
    shopping_list: normalizeShoppingList(planRecord.shopping_list),
    stats: computeMealPlanStats(plan),
  };
}

export default function MealCraftPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<MealCraftClient | null>(null);
  const [criteria, setCriteria] = useState<PlanCriteriaValues>(INITIAL_CRITERIA);
  const [planResult, setPlanResult] = useState<MealPlanResult | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isMarkingAsSent, setIsMarkingAsSent] = useState(false);

  const generateMutation = useGeneratePlan();
  const swapMutation = useSwapMeal();
  const feedbackMutation = useMealFeedback();
  const { data: recentPlans = [] } = useRecentPlans(currentStep === 1);

  const isGenerating = generateMutation.isPending;
  const showLoading = isGenerating;

  const stepToRender = useMemo(() => {
    if (showLoading) return 0;
    return currentStep;
  }, [currentStep, showLoading]);

  const loadExistingPlan = async (planId: string, fallbackClient?: MealCraftClient) => {
    setIsLoadingPlan(true);

    try {
      const [planRecord, itemRecords] = await Promise.all([
        pb.collection("meal_plans").getOne(planId, { expand: "client" }),
        pb.collection("meal_plan_items").getFullList({
          filter: `meal_plan = "${planId}"`,
          expand: "recipe",
          sort: "day_number",
        }),
      ]);

      const loadedPlan = buildPlanResultFromPocketBase(planRecord, itemRecords);
      setPlanResult(loadedPlan);

      const clientFromPlan = planRecord.expand?.client
        ? {
            id: String(planRecord.expand.client.id),
            name: String(planRecord.expand.client.name ?? "Client"),
            dietary: asStringArray(planRecord.expand.client.dietary),
            dislikes: asStringArray(planRecord.expand.client.dislikes),
            household_size: typeof planRecord.expand.client.household_size === "number"
              ? planRecord.expand.client.household_size
              : undefined,
            notes: planRecord.expand.client.notes ? String(planRecord.expand.client.notes) : undefined,
          }
        : fallbackClient ?? null;

      if (clientFromPlan) {
        setSelectedClient(clientFromPlan);
      }

      const planCriteria = (planRecord.criteria && typeof planRecord.criteria === "object")
        ? planRecord.criteria as any
        : {};

      setCriteria((current) => ({
        ...current,
        num_days: Number(planRecord.num_days ?? current.num_days),
        meals_per_day: Number(planRecord.meals_per_day ?? current.meals_per_day),
        free_prompt: typeof planCriteria.free_prompt === "string" ? planCriteria.free_prompt : current.free_prompt,
        meal_types: Array.isArray(planCriteria.meal_types) ? planCriteria.meal_types : current.meal_types,
        focus_tags: Array.isArray(planCriteria.focus_tags) ? planCriteria.focus_tags : current.focus_tags,
      }));

      setCurrentStep(3);
      setMaxCompletedStep(3);
      toast({ title: "Plan loaded", description: "Loaded existing meal plan for editing." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load plan";
      toast({ title: "Load failed", description: message, variant: "destructive" });
      throw error;
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClient) return;

    try {
      const generated = await generateMutation.mutateAsync({
        client_id: selectedClient.id,
        num_days: criteria.num_days,
        meals_per_day: criteria.meals_per_day,
        meal_types: criteria.meal_types,
        focus_tags: criteria.focus_tags,
        free_prompt: criteria.free_prompt,
      });

      const merged = mergeDailySummary(generated);
      setPlanResult(merged);
      setCurrentStep(3);
      setMaxCompletedStep(3);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate meal plan";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    }
  };

  const handleSwapMeal = async (
    mealPlanItemId: string,
    payload: { mode: "suggest" | "specific"; reason?: string; replacement_recipe_id?: string }
  ) => {
    if (!planResult?.meal_plan_id) return;

    try {
      const swapResult = await swapMutation.mutateAsync({
        meal_plan_id: planResult.meal_plan_id,
        meal_plan_item_id: mealPlanItemId,
        ...payload,
      });

      const recipeRecord = await pb.collection("recipes").getOne(swapResult.swapped.new_recipe_id);
      const replacementRecipe = mapRecipeRecord(recipeRecord);

      setPlanResult((current) => {
        if (!current) return current;

        const nextPlan = current.plan.map((day) => ({
          ...day,
          meals: day.meals.map((meal) => {
            if ((meal.meal_plan_item_id ?? meal.id) !== swapResult.swapped.meal_plan_item_id) {
              return meal;
            }

            return {
              ...meal,
              title: swapResult.swapped.new_title || replacementRecipe.title,
              recipe_id: swapResult.swapped.new_recipe_id,
              recipe: replacementRecipe,
              source: replacementRecipe.source,
              source_url: replacementRecipe.source_url,
              image_url: replacementRecipe.image_url,
              ingredients: replacementRecipe.ingredients,
              instructions: replacementRecipe.instructions,
              cook_time: replacementRecipe.cook_time,
              calories: replacementRecipe.calories,
              protein: replacementRecipe.protein,
              servings: replacementRecipe.servings,
            };
          }),
        }));

        return {
          ...current,
          meal_plan_id: swapResult.meal_plan_id || current.meal_plan_id,
          plan: nextPlan,
          shopping_list: swapResult.shopping_list,
          stats: computeMealPlanStats(nextPlan),
        };
      });

      const description = swapResult.swapped.reasoning
        ? `Plan updated. ${swapResult.swapped.reasoning}`
        : "Plan and shopping list updated.";
      toast({ title: "Meal swapped", description });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to swap meal";
      toast({ title: "Swap failed", description: message, variant: "destructive" });
      throw error;
    }
  };

  const handleFeedback = async (mealPlanItemId: string, feedback: "liked" | "disliked") => {
    const nextFeedback = planResult?.plan
      .flatMap((day) => day.meals)
      .find((meal) => (meal.meal_plan_item_id ?? meal.id) === mealPlanItemId)?.feedback === feedback
      ? null
      : feedback;

    setPlanResult((current) => {
      if (!current) return current;
      return {
        ...current,
        plan: current.plan.map((day) => ({
          ...day,
          meals: day.meals.map((meal) => {
            if ((meal.meal_plan_item_id ?? meal.id) !== mealPlanItemId) return meal;
            return { ...meal, feedback: nextFeedback };
          }),
        })),
      };
    });

    try {
      await feedbackMutation.mutateAsync({ mealPlanItemId, feedback: nextFeedback });
    } catch {
      toast({ title: "Feedback failed", description: "Could not save feedback.", variant: "destructive" });
    }
  };

  const handleExportPdf = async () => {
    if (!planResult || !selectedClient) return;

    setIsExportingPdf(true);
    try {
      const imageEntries = planResult.plan
        .flatMap((day) => day.meals)
        .map((meal) => ({
          id: meal.recipe?.id || meal.recipe_id || meal.id,
          url: meal.image_url || meal.recipe?.image_url || "",
        }))
        .filter((entry) => entry.id && entry.url);

      const uniqueImages = Array.from(
        new Map(imageEntries.map((entry) => [entry.id, entry])).values()
      );

      const imageMap = await fetchRecipeImages(uniqueImages);

      const blob = await pdf(
        <MealPlanPDF
          clientName={selectedClient.name}
          generatedAt={new Date()}
          numDays={criteria.num_days}
          mealsPerDay={criteria.meals_per_day}
          focusTags={criteria.focus_tags}
          plan={planResult.plan}
          shoppingList={planResult.shopping_list}
          stats={planResult.stats}
          images={imageMap}
        />
      ).toBlob();

      const safeClientName = selectedClient.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const today = new Date().toISOString().slice(0, 10);
      const filename = `meal-plan-${safeClientName || "client"}-${today}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({ title: "PDF ready", description: "Meal plan PDF downloaded." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate PDF";
      toast({ title: "PDF generation failed", description: message, variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!planResult?.meal_plan_id) return;

    setIsMarkingAsSent(true);
    try {
      await pb.collection("meal_plans").update(planResult.meal_plan_id, { status: "active" });
      setPlanResult((current) => (current ? { ...current, status: "active" } : current));
      toast({ title: "Plan updated", description: "Marked as sent to client." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast({ title: "Status update failed", description: message, variant: "destructive" });
    } finally {
      setIsMarkingAsSent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E6E5E0] [font-family:Inter,sans-serif]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        <div className="mb-6 flex items-center justify-between rounded-[10px] border border-[#E6E5E0] bg-white px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">MealCraft</h1>
          </div>
        </div>

        <StepIndicator
          currentStep={currentStep}
          maxCompletedStep={maxCompletedStep}
          onStepClick={(step) => {
            if (step <= maxCompletedStep) {
              setCurrentStep(step);
            }
          }}
        />

        {stepToRender === 0 ? <GeneratingLoader /> : null}

        {stepToRender === 1 ? (
          <div className="space-y-4">
            {recentPlans.length > 0 ? (
              <div className="rounded-[14px] border border-[#E6E5E0] bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-bold text-[#1a1a1a]">Recent Plans</h3>
                <div className="space-y-2">
                  {recentPlans.map((plan) => (
                    <div key={plan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E6E5E0] bg-[#FAF9F8] px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-[#1a1a1a]">{plan.client_name} • {plan.title}</p>
                        <p className="text-xs text-[#6B6B68]">
                          {formatDate(plan.created)} • {plan.num_days} days • {plan.meals_per_day} meals/day
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={["rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", statusClasses(plan.status)].join(" ")}>
                          {plan.status}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-[#E7C51C] px-3 text-xs text-black hover:bg-[#d4b419]"
                          disabled={isLoadingPlan}
                          onClick={() => {
                            const client: MealCraftClient = {
                              id: plan.client_id,
                              name: plan.client_name,
                            };
                            void loadExistingPlan(plan.id, client);
                          }}
                        >
                          {isLoadingPlan ? "Loading..." : "Load"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <ClientSelect
              selectedClient={selectedClient}
              onSelectClient={(client) => setSelectedClient(client)}
              onContinue={() => {
                setCurrentStep(2);
                setMaxCompletedStep(Math.max(maxCompletedStep, 2));
              }}
              onLoadPlan={loadExistingPlan}
              isLoadingPlan={isLoadingPlan}
            />
          </div>
        ) : null}

        {stepToRender === 2 && selectedClient ? (
          <PlanCriteria
            client={selectedClient}
            values={criteria}
            onChange={setCriteria}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : null}

        {stepToRender === 3 && planResult ? (
          <PlanReview
            planResult={planResult}
            onRegenerate={() => setCurrentStep(2)}
            onNext={() => {
              setCurrentStep(4);
              setMaxCompletedStep(4);
            }}
            onSwapMeal={handleSwapMeal}
            isSwapping={swapMutation.isPending}
            onFeedback={handleFeedback}
          />
        ) : null}

        {stepToRender === 4 && planResult ? (
          <ShoppingListSection
            shoppingList={planResult.shopping_list}
            onBack={() => setCurrentStep(3)}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
            onMarkAsSent={handleMarkAsSent}
            isMarkingAsSent={isMarkingAsSent}
            canMarkAsSent={planResult.status !== "active"}
          />
        ) : null}
      </div>
    </div>
  );
}
