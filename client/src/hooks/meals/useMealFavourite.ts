import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RecordModel } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { buildFavouriteUniqueKey } from "@/lib/meals/favourites";

interface FavouriteMutationInput {
  clientId: string;
  recipeId: string;
  active: boolean;
}

async function findByUniqueKey(uniqueKey: string): Promise<RecordModel | null> {
  try {
    return await pb.collection("meal_favourites").getFirstListItem(`unique_key = "${uniqueKey}"`);
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
}

export function useMealFavourite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, recipeId, active }: FavouriteMutationInput) => {
      const uniqueKey = buildFavouriteUniqueKey(clientId, recipeId);
      const existing = await findByUniqueKey(uniqueKey);

      if (existing) {
        return pb.collection("meal_favourites").update(existing.id, {
          client: clientId,
          recipes: recipeId,
          unique_key: uniqueKey,
          source: "manual",
          active,
        });
      }

      if (!active) return null;

      return pb.collection("meal_favourites").create({
        client: clientId,
        recipes: recipeId,
        unique_key: uniqueKey,
        source: "manual",
        active: true,
      });
    },
    onSuccess: (_record, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["mealcraft-household-workspace", variables.clientId] });
      void queryClient.invalidateQueries({ queryKey: ["mealcraft-household-dashboard"] });
    },
  });
}
