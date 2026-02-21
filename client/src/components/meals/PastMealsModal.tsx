import { useEffect } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePastMeals } from "@/hooks/meals/usePastMeals";

interface PastMealsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string;
}

function formatSource(source?: string): string {
  if (!source) return "Source unavailable";
  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export function PastMealsModal({ open, onOpenChange, clientId, clientName }: PastMealsModalProps) {
  const { data: pastMeals = [], isLoading, refetch, isFetching } = usePastMeals(clientId, false);

  useEffect(() => {
    if (open && clientId) {
      void refetch();
    }
  }, [open, clientId, refetch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] border-[#E6E5E0] bg-white p-0">
        <DialogHeader className="border-b border-[#E6E5E0] px-5 py-4 text-left">
          <DialogTitle className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">
            {clientName} - Past Meals
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
            Unique recipes from this client&apos;s meal plan history.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-2 overflow-auto px-5 py-4">
          {isLoading || isFetching ? (
            <p className="text-sm text-[#6B6B68] [font-family:Inter,sans-serif]">Loading past meals...</p>
          ) : pastMeals.length === 0 ? (
            <div className="rounded-md border border-[#E6E5E0] bg-[#FAF9F8] p-4 text-sm text-[#6B6B68] [font-family:Inter,sans-serif]">
              No meal plans yet for this client.
            </div>
          ) : (
            pastMeals.map((meal) => (
              <div key={meal.recipeId} className="rounded-md border border-[#E6E5E0] bg-white p-3 shadow-sm">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1a1a1a] [font-family:Inter,sans-serif]">{meal.title}</p>
                  <div className="flex items-center gap-1">
                    {meal.totalCount > 1 ? (
                      <span className="rounded-full bg-[#E6E5E0] px-2 py-0.5 text-[10px] font-semibold text-[#424242]">
                        x {meal.totalCount}
                      </span>
                    ) : null}
                    {meal.feedback === "liked" ? (
                      <ThumbsUp className="h-3 w-3 text-[#1EA86B]" />
                    ) : meal.feedback === "disliked" ? (
                      <ThumbsDown className="h-3 w-3 text-[#E33737]" />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
                  <span>Last planned: {formatDate(meal.latestPlannedAt)}</span>
                  <span>{formatSource(meal.source)}</span>
                </div>
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
