import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRecipes } from "@/hooks/meals/useRecipes";
import type { MealCraftRecipe } from "@/lib/meals/api";

interface RecipeSearchProps {
  selectedRecipe: MealCraftRecipe | null;
  onSelectRecipe: (recipe: MealCraftRecipe) => void;
}

export function RecipeSearch({ selectedRecipe, onSelectRecipe }: RecipeSearchProps) {
  const [query, setQuery] = useState("");
  const { data: recipes = [], isLoading } = useRecipes(query, query.trim().length > 0);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B9797]" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search recipes by title"
          className="h-10 border-[#E6E5E0] pl-9 text-sm"
        />
      </div>

      {selectedRecipe ? (
        <div className="mb-2 inline-flex items-center rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-3 py-1 text-xs text-white">
          Selected: {selectedRecipe.title}
        </div>
      ) : null}

      <div className="max-h-52 space-y-1 overflow-auto rounded-md border border-[#E6E5E0] bg-white p-1">
        {!query.trim() ? (
          <p className="p-2 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">Start typing to search recipes.</p>
        ) : isLoading ? (
          <p className="p-2 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">Searching recipes...</p>
        ) : recipes.length === 0 ? (
          <p className="p-2 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">No recipes found.</p>
        ) : (
          recipes.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => onSelectRecipe(recipe)}
              className={[
                "w-full rounded-sm px-2 py-2 text-left text-xs transition-colors",
                selectedRecipe?.id === recipe.id ? "bg-[#1a1a1a] text-white" : "hover:bg-[#F8F8F8]",
              ].join(" ")}
            >
              <p className="font-semibold">{recipe.title}</p>
              <p className={selectedRecipe?.id === recipe.id ? "text-[#D0D6D0]" : "text-[#6B6B68]"}>
                {recipe.cook_time ? `${recipe.cook_time} min` : "Time n/a"}
                {recipe.calories ? ` • ${recipe.calories} kcal` : ""}
                {recipe.source ? ` • ${recipe.source}` : ""}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
