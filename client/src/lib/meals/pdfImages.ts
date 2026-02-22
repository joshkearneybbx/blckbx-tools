import { imageUrlToBase64 } from "@/lib/imageToBase64";
import { enhanceImageUrl } from "@/lib/meals/api";

interface RecipeImageEntry {
  id: string;
  url: string;
}

const MAX_CONCURRENCY = 4;
const PER_IMAGE_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Image fetch timeout")), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function fetchRecipeImages(entries: RecipeImageEntry[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const queue = entries.filter((entry) => entry.id && entry.url);
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;

      const { id, url } = queue[index];
      const enhancedUrl = enhanceImageUrl(url);

      try {
        const base64 = await withTimeout(imageUrlToBase64(enhancedUrl), PER_IMAGE_TIMEOUT_MS);
        if (base64 && base64 !== "SKIP_WEBP") {
          results[id] = base64;
        }
      } catch {
        // Best-effort image fetch: skip failures so PDF can still generate.
      }
    }
  }

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
