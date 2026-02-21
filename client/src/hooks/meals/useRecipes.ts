import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import type { MealCraftRecipe } from "@/lib/meals/api";

const SEARCH_DEBOUNCE_MS = 300;

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mapRecipe(item: RecordModel): MealCraftRecipe {
  return {
    id: item.id,
    title: String(item.title ?? "Untitled recipe"),
    source: item.source ? String(item.source) : undefined,
    source_url: item.source_url ? String(item.source_url) : undefined,
    image_url: item.image_url ? String(item.image_url) : undefined,
    cook_time: typeof item.cook_time === "number" ? item.cook_time : undefined,
    calories: typeof item.calories === "number" ? item.calories : undefined,
    protein: typeof item.protein === "number" ? item.protein : undefined,
  };
}

export function useRecipes(searchTerm: string, enabled = true) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const normalized = useMemo(() => debouncedSearch.trim().toLowerCase(), [debouncedSearch]);

  return useQuery({
    queryKey: ["mealcraft-recipes", normalized],
    enabled,
    queryFn: async () => {
      const query = escapeFilterValue(normalized);
      const filter = query
        ? `title ~ \"${query}\" && active = true`
        : "active = true";

      const result = await pb.collection("recipes").getList(1, 10, {
        sort: "-updated",
        filter,
      });

      return result.items.map(mapRecipe);
    },
  });
}
