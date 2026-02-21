import { useMutation } from "@tanstack/react-query";
import { swapMeal, type SwapMealPayload, type SwapMealResult } from "@/lib/meals/api";

export function useSwapMeal() {
  return useMutation<SwapMealResult, Error, SwapMealPayload>({
    mutationFn: (payload: SwapMealPayload) => swapMeal(payload),
  });
}
