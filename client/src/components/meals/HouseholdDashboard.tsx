import { ArrowRight, Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { MealCraftClient } from "@/lib/meals/api";
import {
  useHouseholdDashboard,
  type HouseholdSummary,
  type MealPlanStatus,
} from "@/hooks/meals/useHouseholdDashboard";
import { useRecentPlans } from "@/hooks/meals/useClientPlans";
import { NewClientModal } from "./NewClientModal";

type HouseholdFilter = "all" | "never_planned" | "has_draft" | "recently_sent" | "needs_new_plan" | "has_favourites";

interface HouseholdDashboardProps {
  onOpenWorkspace: (client: MealCraftClient) => void;
}

const FILTERS: Array<{ value: HouseholdFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "never_planned", label: "Never planned" },
  { value: "has_draft", label: "Has draft" },
  { value: "recently_sent", label: "Recently sent" },
  { value: "needs_new_plan", label: "Needs a new plan" },
  { value: "has_favourites", label: "Has favourites" },
];

const NEEDS_NEW_PLAN_DAYS = 28;

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: MealPlanStatus | null): string {
  if (status === "active") return "Sent";
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  if (status === "draft") return "Draft";
  return "No plan";
}

function statusClass(status: MealPlanStatus | null): string {
  if (status === "active") return "border-[#171717] text-[#171717]";
  if (status === "draft") return "border-[#696969] text-[#696969]";
  if (status === "completed") return "border-[#898479] text-[#898479]";
  if (status === "archived") return "border-[#898479] text-[#898479]";
  return "border-[#E4E2DD] text-[#898479]";
}

function hasRecentGeneration(household: HouseholdSummary): boolean {
  if (!household.lastGeneratedAt) return false;
  const cutoff = Date.now() - NEEDS_NEW_PLAN_DAYS * 24 * 60 * 60 * 1000;
  return new Date(household.lastGeneratedAt).getTime() >= cutoff;
}

function matchesFilter(household: HouseholdSummary, filter: HouseholdFilter): boolean {
  if (filter === "never_planned") return household.planCount === 0;
  if (filter === "has_draft") return household.hasDraft;
  if (filter === "recently_sent") return household.hasActivePlan;
  if (filter === "needs_new_plan") return !hasRecentGeneration(household);
  if (filter === "has_favourites") return household.favouriteCount > 0;
  return true;
}

function HouseholdRow({
  household,
  onOpenWorkspace,
}: {
  household: HouseholdSummary;
  onOpenWorkspace: (client: MealCraftClient) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenWorkspace(household)}
      className="w-full border-b border-[#E4E2DD] bg-white px-5 py-5 text-left transition-colors last:border-b-0 hover:bg-[#FAF9F7] hover:shadow-[inset_4px_0_0_#171717]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="bb-type-card truncate">{household.name}</h3>
            {household.household_size && household.household_size > 0 ? (
              <span className="bb-mut">Household of {household.household_size}</span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(household.dietary ?? []).slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-[#E4E2DD] px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] text-[#404040]">
                {tag.replace(/_/g, " ")}
              </span>
            ))}
            {(household.dislikes ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-[#E4E2DD] px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] text-[#696969]">
                Avoids {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 lg:justify-end">
          <div>
            <p className="bb-label">Plans</p>
            <p className="mt-1 bb-meta">{household.planCount}</p>
          </div>
          <div>
            <p className="bb-label">Last generated</p>
            <p className="mt-1 bb-meta">{formatDate(household.lastGeneratedAt)}</p>
          </div>
          <div>
            <p className="bb-label">Last sent</p>
            <p className="mt-1 bb-meta">{formatDate(household.lastSentAt)}</p>
          </div>
          <div>
            <p className="bb-label">Favourites</p>
            <p className="mt-1 bb-meta">◇ {household.favouriteCount}</p>
          </div>
          <span className={["rounded-full border px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] font-medium uppercase tracking-[1px]", statusClass(household.currentStatus)].join(" ")}>
            {statusLabel(household.currentStatus)}
          </span>
        </div>
      </div>
    </button>
  );
}

export function HouseholdDashboard({ onOpenWorkspace }: HouseholdDashboardProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HouseholdFilter>("all");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const { data: households = [], isLoading, isError } = useHouseholdDashboard(search);
  const { data: recentPlans = [] } = useRecentPlans(true);

  const visibleHouseholds = useMemo(
    () => households.filter((household) => matchesFilter(household, filter)),
    [filter, households]
  );

  return (
    <section className="border border-[#E4E2DD] bg-white">
      <header className="border-b border-[#E4E2DD] px-5 py-6 md:px-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="bb-pre mb-2">MealCraft / Directory</p>
            <h2 className="bb-type-page">Households</h2>
            <p className="mt-2 max-w-2xl bb-meta">
              Select a household to start a new plan or continue with its meal history.
            </p>
          </div>
          <button type="button" className="bb-btn w-fit px-[35px] py-[21px] text-[20px] leading-none" onClick={() => setNewClientOpen(true)}>
            <UserPlus className="h-4 w-4" />
            New household
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#898479]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search households, dietary needs, dislikes, or notes"
              className="h-11 rounded-none border-[#E4E2DD] pl-9 font-[var(--bb-font-sans)] text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label="Household filters">
            <span className="bb-label mr-1">Filter</span>
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={[
                  "rounded-full border px-3 py-1.5 font-[var(--bb-font-sans)] text-[12px] transition-colors",
                  filter === option.value
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-[#E4E2DD] bg-white text-[#696969] hover:border-[#898479] hover:text-[#171717]",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="border-b border-[#E4E2DD] bg-[#FAF9F7] px-5 py-3 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="bb-label">Household directory</p>
          <p className="bb-mut">
            {isLoading ? "Loading households…" : `${visibleHouseholds.length} household${visibleHouseholds.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-12 text-center bb-meta">Loading households…</div>
      ) : isError ? (
        <div className="px-5 py-12 text-center bb-meta">Households could not be loaded.</div>
      ) : visibleHouseholds.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="bb-type-section">No households match this view.</p>
          <p className="mt-2 bb-mut">Try a different search or filter.</p>
        </div>
      ) : (
        <div>
          {visibleHouseholds.map((household) => (
            <HouseholdRow
              key={household.id}
              household={household}
              onOpenWorkspace={onOpenWorkspace}
            />
          ))}
        </div>
      )}

      {recentPlans.length > 0 ? (
        <section className="border-t border-[#E4E2DD]">
          <div className="flex items-end justify-between gap-3 bg-[#FAF9F7] px-5 py-4 md:px-7">
            <div>
              <p className="bb-pre">Recent activity</p>
              <p className="mt-1 bb-mut">The latest generated plans across households.</p>
            </div>
            <span className="bb-mut">{recentPlans.length} latest</span>
          </div>
          <div className="divide-y divide-[#E4E2DD]">
            {recentPlans.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-7">
                <div>
                  <p className="bb-type-card text-[17px]">{plan.client_name}</p>
                  <p className="mt-1 bb-meta">{plan.title}</p>
                  <p className="mt-1 bb-mut">
                    {formatDate(plan.created)} · {plan.num_days} days · {plan.meals_per_day} meals/day
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={["rounded-full border px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] font-medium uppercase tracking-[1px]", statusClass(plan.status)].join(" ")}>
                    {statusLabel(plan.status)}
                  </span>
                  <button
                    type="button"
                    className="bb-btn-o bb-btn-sm"
                    onClick={() => onOpenWorkspace({ id: plan.client_id, name: plan.client_name })}
                  >
                    Open household
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <NewClientModal
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreated={(client) => {
          onOpenWorkspace(client);
          setNewClientOpen(false);
        }}
      />
    </section>
  );
}
