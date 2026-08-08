import { ThumbsDown, ThumbsUp } from "lucide-react";
import { usePastMeals } from "@/hooks/meals/usePastMeals";
import type { WorkspaceFavourite } from "@/hooks/meals/useHouseholdWorkspace";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSource(source?: string): string {
  if (!source) return "Source unavailable";
  return source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function HouseholdMealHistory({ clientId }: { clientId: string }) {
  const { data: meals = [], isLoading, isError } = usePastMeals(clientId, true);

  return (
    <section className="border border-[#E4E2DD] bg-white">
      <div className="border-b border-[#E4E2DD] bg-[#FAF9F7] px-5 py-4 md:px-7">
        <p className="bb-pre">Meal history</p>
        <p className="mt-1 bb-mut">Recipes previously used for this household.</p>
      </div>
      {isLoading ? (
        <p className="px-5 py-10 bb-meta md:px-7">Loading past meals…</p>
      ) : isError ? (
        <p className="px-5 py-10 bb-meta md:px-7">Past meals could not be loaded.</p>
      ) : meals.length === 0 ? (
        <p className="px-5 py-10 bb-meta md:px-7">No meals have been planned for this household yet.</p>
      ) : (
        <div className="divide-y divide-[#E4E2DD]">
          {meals.map((meal) => (
            <div key={meal.recipeId} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-7">
              <div>
                <p className="bb-type-card text-[18px]">{meal.title}</p>
                <p className="mt-1 bb-mut">{formatSource(meal.source)}</p>
              </div>
              <div className="flex items-center gap-5 bb-mut">
                <span>Last planned {formatDate(meal.latestPlannedAt)}</span>
                <span>Used {meal.totalCount}×</span>
                {meal.feedback === "liked" ? <ThumbsUp className="h-4 w-4 text-[#696969]" /> : null}
                {meal.feedback === "disliked" ? <ThumbsDown className="h-4 w-4 text-[#696969]" /> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function HouseholdFavourites({ favourites }: { favourites: WorkspaceFavourite[] }) {
  return (
    <section className="border border-[#E4E2DD] bg-white">
      <div className="border-b border-[#E4E2DD] bg-[#FAF9F7] px-5 py-4 md:px-7">
        <p className="bb-pre">Favourite meals</p>
        <p className="mt-1 bb-mut">Recipes explicitly saved for this household.</p>
      </div>
      {favourites.length === 0 ? (
        <p className="px-5 py-10 bb-meta md:px-7">No favourite meals saved yet.</p>
      ) : (
        <div className="divide-y divide-[#E4E2DD]">
          {favourites.map((favourite) => (
            <div key={favourite.id} className="px-5 py-4 md:px-7">
              <div className="flex items-center justify-between gap-4">
                <p className="bb-type-card text-[18px]">{favourite.title}</p>
                <span className="text-[#171717]" aria-label="Favourite">◇</span>
              </div>
              <p className="mt-1 bb-mut">
                {formatSource(favourite.source)}{favourite.note ? ` · ${favourite.note}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
