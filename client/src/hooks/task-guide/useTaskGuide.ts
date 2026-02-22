import { useMutation } from "@tanstack/react-query";

const DEFAULT_TASK_GUIDE_WEBHOOK = "https://n8n.blckbx.co.uk/webhook/task-guide";
const TASK_GUIDE_TIMEOUT_MS = 60_000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export interface TaskGuideStep {
  step: number;
  title: string;
  detail: string;
}

export interface TaskGuideData {
  summary: string;
  steps: TaskGuideStep[];
  considerations: string[];
  tips: string[];
}

export interface TaskGuidePartner {
  name: string;
  relevance: string;
  match_strength: "strong" | "moderate" | "loose" | string;
  description?: string;
  category?: string;
  url?: string;
  website?: string;
}

export interface TaskGuideCortexItem {
  name: string;
  description?: string;
  entity_type?: string;
  cuisine?: string;
  city?: string;
  price_range?: string;
  website?: string;
  images?: unknown;
}

export interface TaskGuideResult {
  success: boolean;
  guide: TaskGuideData;
  partners: TaskGuidePartner[];
  cortex: TaskGuideCortexItem[];
}

export interface TaskGuideSearchPayload {
  task_title: string;
  task_description: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalizeResponse(raw: any): TaskGuideResult {
  const rawGuide = raw?.guide ?? {};
  const rawSteps = Array.isArray(rawGuide.steps) ? rawGuide.steps : [];

  return {
    success: Boolean(raw?.success ?? true),
    guide: {
      summary: String(rawGuide.summary ?? ""),
      steps: rawSteps.map((step: any, index: number) => ({
        step: Number(step?.step ?? index + 1),
        title: String(step?.title ?? `Step ${index + 1}`),
        detail: String(step?.detail ?? ""),
      })),
      considerations: asStringArray(rawGuide.considerations),
      tips: asStringArray(rawGuide.tips),
    },
    partners: (Array.isArray(raw?.partners) ? raw.partners : []).map((partner: any) => ({
      name: String(partner?.name ?? "Unknown partner"),
      relevance: String(partner?.relevance ?? ""),
      match_strength: String(partner?.match_strength ?? "loose"),
      description: partner?.description ? String(partner.description) : undefined,
      category: partner?.category ? String(partner.category) : undefined,
      url: partner?.url ? String(partner.url) : undefined,
      website: partner?.website ? String(partner.website) : undefined,
    })),
    cortex: (Array.isArray(raw?.cortex) ? raw.cortex : []).map((item: any) => ({
      name: String(item?.name ?? "Unnamed recommendation"),
      description: item?.description ? String(item.description) : undefined,
      entity_type: item?.entity_type ? String(item.entity_type) : undefined,
      cuisine: item?.cuisine ? String(item.cuisine) : undefined,
      city: item?.city ? String(item.city) : undefined,
      price_range: item?.price_range ? String(item.price_range) : undefined,
      website: item?.website ? String(item.website) : undefined,
      images: item?.images,
    })),
  };
}

async function searchTaskGuide(payload: TaskGuideSearchPayload): Promise<TaskGuideResult> {
  const url = import.meta.env.VITE_TASK_GUIDE_WEBHOOK || DEFAULT_TASK_GUIDE_WEBHOOK;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: withTimeout(TASK_GUIDE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Task Guide request failed with status ${response.status}.`);
  }

  const raw = await response.json();
  return normalizeResponse(raw);
}

export function useTaskGuide() {
  return useMutation<TaskGuideResult, Error, TaskGuideSearchPayload>({
    mutationFn: searchTaskGuide,
  });
}
