import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipSelect } from "./ChipSelect";
import {
  useUpdateHousehold,
  type HouseholdPatch,
  type HouseholdWorkspaceData,
  type WorkspacePlanSummary,
} from "@/hooks/meals/useHouseholdWorkspace";

interface HouseholdOverviewProps {
  data: HouseholdWorkspaceData;
  onNewPlan: () => void;
  onOpenPlan: (planId: string) => void;
}

interface HouseholdDraft {
  name: string;
  householdSize: string;
  dietary: string[];
  dislikes: string[];
  notes: string;
}

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

const STRICT_VALUES = STRICT_DIETARY.map((option) => option.value);
const MODEL_VALUES = MODEL_EXCLUSIONS.map((option) => option.value);

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitTags(value: string): string[] {
  return uniqueValues(value.split(","));
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status: WorkspacePlanSummary["status"] | null): string {
  if (status === "active") return "Sent";
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  return "Draft";
}

function draftFromData(data: HouseholdWorkspaceData): HouseholdDraft {
  return {
    name: data.client.name,
    householdSize: data.client.household_size ? String(data.client.household_size) : "",
    dietary: uniqueValues(data.client.dietary ?? []),
    dislikes: uniqueValues(data.client.dislikes ?? []),
    notes: data.client.notes ?? "",
  };
}

function PlanStrip({ plans, onOpenPlan }: { plans: WorkspacePlanSummary[]; onOpenPlan: (planId: string) => void }) {
  if (plans.length === 0) {
    return <p className="bb-mut">No plans have been generated for this household yet.</p>;
  }

  return (
    <div className="divide-y divide-[#E4E2DD] border-y border-[#E4E2DD]">
      {plans.map((plan) => (
        <div key={plan.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="bb-type-card text-[18px]">{plan.title}</p>
            <p className="mt-1 bb-mut">
              Generated {formatDate(plan.generatedAt ?? plan.created)} · Sent {formatDate(plan.sentAt)} · {plan.numDays} days · {plan.mealsPerDay} meals/day
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-[#E4E2DD] px-2.5 py-1 font-[var(--bb-font-sans)] text-[11px] uppercase tracking-[1px] text-[#696969]">
              {statusLabel(plan.status)}
            </span>
            <Button type="button" className="bb-btn-o bb-btn-sm" onClick={() => onOpenPlan(plan.id)}>
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HouseholdOverview({ data, onNewPlan, onOpenPlan }: HouseholdOverviewProps) {
  const [draft, setDraft] = useState<HouseholdDraft>(() => draftFromData(data));
  const updateHousehold = useUpdateHousehold();

  useEffect(() => {
    setDraft(draftFromData(data));
  }, [data.client.id, data.client.name, data.client.household_size, data.client.notes, data.client.dietary, data.client.dislikes]);

  const strictDietary = useMemo(
    () => draft.dietary.filter((value) => STRICT_VALUES.includes(value)),
    [draft.dietary]
  );
  const modelExclusions = useMemo(
    () => draft.dietary.filter((value) => MODEL_VALUES.includes(value)),
    [draft.dietary]
  );
  const loosePreferences = useMemo(
    () => draft.dietary.filter((value) => !STRICT_VALUES.includes(value) && !MODEL_VALUES.includes(value)),
    [draft.dietary]
  );

  const setDietaryGroup = (values: string[], groupValues: string[]) => {
    const preserved = draft.dietary.filter((value) => !groupValues.includes(value));
    setDraft((current) => ({ ...current, dietary: uniqueValues([...preserved, ...values]) }));
  };

  const setLoosePreferences = (value: string) => {
    setDraft((current) => ({
      ...current,
      dietary: uniqueValues([...strictDietary, ...modelExclusions, ...splitTags(value)]),
    }));
  };

  const parsedHouseholdSize = Number(draft.householdSize);
  const savedPatch: HouseholdPatch = {
    name: draft.name.trim() || data.client.name,
    household_size: Number.isFinite(parsedHouseholdSize) && parsedHouseholdSize > 0 ? parsedHouseholdSize : null,
    dietary: uniqueValues(draft.dietary),
    dislikes: uniqueValues(draft.dislikes),
    notes: draft.notes.trim(),
  };
  const isDirty = JSON.stringify(savedPatch) !== JSON.stringify({
    name: data.client.name,
    household_size: data.client.household_size ?? null,
    dietary: uniqueValues(data.client.dietary ?? []),
    dislikes: uniqueValues(data.client.dislikes ?? []),
    notes: (data.client.notes ?? "").trim(),
  });

  const save = async () => {
    await updateHousehold.mutateAsync({ clientId: data.client.id, patch: savedPatch });
  };

  return (
    <div className="space-y-6">
      <section className="border border-[#E4E2DD] bg-white">
        <div className="flex flex-col gap-5 border-b border-[#E4E2DD] px-5 py-6 md:flex-row md:items-end md:justify-between md:px-7">
          <div>
            <p className="bb-pre mb-2">Overview</p>
            <h2 className="bb-type-page">{data.client.name}</h2>
            <p className="mt-2 bb-meta">Changes here guide the next meal plan generation.</p>
          </div>
          <Button type="button" className="bb-btn w-fit px-[35px] py-[21px] text-[20px] leading-none" onClick={onNewPlan}>
            New meal plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 px-5 py-6 md:grid-cols-2 md:px-7">
          <div>
            <label className="bb-label">Household name</label>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 h-11 rounded-none border-[#E4E2DD] text-[16px] focus-visible:ring-[#898479]"
            />
          </div>
          <div>
            <label className="bb-label">Household size</label>
            <Input
              type="number"
              min={1}
              value={draft.householdSize}
              onChange={(event) => setDraft((current) => ({ ...current, householdSize: event.target.value }))}
              placeholder="Not set"
              className="mt-2 h-11 rounded-none border-[#E4E2DD] text-[16px] focus-visible:ring-[#898479]"
            />
            <p className="mt-2 bb-mut">Leave blank when the household size is unknown.</p>
          </div>
        </div>

        <div className="border-t border-[#E4E2DD] px-5 py-6 md:px-7">
          <div className="mb-5">
            <p className="bb-type-section">Dietary requirements</p>
            <p className="mt-1 bb-mut">Hard constraints filter recipes. Ingredient exclusions are passed to the model; other preferences guide the brief.</p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="bb-label">Hard constraints · database filtered</p>
              <ChipSelect
                className="mt-2"
                options={STRICT_DIETARY}
                selected={strictDietary}
                onChange={(values) => setDietaryGroup(values, STRICT_VALUES)}
              />
            </div>
            <div>
              <p className="bb-label">Ingredient exclusions · model enforced</p>
              <ChipSelect
                className="mt-2"
                options={MODEL_EXCLUSIONS}
                selected={modelExclusions}
                onChange={(values) => setDietaryGroup(values, MODEL_VALUES)}
              />
            </div>
            <div>
              <label className="bb-label">Loose preferences</label>
              <Input
                value={loosePreferences.join(", ")}
                onChange={(event) => setLoosePreferences(event.target.value)}
                placeholder="Pescatarian, low carb, Mediterranean"
                className="mt-2 h-11 rounded-none border-[#E4E2DD] text-[16px] focus-visible:ring-[#898479]"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-t border-[#E4E2DD] px-5 py-6 md:grid-cols-2 md:px-7">
          <div>
            <label className="bb-label">Dislikes</label>
            <Input
              value={draft.dislikes.join(", ")}
              onChange={(event) => setDraft((current) => ({ ...current, dislikes: splitTags(event.target.value) }))}
              placeholder="Mushrooms, coriander"
              className="mt-2 h-11 rounded-none border-[#E4E2DD] text-[16px] focus-visible:ring-[#898479]"
            />
            <p className="mt-2 bb-mut">Separate multiple dislikes with commas.</p>
          </div>
          <div>
            <label className="bb-label">Notes</label>
            <Textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Preferences, routines, or context for the assistant"
              className="mt-2 min-h-[112px] rounded-none border-[#E4E2DD] text-[16px] focus-visible:ring-[#898479]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E4E2DD] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
          <p className="bb-mut">Dietary and dislikes changes apply to the next generated plan.</p>
          <Button type="button" className="bb-btn w-fit px-[35px] py-[21px] text-[20px] leading-none" disabled={!isDirty || updateHousehold.isPending} onClick={() => void save()}>
            {updateHousehold.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {updateHousehold.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="border border-[#E4E2DD] bg-white">
        <div className="border-b border-[#E4E2DD] bg-[#FAF9F7] px-5 py-4 md:px-7">
          <p className="bb-pre">Household summary</p>
        </div>
        <div className="grid grid-cols-2 gap-5 px-5 py-6 md:grid-cols-5 md:px-7">
          <div><p className="bb-label">Plans</p><p className="mt-1 bb-type-section">{data.planCount}</p></div>
          <div><p className="bb-label">Last generated</p><p className="mt-1 bb-meta">{formatDate(data.lastGeneratedAt)}</p></div>
          <div><p className="bb-label">Last sent</p><p className="mt-1 bb-meta">{formatDate(data.lastSentAt)}</p></div>
          <div><p className="bb-label">Favourites</p><p className="mt-1 bb-meta">◇ {data.favouriteCount}</p></div>
          <div><p className="bb-label">Current status</p><p className="mt-1 bb-meta">{data.currentStatus ? statusLabel(data.currentStatus) : "No plan"}</p></div>
        </div>
      </section>

      <section className="border border-[#E4E2DD] bg-white">
        <div className="border-b border-[#E4E2DD] bg-[#FAF9F7] px-5 py-4 md:px-7">
          <p className="bb-pre">Recent plans</p>
        </div>
        <div className="px-5 py-2 md:px-7">
          <PlanStrip plans={data.recentPlans} onOpenPlan={onOpenPlan} />
        </div>
      </section>
    </div>
  );
}
