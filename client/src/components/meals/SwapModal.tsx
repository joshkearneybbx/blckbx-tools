import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MealCraftRecipe } from "@/lib/meals/api";
import { RecipeSearch } from "./RecipeSearch";

interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { mode: "suggest" | "specific"; reason?: string; replacement_recipe_id?: string }) => Promise<void>;
  isSwapping: boolean;
}

export function SwapModal({ open, onOpenChange, onConfirm, isSwapping }: SwapModalProps) {
  const [mode, setMode] = useState<"suggest" | "specific">("suggest");
  const [reason, setReason] = useState("");
  const [recipe, setRecipe] = useState<MealCraftRecipe | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === "suggest") return reason.trim().length > 0;
    return !!recipe?.id;
  }, [mode, reason, recipe]);

  const submit = async () => {
    if (!canSubmit) return;

    await onConfirm({
      mode,
      reason: mode === "suggest" ? reason.trim() : undefined,
      replacement_recipe_id: mode === "specific" ? recipe?.id : undefined,
    });

    setReason("");
    setRecipe(null);
    setMode("suggest");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] border-[#E6E5E0] p-0">
        <DialogHeader className="border-b border-[#E6E5E0] px-5 py-4 text-left">
          <DialogTitle className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Swap Meal</DialogTitle>
          <DialogDescription className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
            Choose AI suggest mode or pick a specific replacement recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pb-5">
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("suggest")}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                mode === "suggest" ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-[#E6E5E0]",
              ].join(" ")}
            >
              AI Suggest
            </button>
            <button
              type="button"
              onClick={() => setMode("specific")}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                mode === "specific" ? "border-[#1a1a1a] bg-[#1a1a1a] text-white" : "border-[#E6E5E0]",
              ].join(" ")}
            >
              Specific Recipe
            </button>
          </div>

          {mode === "suggest" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#424242]">Reason for swap</label>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="too heavy for lunch"
                className="min-h-[90px] border-[#E6E5E0] text-sm"
              />
            </div>
          ) : (
            <RecipeSearch selectedRecipe={recipe} onSelectRecipe={setRecipe} />
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSwapping}
              className="border-[#E6E5E0]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!canSubmit || isSwapping}
              className="bg-[#E7C51C] text-black hover:bg-[#d4b419]"
            >
              {isSwapping ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSwapping ? "Swapping..." : "Confirm Swap"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
