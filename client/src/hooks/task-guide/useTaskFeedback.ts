import { useMutation } from "@tanstack/react-query";

const DEFAULT_TASK_GUIDE_FEEDBACK_WEBHOOK = "https://n8n.blckbx.co.uk/webhook/task-guide-feedback";
const TASK_GUIDE_FEEDBACK_TIMEOUT_MS = 60_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export interface TaskGuideStepCorrection {
  step: number;
  original_title: string;
  original_detail: string;
  correction: string;
}

export interface TaskGuideFeedbackPayload {
  task_title: string;
  task_description: string;
  step_corrections: TaskGuideStepCorrection[];
  general_notes?: string;
  submitted_by?: string;
}

interface TaskGuideFeedbackResponse {
  success: boolean;
}

async function submitTaskFeedback(payload: TaskGuideFeedbackPayload): Promise<TaskGuideFeedbackResponse> {
  const url = import.meta.env.VITE_TASK_GUIDE_FEEDBACK_WEBHOOK || DEFAULT_TASK_GUIDE_FEEDBACK_WEBHOOK;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: withTimeout(TASK_GUIDE_FEEDBACK_TIMEOUT_MS),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Task Guide feedback failed with status ${response.status}.`);
  }

  const raw = await response.json().catch(() => ({ success: true }));
  return {
    success: Boolean(raw?.success ?? true),
  };
}

export function useTaskFeedback() {
  return useMutation<TaskGuideFeedbackResponse, Error, TaskGuideFeedbackPayload>({
    mutationFn: submitTaskFeedback,
  });
}
