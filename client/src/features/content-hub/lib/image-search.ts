import type { IGCarouselContent, ImageSearchResult } from "../types";

export async function searchImages(query: string, count = 12): Promise<ImageSearchResult[]> {
  const webhookUrl = import.meta.env.VITE_CH_IMAGE_SEARCH_WEBHOOK;
  const webhookSecret = import.meta.env.VITE_CH_IMAGE_SEARCH_SECRET;

  if (!webhookUrl || !webhookSecret) {
    throw new Error("Image search webhook not configured");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": webhookSecret,
    },
    body: JSON.stringify({ query, count }),
  });

  if (!response.ok) {
    throw new Error(`Image search failed: HTTP ${response.status}`);
  }

  const data = await response.json() as { images?: ImageSearchResult[] };
  return Array.isArray(data.images) ? data.images : [];
}

export interface CandidateBatch {
  cover: ImageSearchResult[] | null;
  items: (ImageSearchResult[] | null)[]; // aligned to content.items order
}

/**
 * Fires parallel image searches for every tile in the carousel.
 * Returns partial results if some queries fail — a single failure shouldn't
 * block the others. Callers should handle null entries per-tile.
 *
 * Takes ~60s total (bounded by the slowest individual search), not
 * 60s × N, because all searches run concurrently.
 */
export async function fetchCandidatesForCarousel(
  content: IGCarouselContent,
  onProgress?: (ready: number, total: number) => void,
): Promise<CandidateBatch> {
  const queries: { key: "cover" | number; query: string }[] = [
    { key: "cover", query: content.cover.image_query },
    ...content.items.map((item, i) => ({ key: i as number, query: item.image_query })),
  ];

  const total = queries.length;
  let ready = 0;

  const results = await Promise.all(
    queries.map(async ({ key, query }) => {
      try {
        const images = await searchImages(query, 12);
        ready += 1;
        onProgress?.(ready, total);
        return { key, images };
      } catch (err) {
        console.error(`Image search failed for tile ${key} (query: ${query})`, err);
        ready += 1;
        onProgress?.(ready, total);
        return { key, images: null };
      }
    }),
  );

  const batch: CandidateBatch = {
    cover: null,
    items: content.items.map(() => null),
  };

  for (const result of results) {
    if (result.key === "cover") {
      batch.cover = result.images;
    } else {
      batch.items[result.key] = result.images;
    }
  }

  return batch;
}
