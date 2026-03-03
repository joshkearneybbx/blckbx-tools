import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MealCraftClient, MealType } from "@/lib/meals/api";
import { ChipSelect } from "./ChipSelect";

export interface PlanCriteriaValues {
  free_prompt: string;
  num_days: number;
  meals_per_day: number;
  meal_types: MealType[];
  focus_tags: string[];
  advanced: {
    calorie_target?: string;
    cooking_skill?: string;
    cuisine_preference?: string;
    protein_target?: string;
  };
}

interface PlanCriteriaProps {
  client: MealCraftClient;
  values: PlanCriteriaValues;
  onChange: (next: PlanCriteriaValues) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const MEAL_TYPES: Array<{ label: string; value: MealType }> = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

const FOCUS_TAGS = [
  { label: "Budget-Friendly", value: "budget-friendly" },
  { label: "Quick", value: "quick" },
  { label: "Batch Cooking", value: "batch-cooking" },
  { label: "Family Friendly", value: "family-friendly" },
  { label: "Healthy", value: "healthy" },
  { label: "One-Pot", value: "one-pot" },
  { label: "Comfort Food", value: "comfort-food" },
];

export function PlanCriteria({ client, values, onChange, onGenerate, isGenerating }: PlanCriteriaProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const setField = <K extends keyof PlanCriteriaValues>(key: K, value: PlanCriteriaValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="rounded-[14px] border border-[#E6E5E0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E6E5E0] px-5 py-4">
        <div>
          <h3 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Plan Criteria</h3>
          <p className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">Client: {client.name}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">What are you looking for?</label>
          <Textarea
            value={values.free_prompt}
            onChange={(event) => setField("free_prompt", event.target.value)}
            placeholder="keep it simple, nothing too fancy"
            className="min-h-[90px] resize-y border-[#E6E5E0] text-sm [font-family:Inter,sans-serif]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Number of Days</label>
            <Select
              value={String(values.num_days)}
              onValueChange={(value) => setField("num_days", Number(value))}
            >
              <SelectTrigger className="h-10 border-[#E6E5E0] text-sm">
                <SelectValue placeholder="Select days" />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 5, 7, 14].map((days) => (
                  <SelectItem key={days} value={String(days)}>{days}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Meals Per Day</label>
            <Select
              value={String(values.meals_per_day)}
              onValueChange={(value) => setField("meals_per_day", Number(value))}
            >
              <SelectTrigger className="h-10 border-[#E6E5E0] text-sm">
                <SelectValue placeholder="Select meals" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map((count) => (
                  <SelectItem key={count} value={String(count)}>{count}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Meal Types</label>
          <ChipSelect
            options={MEAL_TYPES}
            selected={values.meal_types}
            onChange={(next) => setField("meal_types", next as MealType[])}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#424242] [font-family:Inter,sans-serif]">Focus Tags</label>
          <ChipSelect
            options={FOCUS_TAGS}
            selected={values.focus_tags}
            onChange={(next) => setField("focus_tags", next)}
          />
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-[#E6E5E0] bg-[#FAF9F8] px-3 py-2 text-xs font-semibold text-[#424242]">
            Advanced Options
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={values.advanced.calorie_target ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, calorie_target: event.target.value })}
                placeholder="Calorie target"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.cooking_skill ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, cooking_skill: event.target.value })}
                placeholder="Cooking skill"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.cuisine_preference ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, cuisine_preference: event.target.value })}
                placeholder="Cuisine preference"
                className="h-10 border-[#E6E5E0] text-sm"
              />
              <Input
                value={values.advanced.protein_target ?? ""}
                onChange={(event) => setField("advanced", { ...values.advanced, protein_target: event.target.value })}
                placeholder="Protein target"
                className="h-10 border-[#E6E5E0] text-sm"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || values.meal_types.length === 0}
            className="h-9 rounded-md bg-[#E7C51C] px-5 text-sm font-semibold text-black hover:bg-[#d4b419]"
          >
            {isGenerating ? "Generating..." : "Generate Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
