import { useMutation } from "@tanstack/react-query";
import { generateMealPlan, type GenerateMealPlanPayload } from "@/lib/meals/api";

export function useGeneratePlan() {
  return useMutation({
    mutationFn: (payload: GenerateMealPlanPayload) => generateMealPlan(payload),
  });
}
