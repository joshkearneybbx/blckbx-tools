import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClientPlans } from "@/hooks/meals/useClientPlans";

interface PastPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string;
  onLoadPlan: (planId: string) => Promise<void>;
  isLoadingPlan?: boolean;
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

export function PastPlansModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  onLoadPlan,
  isLoadingPlan = false,
}: PastPlansModalProps) {
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});
  const { data: plans = [], isLoading, isFetching, refetch } = useClientPlans(clientId, false);

  useEffect(() => {
    if (open && clientId) {
      void refetch();
    }
  }, [open, clientId, refetch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-[#E6E5E0] bg-white p-0">
        <DialogHeader className="border-b border-[#E6E5E0] px-5 py-4 text-left">
          <DialogTitle className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">
            {clientName} - Meal Plans
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
            Load a previous plan to review, swap meals, and re-export.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[480px] space-y-2 overflow-auto px-5 py-4">
          {isLoading || isFetching ? (
            <p className="text-sm text-[#6B6B68]">Loading plans...</p>
          ) : plans.length === 0 ? (
            <div className="rounded-md border border-[#E6E5E0] bg-[#FAF9F8] p-4 text-sm text-[#6B6B68]">
              No meal plans yet for this client.
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="rounded-md border border-[#E6E5E0] bg-[#FAF9F8] p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{plan.title}</p>
                    <p className="text-xs text-[#6B6B68]">
                      {formatDate(plan.created)} • {plan.num_days} days • {plan.meals_per_day} meals/day
                    </p>
                  </div>
                  <span className={["rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", statusClasses(plan.status)].join(" ")}>
                    {plan.status}
                  </span>
                </div>

                <p className="mb-2 text-xs text-[#6B6B68]">
                  {plan.recipePreview.slice(0, 4).join(", ")}
                  {plan.recipePreview.length > 4 ? "..." : ""}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="h-8 bg-[#E7C51C] px-3 text-xs font-semibold text-black hover:bg-[#d4b419]"
                    disabled={isLoadingPlan}
                    onClick={() => {
                      void onLoadPlan(plan.id);
                    }}
                  >
                    {isLoadingPlan ? "Loading..." : "Load Plan"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-[#E6E5E0] px-3 text-xs"
                    onClick={() =>
                      setExpandedPlanIds((current) => ({
                        ...current,
                        [plan.id]: !current[plan.id],
                      }))
                    }
                  >
                    View Recipes
                    {expandedPlanIds[plan.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {expandedPlanIds[plan.id] ? (
                  <div className="mt-2 space-y-1 rounded-md border border-[#E6E5E0] bg-white p-2">
                    {plan.items.map((item) => (
                      <div key={item.meal_plan_item_id} className="flex items-center justify-between gap-2 text-xs">
                        <p className="text-[#424242]">
                          Day {item.day_number} • {item.title}
                        </p>
                        {item.feedback === "liked" ? (
                          <ThumbsUp className="h-3 w-3 text-[#1EA86B]" />
                        ) : item.feedback === "disliked" ? (
                          <ThumbsDown className="h-3 w-3 text-[#E33737]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="border-t border-[#E6E5E0] px-5 py-3">
          <Button type="button" variant="outline" className="border-[#E6E5E0]" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
