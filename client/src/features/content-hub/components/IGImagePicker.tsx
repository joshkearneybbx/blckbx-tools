import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { searchImages } from "../lib/image-search";
import type { ImageSearchResult } from "../types";

interface IGImagePickerProps {
  isOpen: boolean;
  initialQuery: string;
  prefetchedCandidates?: ImageSearchResult[];
  onClose: () => void;
  onSelect: (image: ImageSearchResult) => void;
}

const SEARCH_LOADING_STEPS = [
  "Preparing search query...",
  "Scanning image sources...",
  "Curating results...",
  "Filtering for quality...",
  "Almost there...",
] as const;

function ImageSearchLoader() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const stepInterval = window.setInterval(() => {
      setActiveStep((current) =>
        current < SEARCH_LOADING_STEPS.length - 1 ? current + 1 : current
      );
    }, 9000);

    return () => window.clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    const DURATION_MS = 45_000;
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / DURATION_MS) * 100, 92);
      setProgress(pct);
    }, 300);

    return () => window.clearInterval(tick);
  }, []);

  return (
    <div className="ch-ig-search-loader">
      <div className="ch-ig-search-loader-content">
        <Loader2 className="ch-ig-search-loader-spinner" />
        <h3 className="ch-ig-search-loader-title">Searching for images</h3>
        <p className="ch-ig-search-loader-sub">This can take up to 45 seconds</p>

        <div className="ch-ig-search-loader-bar-track">
          <div
            className="ch-ig-search-loader-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="ch-ig-search-loader-steps">
          {SEARCH_LOADING_STEPS.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;

            return (
              <div key={step} className="ch-ig-search-loader-step">
                <div
                  className={[
                    "ch-ig-search-loader-step-dot",
                    done
                      ? "ch-ig-search-loader-step-dot--done"
                      : active
                        ? "ch-ig-search-loader-step-dot--active"
                        : "ch-ig-search-loader-step-dot--pending",
                  ].join(" ")}
                />
                <span
                  className={[
                    "ch-ig-search-loader-step-text",
                    done
                      ? "ch-ig-search-loader-step-text--done"
                      : active
                        ? "ch-ig-search-loader-step-text--active"
                        : "ch-ig-search-loader-step-text--pending",
                  ].join(" ")}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ImageResultTile({
  image,
  onSelect,
}: {
  image: ImageSearchResult;
  onSelect: (image: ImageSearchResult) => void;
}) {
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [image.image_url]);

  return (
    <button
      type="button"
      onClick={() => onSelect(image)}
      className="ch-ig-picker-tile"
    >
      {hasLoadError ? (
        <div className="ch-ig-picker-unavailable">Image unavailable</div>
      ) : (
        <img
          src={image.image_url}
          alt={image.source_title || image.source_domain || "Image search result"}
          className="ch-ig-picker-image"
          onError={() => setHasLoadError(true)}
        />
      )}

      <div className="ch-ig-picker-tile-meta">
        <div className="ch-ig-picker-source-title">{image.source_title || "Untitled source"}</div>
        <div className="ch-ig-picker-source-domain">{image.source_domain || image.source_url}</div>
      </div>
    </button>
  );
}

export default function IGImagePicker({
  isOpen,
  initialQuery,
  prefetchedCandidates,
  onClose,
  onSelect,
}: IGImagePickerProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [lastExecutedQuery, setLastExecutedQuery] = useState(initialQuery.trim());
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    setLastExecutedQuery(trimmed);

    if (!trimmed) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextResults = await searchImages(trimmed, 12);
      setResults(nextResults);
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : "Image search failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery(initialQuery);
    setError(null);

    // Use prefetched candidates if available, otherwise fall back to live search
    if (prefetchedCandidates && prefetchedCandidates.length > 0) {
      setResults(prefetchedCandidates);
      setLastExecutedQuery(initialQuery.trim());
      setIsLoading(false);
    } else {
      setResults([]);
      void runSearch(initialQuery);
    }
  }, [initialQuery, isOpen, prefetchedCandidates, runSearch]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ch-ig-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}>
      <div className="ch-ig-picker-modal" role="dialog" aria-modal="true" aria-labelledby="ig-image-picker-title">
        <div className="ch-ig-picker-header">
          <h2 id="ig-image-picker-title" className="ch-ig-picker-title">Choose image</h2>
          <button type="button" onClick={onClose} className="ch-ig-modal-close-button" aria-label="Close image picker">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="ch-ig-picker-search-row">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch(searchQuery);
              }
            }}
            placeholder="Search images..."
            className="ch-ig-picker-search-input"
          />
          <button
            type="button"
            onClick={() => void runSearch(searchQuery)}
            disabled={isLoading}
            className="ch-inline-button ch-inline-button-primary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>

        {isLoading ? (
          <ImageSearchLoader />
        ) : error ? (
          <div className="ch-ig-picker-state">
            <div className="ch-ig-picker-state-title">{error}</div>
            <button
              type="button"
              onClick={() => void runSearch(searchQuery)}
              className="ch-inline-button ch-inline-button-primary"
            >
              Retry
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="ch-ig-picker-state">
            <div className="ch-ig-picker-state-title">No images found</div>
            <div className="ch-ig-picker-state-copy">
              {lastExecutedQuery ? `No results for “${lastExecutedQuery}”.` : "Try a search query to see results."}
            </div>
          </div>
        ) : (
          <div className="ch-ig-picker-grid">
            {results.map((image) => (
              <ImageResultTile key={`${image.rank}-${image.image_url}`} image={image} onSelect={(selectedImage) => {
                onSelect(selectedImage);
                onClose();
              }} />
            ))}
          </div>
        )}

        <div className="ch-ig-picker-footer-note">
          {trimmedQuery ? `Showing results for “${trimmedQuery}”.` : "Search by keyword to find an image."}
        </div>
      </div>
    </div>
  );
}
