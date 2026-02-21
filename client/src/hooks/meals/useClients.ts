import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import type { MealCraftClient } from "@/lib/meals/api";

const SEARCH_DEBOUNCE_MS = 300;

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mapClient(item: RecordModel): MealCraftClient {
  return {
    id: item.id,
    name: String(item.name ?? "Unnamed client"),
    dietary: Array.isArray(item.dietary) ? item.dietary.map(String) : [],
    dislikes: Array.isArray(item.dislikes) ? item.dislikes.map(String) : [],
    household_size: typeof item.household_size === "number" ? item.household_size : undefined,
    notes: item.notes ? String(item.notes) : undefined,
  };
}

export function useClients(searchTerm: string) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const normalized = useMemo(() => debouncedSearch.trim().toLowerCase(), [debouncedSearch]);

  return useQuery({
    queryKey: ["mealcraft-clients", normalized],
    queryFn: async () => {
      const query = escapeFilterValue(normalized);
      const filter = query
        ? `name ~ \"${query}\" || notes ~ \"${query}\" || dietary ~ \"${query}\" || dislikes ~ \"${query}\"`
        : "";

      const result = await pb.collection("clients").getList(1, 24, {
        sort: "-updated",
        ...(filter ? { filter } : {}),
      });

      return result.items.map(mapClient);
    },
  });
}
