import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { enhanceImageUrl, type MealPlanItem } from "@/lib/meals/api";

interface MealCardProps {
  item: MealPlanItem;
  onSwap: () => void;
  onFeedback: (feedback: "liked" | "disliked") => void;
}

const MEAL_TYPE_STYLES: Record<string, string> = {
  dinner: "bg-[#F3E8FF] text-[#7C3AED]",
  lunch: "bg-[#FFF8E1] text-[#B8860B]",
  breakfast: "bg-[#FFF0E6] text-[#C4653A]",
  snack: "bg-[#E8F5E9] text-[#1EA86B]",
};

export function MealCard({ item, onSwap, onFeedback }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const currentFeedback = item.feedback ?? null;
  const title = item.title ?? item.recipe?.title ?? "Untitled meal";
  const ingredients = item.ingredients ?? item.recipe?.ingredients ?? [];
  const instructions = item.instructions ?? item.recipe?.instructions ?? [];
  const imageUrl = enhanceImageUrl(item.image_url || item.recipe?.image_url || "");

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);
  const calories = item.calories ?? item.recipe?.calories ?? 0;
  const protein = item.protein ?? item.recipe?.protein ?? 0;
  const metaItems = [
    `${item.cook_time ?? 0} min`,
    calories > 0 ? `${calories} kcal` : null,
    protein > 0 ? `${protein}g protein` : null,
    `${item.servings ?? 1} servings`,
    item.source ? item.source : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-[10px] border border-[#E6E5E0] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={title}
              onError={() => setImgError(true)}
              className="h-12 w-12 shrink-0 rounded-[8px] object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="min-w-0">
            <span className={[
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
              MEAL_TYPE_STYLES[item.meal_type] ?? "bg-[#F8F8F8] text-[#424242]",
            ].join(" ")}>{item.meal_type}</span>
            <h4 className="mt-1 text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">{title}</h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFeedback("liked")}
            className={[
              "rounded-md border p-1.5",
              currentFeedback === "liked"
                ? "border-[#1EA86B] text-[#1EA86B]"
                : "border-[#E6E5E0] text-[#9B9797]",
            ].join(" ")}
            aria-label="Like"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFeedback("disliked")}
            className={[
              "rounded-md border p-1.5",
              currentFeedback === "disliked"
                ? "border-[#E33737] text-[#E33737]"
                : "border-[#E6E5E0] text-[#9B9797]",
            ].join(" ")}
            aria-label="Dislike"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-md border border-[#E6E5E0] p-1.5 text-[#6B6B68]"
            aria-label="Expand"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="inline-flex items-center gap-1 rounded-md border border-[#1a1a1a] px-2 py-1 text-xs font-medium text-[#1a1a1a]"
          >
            <RefreshCcw className="h-3 w-3" />
            Swap
          </button>
        </div>
      </div>

      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
        {metaItems.map((meta) => (
          <span key={meta}>{meta}</span>
        ))}
      </div>

      {expanded ? (
        <div className="mt-3 border-t border-[#E6E5E0] pt-3 text-xs [font-family:Inter,sans-serif]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <h5 className="mb-1 font-semibold text-[#1a1a1a]">Ingredients</h5>
              <ul className="list-disc space-y-1 pl-4 text-[#424242]">
                {ingredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`}>{ingredient}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="mb-1 font-semibold text-[#1a1a1a]">Method</h5>
              <ol className="list-decimal space-y-1 pl-4 text-[#424242]">
                {instructions.map((instruction, index) => (
                  <li key={`${instruction}-${index}`}>{instruction}</li>
                ))}
              </ol>
              {item.source_url ? (
                <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[#7C3AED] underline">
                  View source
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
