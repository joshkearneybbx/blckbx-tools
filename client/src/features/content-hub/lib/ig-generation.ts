import type {
  ContentHubTrendRecord,
  IGCarouselContent,
  IGGenerationMeta,
} from "../types";

type GenerateResult =
  | { success: true; draft: IGCarouselContent; meta: IGGenerationMeta }
  | { success: false; error: string };

export async function generateIGCarousel(params: {
  trend: ContentHubTrendRecord;
  itemCount: number;
}): Promise<GenerateResult> {
  const webhookUrl = import.meta.env.VITE_CH_IG_GENERATE_WEBHOOK;
  const webhookSecret = import.meta.env.VITE_CH_IG_GENERATE_SECRET;

  if (!webhookUrl || !webhookSecret) {
    return { success: false, error: "IG generation webhook not configured" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhookSecret,
      },
      body: JSON.stringify({
        trend_id: params.trend.id,
        trend: params.trend,
        item_count: params.itemCount,
      }),
    });

    // Always try to parse the body — workflow errors come through as JSON regardless of status
    const data = await response.json().catch(() => null) as { success?: boolean; error?: string; draft?: IGCarouselContent; meta?: IGGenerationMeta } | null;

    if (!response.ok) {
      // Prefer the workflow's own error message if present
      if (data?.error) {
        return { success: false, error: data.error };
      }
      return { success: false, error: `Generation failed: HTTP ${response.status}` };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Generation returned unsuccessful" };
    }

    return {
      success: true as const,
      draft: data.draft!,
      meta: data.meta!,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
