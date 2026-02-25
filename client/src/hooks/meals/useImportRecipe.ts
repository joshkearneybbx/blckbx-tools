import { useCallback, useState } from "react";

const IMPORT_TIMEOUT_MS = 30_000;

export interface ImportRecipeResult {
  id: string;
  title: string;
  source: string;
  source_name: string;
  slug: string;
}

interface ImportResponse {
  success?: boolean;
  recipe?: ImportRecipeResult;
  error?: string;
}

interface UseImportRecipeReturn {
  importRecipe: (url: string) => Promise<void>;
  isLoading: boolean;
  result: ImportRecipeResult | null;
  error: string | null;
  reset: () => void;
}

function toFriendlyError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("duplicate") || normalized.includes("already") || normalized.includes("slug")) {
    return "This recipe may already be in the database.";
  }
  return message;
}

export function useImportRecipe(): UseImportRecipeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportRecipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const importRecipe = useCallback(async (url: string) => {
    const webhookUrl = import.meta.env.VITE_MEALCRAFT_IMPORT_WEBHOOK;
    if (!webhookUrl) {
      setError("MealCraft import webhook URL is missing.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
      });

      let payload: ImportResponse | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message = response.status === 404
          ? "Import webhook returned 404. Check the n8n workflow is active and you're using the production /webhook/ URL."
          : (payload?.error || `Import failed with status ${response.status}.`);
        setError(toFriendlyError(message));
        return;
      }

      if (!payload?.success || !payload.recipe) {
        setError(toFriendlyError(payload?.error || "Could not import this recipe."));
        return;
      }

      setResult(payload.recipe);
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        setError("Import timed out. Please try again.");
        return;
      }

      const message = error instanceof Error ? error.message : "Could not import this recipe.";
      setError(toFriendlyError(message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    importRecipe,
    isLoading,
    result,
    error,
    reset,
  };
}
