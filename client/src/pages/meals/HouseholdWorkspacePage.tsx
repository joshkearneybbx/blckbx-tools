import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HouseholdOverview } from "@/components/meals/HouseholdOverview";
import MealPlanWizard from "./MealPlanWizard";
import { useHouseholdWorkspace } from "@/hooks/meals/useHouseholdWorkspace";

interface HouseholdWorkspacePageProps {
  clientId: string;
}

type WorkspaceTab = "overview" | "favourites" | "plans" | "meals";

const TABS: Array<{ id: WorkspaceTab; label: string; available: boolean }> = [
  { id: "overview", label: "Overview", available: true },
  { id: "favourites", label: "Favourites", available: false },
  { id: "plans", label: "Plan history", available: false },
  { id: "meals", label: "Meal history", available: false },
];

export default function HouseholdWorkspacePage({ clientId }: HouseholdWorkspacePageProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
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

  if (isPlanning) {
    return (
      <MealPlanWizard
        client={data.client}
        initialPlanId={planToLoad}
        onExit={() => {
          setPlanToLoad(null);
          setIsPlanning(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        <header className="border-b border-[#E4E2DD] bg-white px-5 py-5 md:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
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
            </div>
            <Button type="button" className="bb-btn w-fit px-[35px] py-[21px] text-[20px] leading-none" onClick={() => setIsPlanning(true)}>
              New meal plan
              <span aria-hidden="true">→</span>
            </Button>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Household workspace sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={!tab.available}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={[
                  "border-b-2 px-1 pb-2 font-[var(--bb-font-sans)] text-[13px] transition-colors",
                  activeTab === tab.id
                    ? "border-[#171717] text-[#171717]"
                    : tab.available
                      ? "border-transparent text-[#696969] hover:border-[#898479] hover:text-[#171717]"
                      : "border-transparent text-[#B3B0AA]",
                ].join(" ")}
                onClick={() => tab.available && setActiveTab(tab.id)}
              >
                {tab.label}
                {!tab.available ? <span className="ml-1 text-[10px] uppercase tracking-[1px]">Soon</span> : null}
              </button>
            ))}
          </nav>
        </header>

        <main className="mt-6">
          {activeTab === "overview" ? (
            <HouseholdOverview
              data={data}
              onNewPlan={() => {
                setPlanToLoad(null);
                setIsPlanning(true);
              }}
              onOpenPlan={(planId) => {
                setPlanToLoad(planId);
                setIsPlanning(true);
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
