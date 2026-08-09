import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "@/hooks/use-toast";
import type { MacroOverride, MealCraftClient, MealCraftRecipe, MealPlanDay, MealPlanItem, MealPlanResult, PlanReuseConfig, ShoppingList } from "@/lib/meals/api";
import { computeMealPlanStats, enhanceImageUrl, getMealPlanItemKey, MealCraftHttpError, mealItemOrigin, pocketbaseRecipeId, sortMealsByType } from "@/lib/meals/api";
import { renderMealPlanDocument } from "@/lib/meals/mealPlanDocument";
import { isLinksApiError, uploadFile } from "@/features/links/api";
import { StepIndicator } from "@/components/meals/StepIndicator";
import { PlanCriteria, type PlanCriteriaValues } from "@/components/meals/PlanCriteria";
import { GeneratingLoader } from "@/components/meals/GeneratingLoader";
import { PlanReview } from "@/components/meals/PlanReview";
import { ShoppingList as ShoppingListSection } from "@/components/meals/ShoppingList";
import { ImportRecipeModal } from "@/components/meals/ImportRecipeModal";
import { Button } from "@/components/ui/button";
import { useGeneratePlan } from "@/hooks/meals/useGeneratePlan";
import { useSwapMeal } from "@/hooks/meals/useSwapMeal";
import { useMealFeedback } from "@/hooks/meals/useMealFeedback";
import { MealPlanPDF } from "@/components/meals/pdf/MealPlanPDF";
import { pb } from "@/lib/pocketbase";
import { fetchRecipeImages } from "@/lib/meals/pdfImages";
import type { PastMealRecipe } from "@/hooks/meals/usePastMeals";
import type { WorkspaceFavourite, WorkspacePlanSummary } from "@/hooks/meals/useHouseholdWorkspace";

const INITIAL_CRITERIA: PlanCriteriaValues = {
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
  const noteOverrides: Record<string, string> = {};

  itemRecords.forEach((item) => {
    const dayNumber = Number(item.day_number ?? 0);
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) return;

    const recipe = item.expand?.recipe ? mapRecipeRecord(item.expand.recipe) : undefined;

    const origin = mealItemOrigin(item.origin);
    const meal: MealPlanItem = {
      id: String(item.id),
      meal_plan_item_id: String(item.id),
      // Always a string for downstream consumers that treat recipe_id as present text.
      recipe_id: pocketbaseRecipeId(item, recipe) ?? "",
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
      carbs: recipe?.carbs,
      fat: recipe?.fat,
      servings: recipe?.servings,
      ...(origin ? { origin } : {}),
      ...(typeof item.was_favourite === "boolean" ? { was_favourite: item.was_favourite } : {}),
    };

    const clientNote = typeof item.client_note === "string" ? item.client_note.trim() : "";
    if (clientNote) {
      noteOverrides[meal.meal_plan_item_id ?? meal.id] = clientNote;
    }

    const dayMeals = dayMap.get(dayNumber) ?? [];
    dayMeals.push(meal);
    dayMap.set(dayNumber, dayMeals);
  });

  const plan: MealPlanDay[] = Array.from(dayMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([dayNumber, meals]) => ({
      day_number: dayNumber,
      label: `Day ${dayNumber}`,
      meals: sortMealsByType(meals),
    }));

  const documentUrl = typeof planRecord.document_url === "string" && planRecord.document_url.trim()
    ? planRecord.document_url.trim()
    : undefined;
  const documentGeneratedAt = typeof planRecord.document_generated_at === "string" && planRecord.document_generated_at.trim()
    ? planRecord.document_generated_at.trim()
    : undefined;

  return {
    meal_plan_id: String(planRecord.id),
    title: String(planRecord.title ?? `Meal Plan - ${formatDate(String(planRecord.created ?? ""))}`),
    status: (String(planRecord.status ?? "draft") as MealPlanResult["status"]) ?? "draft",
    num_days: Number(planRecord.num_days ?? plan.length),
    meals_per_day: Number(planRecord.meals_per_day ?? 0),
    plan,
    shopping_list: normalizeShoppingList(planRecord.shopping_list),
    stats: computeMealPlanStats(plan),
    macroOverrides: {},
    noteOverrides,
    ...(documentUrl ? { document_url: documentUrl } : {}),
    ...(documentGeneratedAt ? { document_generated_at: documentGeneratedAt } : {}),
  };
}

interface MealPlanWizardProps {
  client: MealCraftClient;
  favourites: WorkspaceFavourite[];
  pastMeals: PastMealRecipe[];
  pastMealsLoading: boolean;
  pastMealsError: boolean;
  recentPlans: WorkspacePlanSummary[];
  initialPlanId?: string | null;
  embedded?: boolean;
  onExit: () => void;
}

export default function MealPlanWizard({
  client: initialClient,
  favourites,
  pastMeals,
  pastMealsLoading,
  pastMealsError,
  recentPlans,
  initialPlanId = null,
  embedded = false,
  onExit,
}: MealPlanWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(1);
  const [selectedClient, setSelectedClient] = useState<MealCraftClient | null>(initialClient);
  const [criteria, setCriteria] = useState<PlanCriteriaValues>(INITIAL_CRITERIA);
  const [planResult, setPlanResult] = useState<MealPlanResult | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isMarkingAsSent, setIsMarkingAsSent] = useState(false);
  const [isPublishingLink, setIsPublishingLink] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const generationIdRef = useRef<string | null>(null);

  const generateMutation = useGeneratePlan();
  const swapMutation = useSwapMeal();
  const feedbackMutation = useMealFeedback();
  const isGenerating = generateMutation.isPending;
  const showLoading = isGenerating;

  const stepToRender = useMemo(() => {
    if (showLoading) return 0;
    return currentStep;
  }, [currentStep, showLoading]);

  const loadExistingPlan = async (planId: string, fallbackClient?: MealCraftClient) => {
    generationIdRef.current = null;
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
      setPlanResult({
        ...loadedPlan,
        macroOverrides: loadedPlan.macroOverrides ?? {},
        noteOverrides: loadedPlan.noteOverrides ?? {},
      });

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
      const persistedReuse = planCriteria.reuse && typeof planCriteria.reuse === "object"
        ? planCriteria.reuse as Partial<PlanReuseConfig> & {
            // Legacy Stage 5 key names persisted before the n8n contract rename.
            specific_recipe_ids?: string[];
            recent_window_days?: number;
          }
        : {};
      const persistedRecentWindow = Number(
        persistedReuse.avoid_recent_days ?? persistedReuse.recent_window_days,
      );
      const persistedSelectedRecipeIds = Array.isArray(persistedReuse.selected_recipe_ids)
        ? persistedReuse.selected_recipe_ids.map(String).filter(Boolean)
        : Array.isArray(persistedReuse.specific_recipe_ids)
          ? persistedReuse.specific_recipe_ids.map(String).filter(Boolean)
          : undefined;
      const persistedSourcePlanId = typeof persistedReuse.source_plan_id === "string" && persistedReuse.source_plan_id
        ? persistedReuse.source_plan_id
        : undefined;
      const reuse: PlanReuseConfig = {
        include_favourites: persistedReuse.include_favourites !== false,
        avoid_recent: persistedReuse.avoid_recent !== false,
        avoid_recent_days: Number.isFinite(persistedRecentWindow) && persistedRecentWindow > 0
          ? persistedRecentWindow
          : INITIAL_CRITERIA.reuse.avoid_recent_days,
        ...(persistedSelectedRecipeIds?.length ? { selected_recipe_ids: persistedSelectedRecipeIds } : {}),
        ...(persistedSourcePlanId ? { source_plan_id: persistedSourcePlanId } : {}),
      };

      setCriteria((current) => ({
        ...current,
        num_days: Number(planRecord.num_days ?? current.num_days),
        meals_per_day: Number(planRecord.meals_per_day ?? current.meals_per_day),
        free_prompt: typeof planCriteria.free_prompt === "string" ? planCriteria.free_prompt : current.free_prompt,
        meal_types: Array.isArray(planCriteria.meal_types) ? planCriteria.meal_types : current.meal_types,
        focus_tags: Array.isArray(planCriteria.focus_tags) ? planCriteria.focus_tags : current.focus_tags,
        reuse,
      }));

      setCurrentStep(2);
      setMaxCompletedStep(2);
      toast({ title: "Plan loaded", description: "Loaded existing meal plan for editing." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load plan";
      toast({ title: "Load failed", description: message, variant: "destructive" });
      throw error;
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    if (initialPlanId) {
      void loadExistingPlan(initialPlanId, initialClient);
    }
    // Initial plan loading is intentionally tied to the workspace entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlanId]);

  const handleCriteriaChange = (next: PlanCriteriaValues) => {
    generationIdRef.current = null;
    setCriteria(next);
  };

  const handleGenerate = async () => {
    if (!selectedClient) return;

    const generationId = generationIdRef.current ?? crypto.randomUUID();
    generationIdRef.current = generationId;

    try {
      const generated = await generateMutation.mutateAsync({
        client_id: selectedClient.id,
        generation_id: generationId,
        reuse: criteria.reuse,
        num_days: criteria.num_days,
        meals_per_day: criteria.meals_per_day,
        meal_types: criteria.meal_types,
        focus_tags: criteria.focus_tags,
        free_prompt: criteria.free_prompt,
      });

      const merged = mergeDailySummary(generated);
      setPlanResult({ ...merged, macroOverrides: {}, noteOverrides: {} });
      setCurrentStep(2);
      setMaxCompletedStep(2);
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
              carbs: replacementRecipe.carbs,
              fat: replacementRecipe.fat,
              servings: replacementRecipe.servings,
            };
          }),
        }));

        const nextMacroOverrides = { ...(current.macroOverrides ?? {}) };
        const nextNoteOverrides = { ...(current.noteOverrides ?? {}) };
        delete nextMacroOverrides[swapResult.swapped.meal_plan_item_id];
        delete nextNoteOverrides[swapResult.swapped.meal_plan_item_id];

        return {
          ...current,
          meal_plan_id: swapResult.meal_plan_id || current.meal_plan_id,
          plan: nextPlan,
          shopping_list: swapResult.shopping_list,
          stats: computeMealPlanStats(nextPlan),
          macroOverrides: nextMacroOverrides,
          noteOverrides: nextNoteOverrides,
        };
      });

      const description = swapResult.swapped.reasoning
        ? `Plan updated. ${swapResult.swapped.reasoning}`
        : "Plan and shopping list updated.";
      toast({ title: "Meal swapped", description });

      try {
        await pb.collection("meal_plan_items").update(swapResult.swapped.meal_plan_item_id, {
          client_note: "",
        });
      } catch (error) {
        console.warn("Failed to clear swapped meal note in PocketBase:", error);
      }
    } catch (error) {
      if (error instanceof MealCraftHttpError && error.status === 422) {
        toast({
          title: "Swap rejected",
          description: error.message || "This meal breaks the household's dietary rules and cannot be used.",
          variant: "destructive",
        });
        throw error;
      }

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

  const handleSaveMacros = (mealPlanItemId: string, macros: MacroOverride) => {
    setPlanResult((current) => {
      if (!current) return current;

      return {
        ...current,
        macroOverrides: {
          ...(current.macroOverrides ?? {}),
          [mealPlanItemId]: {
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          },
        },
      };
    });
  };

  const handleSaveNote = async (mealPlanItemId: string, note: string) => {
    const trimmedNote = note.trim();
    const previousNote = (planResult?.noteOverrides?.[mealPlanItemId] ?? "").trim();
    const matchingMeal = planResult?.plan
      .flatMap((day) => day.meals)
      .find((meal) => (meal.meal_plan_item_id ?? meal.id) === mealPlanItemId);

    if (trimmedNote === previousNote) {
      return;
    }

    setPlanResult((current) => {
      if (!current) return current;

      const nextNoteOverrides = { ...(current.noteOverrides ?? {}) };

      if (trimmedNote) {
        nextNoteOverrides[mealPlanItemId] = trimmedNote;
      } else {
        delete nextNoteOverrides[mealPlanItemId];
      }

      return {
        ...current,
        noteOverrides: nextNoteOverrides,
      };
    });

    if (!matchingMeal?.meal_plan_item_id) {
      return;
    }

    try {
      await pb.collection("meal_plan_items").update(matchingMeal.meal_plan_item_id, {
        client_note: trimmedNote,
      });
      toast({
        title: "Note saved",
        description: trimmedNote ? "Client note updated." : "Client note removed.",
      });
    } catch (error) {
      setPlanResult((current) => {
        if (!current) return current;

        const nextNoteOverrides = { ...(current.noteOverrides ?? {}) };
        if (previousNote) {
          nextNoteOverrides[mealPlanItemId] = previousNote;
        } else {
          delete nextNoteOverrides[mealPlanItemId];
        }

        return {
          ...current,
          noteOverrides: nextNoteOverrides,
        };
      });

      const message = error instanceof Error ? error.message : "Could not save note.";
      toast({ title: "Note save failed", description: message, variant: "destructive" });
    }
  };

  const handleSaveTitle = async (mealPlanItemId: string, nextTitle: string) => {
    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) return;

    const matchingMeal = planResult?.plan
      .flatMap((day) => day.meals)
      .find((meal) => (meal.meal_plan_item_id ?? meal.id) === mealPlanItemId);
    const previousTitle = matchingMeal?.title ?? matchingMeal?.recipe?.title ?? "Untitled meal";

    setPlanResult((current) => {
      if (!current) return current;
      return {
        ...current,
        plan: current.plan.map((day) => ({
          ...day,
          meals: day.meals.map((meal) => {
            if ((meal.meal_plan_item_id ?? meal.id) !== mealPlanItemId) return meal;
            return {
              ...meal,
              title: trimmedTitle,
              recipe: meal.recipe ? { ...meal.recipe, title: trimmedTitle } : meal.recipe,
            };
          }),
        })),
      };
    });

    try {
      if (matchingMeal?.meal_plan_item_id) {
        await pb.collection("meal_plan_items").update(matchingMeal.meal_plan_item_id, { title: trimmedTitle });
      }
    } catch (error) {
      setPlanResult((current) => {
        if (!current) return current;
        return {
          ...current,
          plan: current.plan.map((day) => ({
            ...day,
            meals: day.meals.map((meal) => {
              if ((meal.meal_plan_item_id ?? meal.id) !== mealPlanItemId) return meal;
              return {
                ...meal,
                title: previousTitle,
                recipe: meal.recipe ? { ...meal.recipe, title: previousTitle } : meal.recipe,
              };
            }),
          })),
        };
      });

      const message = error instanceof Error ? error.message : "Could not save recipe name.";
      toast({ title: "Name save failed", description: message, variant: "destructive" });
      throw error;
    }
  };

  const handleExportPdf = async () => {
    if (!planResult || !selectedClient) return;

    setIsExportingPdf(true);
    try {
      const imageEntries = planResult.plan
        .flatMap((day) => day.meals)
        .map((meal) => ({
          id: meal.recipe?.id || meal.recipe_id || getMealPlanItemKey(meal),
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
          macroOverrides={planResult.macroOverrides}
          noteOverrides={planResult.noteOverrides}
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

  const handlePublishDocument = async (options?: { supersede?: boolean }) => {
    if (!planResult?.meal_plan_id || !selectedClient) return;

    if (planResult.document_url && !options?.supersede) {
      return;
    }

    if (planResult.document_url && options?.supersede) {
      const confirmed = window.confirm(
        "Generate a new link? The previous link will be superseded — share the new URL with the client.",
      );
      if (!confirmed) return;
    }

    setIsPublishingLink(true);
    setPublishProgress(0);

    try {
      const html = renderMealPlanDocument({
        plan: planResult,
        clientName: selectedClient.name,
      });

      const safeClient = selectedClient.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "client";
      const dateStamp = new Date().toISOString().slice(0, 10);
      const file = new File([html], `meal-plan-${safeClient}-${dateStamp}.html`, { type: "text/html" });

      const uploaded = await uploadFile({
        file,
        clientName: selectedClient.name,
        title: planResult.title?.trim() || `Meal plan for ${selectedClient.name}`,
        area: "BOH",
        onProgress: setPublishProgress,
      });

      const generatedAt = new Date().toISOString();
      await pb.collection("meal_plans").update(planResult.meal_plan_id, {
        document_url: uploaded.url,
        document_generated_at: generatedAt,
      });

      setPlanResult((current) => (
        current
          ? {
              ...current,
              document_url: uploaded.url,
              document_generated_at: generatedAt,
            }
          : current
      ));

      toast({
        title: options?.supersede ? "New link ready" : "Link ready",
        description: options?.supersede
          ? "A new client link was created. The previous URL is superseded."
          : "Client meal plan link created.",
      });
    } catch (error) {
      if (isLinksApiError(error)) {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "Cannot create link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cannot create link",
          description: "Something went wrong while preparing the document.",
          variant: "destructive",
        });
      }
    } finally {
      setIsPublishingLink(false);
      setPublishProgress(0);
    }
  };

  return (
    <div className={embedded ? "h-full overflow-y-auto bg-white" : "min-h-screen bg-[#FAF9F7]"}>
      <div className={embedded ? "min-h-full p-4" : "mx-auto w-full max-w-5xl px-4 py-6 md:px-8"}>
        <div className="mb-5 flex items-center justify-between border-b border-[#E4E2DD] bg-white px-1 py-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onExit} className="bb-mut underline underline-offset-4 hover:text-[#171717]">
              {embedded ? "Close" : "← Back to household"}
            </button>
            <span className="h-4 w-px bg-[#E4E2DD]" />
            <h1 className="bb-type-card">New meal plan</h1>
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

        {stepToRender === 1 && selectedClient ? (
          <PlanCriteria
            client={selectedClient}
            values={criteria}
            onChange={handleCriteriaChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            favourites={favourites}
            pastMeals={pastMeals}
            pastMealsLoading={pastMealsLoading}
            pastMealsError={pastMealsError}
            recentPlans={recentPlans}
          />
        ) : null}

        {stepToRender === 2 && planResult?.meal_plan_id ? (
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#D4D0CB] pb-3">
            <p className="bb-meta">
              {planResult.status === "active" ? "Plan marked as sent" : "Saved as draft"} · {planResult.title || planResult.meal_plan_id}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleMarkAsSent()}
              disabled={isMarkingAsSent || planResult.status === "active"}
              className="shrink-0 border-[#D4D0CB]"
            >
              {isMarkingAsSent ? "Updating..." : "Mark as Sent"}
            </Button>
          </div>
        ) : null}

        {stepToRender === 2 && planResult?.idempotent_replay ? (
          <p className="mb-3 border border-[#D4D0CB] bg-[#F5F3F0] px-3 py-2 text-xs text-[#0A0A0A]">
            An existing plan was recovered for this generation.
          </p>
        ) : null}

        {stepToRender === 2 && planResult ? (
          <PlanReview
            planResult={planResult}
            pastMeals={pastMeals}
            onRegenerate={() => setCurrentStep(1)}
            onNext={() => {
              setCurrentStep(3);
              setMaxCompletedStep(3);
            }}
            onSwapMeal={handleSwapMeal}
            isSwapping={swapMutation.isPending}
            onFeedback={handleFeedback}
            onSaveMacros={handleSaveMacros}
            onSaveNote={handleSaveNote}
            onSaveTitle={handleSaveTitle}
            onGetLink={() => void handlePublishDocument()}
            onGenerateNewLink={() => void handlePublishDocument({ supersede: true })}
            isPublishingLink={isPublishingLink}
            publishProgress={publishProgress}
          />
        ) : null}

        {stepToRender === 3 && planResult ? (
          <ShoppingListSection
            shoppingList={planResult.shopping_list}
            onBack={() => setCurrentStep(2)}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
            onMarkAsSent={handleMarkAsSent}
            isMarkingAsSent={isMarkingAsSent}
            canMarkAsSent={planResult.status !== "active"}
          />
        ) : null}
      </div>

      <ImportRecipeModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}
