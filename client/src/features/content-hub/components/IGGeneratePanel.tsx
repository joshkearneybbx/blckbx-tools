import { useCallback, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface IGGeneratePanelProps {
  trendTopic: string;
  onGenerate: (itemCount: number) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

const ITEM_COUNT_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_ITEM_COUNT = 5;

export default function IGGeneratePanel({
  trendTopic,
  onGenerate,
  isGenerating,
  error,
}: IGGeneratePanelProps) {
  const [itemCount, setItemCount] = useState<number>(DEFAULT_ITEM_COUNT);
  const [lastRequestedCount, setLastRequestedCount] = useState<number>(DEFAULT_ITEM_COUNT);

  const handleGenerate = useCallback(async (count: number) => {
    setLastRequestedCount(count);
    await onGenerate(count);
  }, [onGenerate]);

  return (
    <section className="ch-composer-generate-panel">
      <div className="min-w-0 flex-1">
        <div className="ch-composer-generate-title">Generate Instagram carousel</div>
        <p className="ch-composer-generate-sub">Trend ready: {trendTopic}</p>
      </div>

      <div className="ch-ig-generate-controls">
        <div className="ch-ig-generate-row">
          <label htmlFor="ig-item-count" className="ch-ig-generate-label">Items:</label>
          <select
            id="ig-item-count"
            value={itemCount}
            onChange={(event) => setItemCount(Number(event.target.value))}
            disabled={isGenerating}
            className="ch-ig-generate-select"
          >
            {ITEM_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleGenerate(itemCount)}
            disabled={isGenerating}
            className="ch-composer-dark-primary-button"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>

        {isGenerating ? (
          <div className="ch-ig-generate-hint">This usually takes about 30 seconds.</div>
        ) : null}

        {error ? (
          <div className="ch-ig-generate-error-row">
            <div className="ch-ig-generate-error">{error}</div>
            <button
              type="button"
              onClick={() => void handleGenerate(lastRequestedCount)}
              disabled={isGenerating}
              className="ch-composer-dark-ghost-button"
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
