import { useMutation } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";

interface FeedbackPayload {
  mealPlanItemId: string;
  feedback: "liked" | "disliked" | null;
}

export function useMealFeedback() {
  return useMutation({
    mutationFn: async ({ mealPlanItemId, feedback }: FeedbackPayload) => {
      return pb.collection("meal_plan_items").update(mealPlanItemId, { feedback });
    },
  });
}
