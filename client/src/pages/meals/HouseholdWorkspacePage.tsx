import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { HouseholdProfilePane, MealDetailPane, MealHistoryPane } from "@/components/meals/HouseholdWorkspacePanes";
import type { PastMealRecipe } from "@/hooks/meals/usePastMeals";
import MealPlanWizard from "./MealPlanWizard";
import { useHouseholdWorkspace } from "@/hooks/meals/useHouseholdWorkspace";

interface HouseholdWorkspacePageProps {
  clientId: string;
}

export default function HouseholdWorkspacePage({ clientId }: HouseholdWorkspacePageProps) {
  const [, navigate] = useLocation();
  const [selectedMeal, setSelectedMeal] = useState<PastMealRecipe | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planToLoad, setPlanToLoad] = useState<string | null>(null);
  const { data, isLoading, isError } = useHouseholdWorkspace(clientId);

  if (isLoading) {
    return <div className="min-h-screen bg-[#FAF9F7] px-6 py-12 text-center bb-meta">Loading household…</div>;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] px-6 py-12 text-center">
        <p className="bb-type-section">Household could not be loaded.</p>
        <button type="button" onClick={() => navigate("/meals")} className="mt-4 bb-meta underline underline-offset-4">
          Back to households
        </button>
      </div>
    );
  }

  const startNewPlan = () => {
    setSelectedMeal(null);
    setPlanToLoad(null);
    setIsPlanning(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-7">
        <header className="border-b border-[#E4E2DD] bg-white px-5 py-5 md:px-7">
          <button
            type="button"
            onClick={() => navigate("/meals")}
            className="mb-3 inline-flex items-center gap-2 bb-mut underline underline-offset-4 hover:text-[#171717]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Households
          </button>
          <p className="bb-pre">Household workspace</p>
          <h1 className="mt-1 bb-type-page">{data.client.name}</h1>
        </header>

        <main className="mt-5 grid min-h-[calc(100vh-175px)] overflow-hidden border border-[#E4E2DD] bg-white lg:grid-cols-[minmax(270px,0.8fr)_minmax(380px,1.2fr)_minmax(360px,1fr)]">
          <div className="min-h-[620px] min-w-0 border-b border-[#E4E2DD] lg:border-b-0 lg:border-r">
            <HouseholdProfilePane data={data} onNewPlan={startNewPlan} />
          </div>

          <div className="min-h-[620px] min-w-0 border-b border-[#E4E2DD] lg:border-b-0 lg:border-r">
            <MealHistoryPane
              clientId={clientId}
              favourites={data.favourites}
              selectedMealId={selectedMeal?.recipeId ?? null}
              onSelectMeal={setSelectedMeal}
            />
          </div>

          <div className="min-h-[620px] min-w-0 overflow-hidden">
            {isPlanning ? (
              <MealPlanWizard
                client={data.client}
                initialPlanId={planToLoad}
                embedded
                onExit={() => {
                  setPlanToLoad(null);
                  setIsPlanning(false);
                }}
              />
            ) : (
              <MealDetailPane
                meal={selectedMeal}
                favourites={data.favourites}
                recentPlans={data.recentPlans}
                onNewPlan={startNewPlan}
                onContinuePlan={(planId) => {
                  setPlanToLoad(planId);
                  setIsPlanning(true);
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
