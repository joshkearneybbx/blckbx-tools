import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import IGCaptionEditor from "../components/IGCaptionEditor";
import IGCoverCard from "../components/IGCoverCard";
import IGGeneratePanel from "../components/IGGeneratePanel";
import IGItemCard from "../components/IGItemCard";
import IGMetaNote from "../components/IGMetaNote";
import IGRegenerateModal from "../components/IGRegenerateModal";
import { stripFlagMarker } from "../lib/flag-parser";
import { generateIGCarousel } from "../lib/ig-generation";
import { carouselToMarkdown } from "../lib/ig-markdown";
import { fetchCandidatesForCarousel } from "../lib/image-search";
import {
  clearIGFlag,
  useContentHubIGDraft,
  useContentHubTrend,
  useUpdateContentHubIGDraft,
} from "../lib/pb-queries";
import type {
  ContentHubAssetRecord,
  ContentHubTrendCategory,
  IGCover,
  IGCarouselContent,
  IGItem,
} from "../types";
import "../content-hub.css";

type SaveState = "idle" | "saving" | "saved" | "error";
type GenerationPhase =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "finding_images"; ready: number; total: number }
  | { status: "error"; message: string };

const COPY_STATE_DURATION_MS = 1500;
const AUTOSAVE_DEBOUNCE_MS = 600;
const GENERATION_PROGRESS_INTERVAL_MS = 700;

const CATEGORY_LABELS: Record<ContentHubTrendCategory, string> = {
  going_out: "Going Out",
  staying_in: "Staying In",
  shopping: "Shopping",
  gifting: "Gifting",
  travel: "Travel",
  hr: "HR",
};

const GENERATION_STAGES = [
  { threshold: 20, label: "Reading trend brief" },
  { threshold: 45, label: "Drafting structure" },
  { threshold: 70, label: "Writing body copy" },
  { threshold: 100, label: "Marking items to verify" },
] as const;

function isPocketBaseNotFound(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: number }).status === 404,
  );
}

function signalTone(score?: number | null) {
  const numeric = Number(score ?? 0);

  if (numeric > 7) {
    return "high";
  }

  if (numeric >= 4) {
    return "mid";
  }

  return "low";
}

function assetContentToObject(value: ContentHubAssetRecord["content"]): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function pickOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeCover(value: unknown): IGCover | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.headline !== "string") {
    return null;
  }

  return {
    headline: record.headline,
    image_query: typeof record.image_query === "string" ? record.image_query : "",
    image_url: pickOptionalString(record, "image_url"),
    image_thumbnail_url: pickOptionalString(record, "image_thumbnail_url"),
    image_source_url: pickOptionalString(record, "image_source_url"),
  };
}

function normalizeItem(value: unknown): IGItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || typeof record.body !== "string") {
    return null;
  }

  return {
    name: record.name,
    body: record.body,
    image_query: typeof record.image_query === "string" ? record.image_query : "",
    image_url: pickOptionalString(record, "image_url"),
    image_thumbnail_url: pickOptionalString(record, "image_thumbnail_url"),
    image_source_url: pickOptionalString(record, "image_source_url"),
  };
}

function assetContentToIGContent(value: ContentHubAssetRecord["content"]): IGCarouselContent | null {
  const record = assetContentToObject(value);
  if (!record?.cover) {
    return null;
  }

  const cover = normalizeCover(record.cover);
  if (!cover) {
    return null;
  }

  return {
    cover,
    items: Array.isArray(record.items)
      ? record.items.map(normalizeItem).filter((item): item is IGItem => Boolean(item))
      : [],
    caption: typeof record.caption === "string" ? record.caption : "",
    hashtags: Array.isArray(record.hashtags)
      ? record.hashtags.map((item) => String(item).trim()).filter(Boolean)
      : [],
    meta_note: typeof record.meta_note === "string" ? record.meta_note : undefined,
  };
}

function normalizeClearedFlags(value: ContentHubAssetRecord["cleared_flags"]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function cloneIGContent(content: IGCarouselContent): IGCarouselContent {
  return JSON.parse(JSON.stringify(content)) as IGCarouselContent;
}

function serializeIGContent(content: IGCarouselContent) {
  return JSON.stringify(content);
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

function formatSavedTime(value?: string | null) {
  if (!value) {
    return "Saved";
  }

  const diffMs = Date.now() - Date.parse(value);
  if (!Number.isNaN(diffMs) && diffMs < 60_000) {
    return "Saved · just now";
  }

  return `Saved · ${formatRelativeTime(value)}`;
}

function TrendSignalBadge({ score }: { score?: number | null }) {
  const numeric = Number(score ?? 0);
  const tone = signalTone(numeric);

  return (
    <span
      className={[
        "ch-detail-signal-badge",
        tone === "high" ? "is-high" : "",
        tone === "mid" ? "is-mid" : "",
        tone === "low" ? "is-low" : "",
      ].join(" ")}
    >
      {numeric.toFixed(1)}
    </span>
  );
}

function ComposerDisabledButton({
  children,
  tooltip = "Coming soon",
  className,
}: {
  children: ReactNode;
  tooltip?: string;
  className: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button type="button" disabled className={className}>
            {children}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ComposerSkeleton() {
  return (
    <div className="ch-composer-shell ch-ig-composer-shell">
      <aside className="ch-composer-side">
        <div className="space-y-4 p-6">
          <Skeleton className="h-3 w-24 bg-[rgba(10,10,10,0.06)]" />
          <Skeleton className="h-8 w-4/5 bg-[rgba(10,10,10,0.08)]" />
          <Skeleton className="h-16 w-full bg-[rgba(10,10,10,0.05)]" />
          <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.05)]" />
          <Skeleton className="h-8 w-36 bg-[rgba(10,10,10,0.06)]" />
          <div className="space-y-3 border-t border-[var(--ch-border)] pt-6">
            <Skeleton className="h-4 w-28 bg-[rgba(10,10,10,0.05)]" />
            <Skeleton className="h-12 w-full bg-[rgba(10,10,10,0.05)]" />
            <Skeleton className="h-16 w-full bg-[rgba(10,10,10,0.05)]" />
            <Skeleton className="h-20 w-full bg-[rgba(10,10,10,0.05)]" />
          </div>
        </div>
      </aside>

      <main className="ch-composer-main">
        <div className="mx-auto w-full max-w-[920px] space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-40 bg-[rgba(10,10,10,0.06)]" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 bg-[rgba(10,10,10,0.05)]" />
              <Skeleton className="h-9 w-32 bg-[rgba(10,10,10,0.05)]" />
            </div>
          </div>

          <div className="ch-composer-doc-card">
            <Skeleton className="h-14 w-full bg-[rgba(10,10,10,0.04)]" />
            <Skeleton className="mt-4 h-[240px] w-full bg-[rgba(10,10,10,0.04)]" />
            <Skeleton className="mt-2 h-4 w-48 bg-[rgba(10,10,10,0.04)]" />
            <Skeleton className="mt-6 h-10 w-2/3 bg-[rgba(10,10,10,0.04)]" />
            <Skeleton className="mt-3 h-28 w-full bg-[rgba(10,10,10,0.04)]" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ContentHubIGComposerPage() {
  const [, params] = useRoute("/content-hub/compose/ig/:trendId");
  const trendId = params?.trendId ? decodeURIComponent(params.trendId) : "";
  const trendQuery = useContentHubTrend(trendId);
  const draftQuery = useContentHubIGDraft(trendId, trendQuery.isSuccess);
  const updateDraft = useUpdateContentHubIGDraft();
  const { toast } = useToast();

  const [copyState, setCopyState] = useState<string | null>(null);
  const [workingContent, setWorkingContent] = useState<IGCarouselContent | null>(null);
  const [clearedFlags, setClearedFlags] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>({ status: "idle" });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [, forceRelativeTimeTick] = useState(0);

  const latestContentRef = useRef<IGCarouselContent | null>(null);
  const latestClearedFlagsRef = useRef<string[]>([]);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const queuedSaveRef = useRef(false);
  const candidateFetchId = useRef(0);

  const trend = trendQuery.data;
  const draft = draftQuery.data;
  const assetContent = useMemo(() => assetContentToObject(draft?.content), [draft?.content]);
  const draftContent = useMemo(() => assetContentToIGContent(draft?.content), [draft?.content]);
  const showGeneratePanel = !workingContent && !assetContent?.cover;
  const currentItemCount = workingContent?.items.length || 5;

  const suggestedTitle = trend?.suggested_title?.trim() ?? "";
  const shortTail = trend?.seo_short_tail?.filter(Boolean) ?? [];
  const longTail = trend?.seo_long_tail?.filter(Boolean) ?? [];
  const geoQuestions = trend?.geo_questions?.filter(Boolean) ?? [];
  const categoryLabel = trend?.category ? CATEGORY_LABELS[trend.category] : "Uncategorised";
  const resolvedTitle = workingContent
    ? (workingContent.cover.headline.trim() || "Untitled IG carousel")
    : (draft?.title || "Untitled IG carousel");
  const generationStageLabel = useMemo(() => {
    if (generationPhase.status === "finding_images") {
      return `Loading image options — ${generationPhase.ready} of ${generationPhase.total} ready`;
    }
    return (
      GENERATION_STAGES.find((stage) => generationProgress <= stage.threshold)?.label
      ?? GENERATION_STAGES[GENERATION_STAGES.length - 1].label
    );
  }, [generationPhase, generationProgress]);
  const showGenerationModal = generationPhase.status !== "idle";

  latestContentRef.current = workingContent;
  latestClearedFlagsRef.current = clearedFlags;

  useEffect(() => {
    setCopyState(null);
    setWorkingContent(null);
    setClearedFlags([]);
    setIsHydrated(false);
    setRegenerateOpen(false);
    setGenerationPhase({ status: "idle" });
    setGenerationProgress(0);
    setSaveState("idle");
    setLastSavedAt(null);
    setSaveErrorMessage(null);
    candidateFetchId.current = 0;
    lastSavedSnapshotRef.current = null;
    latestContentRef.current = null;
    latestClearedFlagsRef.current = [];
    saveInFlightRef.current = false;
    savePromiseRef.current = null;
    queuedSaveRef.current = false;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [trendId]);

  useEffect(() => {
    if (!draft || isHydrated) {
      return;
    }

    const nextContent = draftContent ? cloneIGContent(draftContent) : null;
    const nextClearedFlags = normalizeClearedFlags(draft.cleared_flags);

    setWorkingContent(nextContent);
    setClearedFlags(nextClearedFlags);
    latestContentRef.current = nextContent;
    latestClearedFlagsRef.current = nextClearedFlags;
    lastSavedSnapshotRef.current = nextContent ? serializeIGContent(nextContent) : null;
    setLastSavedAt(draft.updated);
    setSaveState("saved");
    setSaveErrorMessage(null);
    setIsHydrated(true);
  }, [draft, draftContent, isHydrated]);

  useEffect(() => {
    if (!copyState) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyState(null);
    }, COPY_STATE_DURATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copyState]);

  useEffect(() => {
    if (generationPhase.status !== "generating") {
      setGenerationProgress(0);
      return;
    }

    setGenerationProgress(4);

    const interval = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current >= 46) {          // cap Stage 1 at 46% (mapped from 92/2)
          return current;
        }

        const remaining = 46 - current;
        const nextStep = Math.max(2, Math.round(remaining * 0.18));
        return Math.min(46, current + nextStep);
      });
    }, GENERATION_PROGRESS_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [generationPhase.status]);

  useEffect(() => {
    if (saveState !== "saved" || !lastSavedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      forceRelativeTimeTick((value) => value + 1);
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [lastSavedAt, saveState]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const saveContent = useCallback(async (content: IGCarouselContent) => {
    if (!draft?.id) {
      return;
    }

    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;

    const savePromise = (async () => {
      try {
        const updatedDraft = await updateDraft.mutateAsync({
          assetId: draft.id,
          trendId,
          content,
        });

        lastSavedSnapshotRef.current = serializeIGContent(content);
        setLastSavedAt(updatedDraft.updated);
        setSaveState("saved");
        setSaveErrorMessage(null);
      } catch (error) {
        setSaveState("error");
        setSaveErrorMessage(error instanceof Error ? error.message : "Save failed");
      } finally {
        saveInFlightRef.current = false;

        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          const latestContent = latestContentRef.current;
          if (latestContent && serializeIGContent(latestContent) !== lastSavedSnapshotRef.current) {
            void saveContent(latestContent);
          }
        }
      }
    })();

    const trackedSavePromise = savePromise.finally(() => {
      if (savePromiseRef.current === trackedSavePromise) {
        savePromiseRef.current = null;
      }
    });

    savePromiseRef.current = trackedSavePromise;
    await trackedSavePromise;
  }, [draft?.id, trendId, updateDraft]);

  const runCandidateFetch = useCallback(async (
    content: IGCarouselContent,
    onProgress?: (ready: number, total: number) => void,
  ) => {
    candidateFetchId.current += 1;
    const myId = candidateFetchId.current;
    const total = content.items.length + 1;

    setGenerationPhase({ status: "finding_images", ready: 0, total });

    try {
      const batch = await fetchCandidatesForCarousel(content, (ready, t) => {
        if (myId !== candidateFetchId.current) return; // stale, ignore
        setGenerationPhase({ status: "finding_images", ready, total: t });
        onProgress?.(ready, t);
      });

      if (myId !== candidateFetchId.current) return; // stale, discard

      setWorkingContent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cover: { ...prev.cover, image_candidates: batch.cover ?? undefined },
          items: prev.items.map((item, i) => ({
            ...item,
            image_candidates: batch.items[i] ?? undefined,
          })),
        };
      });
      setGenerationPhase({ status: "idle" });
    } catch (err) {
      if (myId !== candidateFetchId.current) return;
      console.error("Candidate fetch failed", err);
      toast({
        title: "Image preload failed",
        description: "Pick image will search live instead.",
      });
      setGenerationPhase({ status: "idle" });
    }
  }, [toast]);

  useEffect(() => {
    if (!isHydrated || !draft?.id || !workingContent || generationPhase.status !== "idle") {
      return;
    }

    const nextSnapshot = serializeIGContent({
      ...workingContent,
      cover: { ...workingContent.cover, image_candidates: undefined },
      items: workingContent.items.map(({ image_candidates, ...rest }) => rest),
    });
    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    setSaveState("saving");
    setSaveErrorMessage(null);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const latestContent = latestContentRef.current;
      if (!latestContent || serializeIGContent(latestContent) === lastSavedSnapshotRef.current) {
        return;
      }

      // Strip image_candidates before persisting — they're page-state only
      const contentToSave: IGCarouselContent = {
        ...latestContent,
        cover: { ...latestContent.cover, image_candidates: undefined },
        items: latestContent.items.map(({ image_candidates, ...rest }) => rest),
      };

      void saveContent(contentToSave);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [draft?.id, generationPhase.status, isHydrated, saveContent, workingContent]);

  const handleRetrySave = useCallback(() => {
    const latestContent = latestContentRef.current;
    if (!latestContent) {
      return;
    }

    setSaveState("saving");
    setSaveErrorMessage(null);
    void saveContent(latestContent);
  }, [saveContent]);

  const copyToClipboard = useCallback(async (value: string, key: string) => {
    if (!value.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyState(key);
    } catch {
      setCopyState(null);
    }
  }, []);

  const persistClearedFlag = useCallback((flagText: string) => {
    if (!draft?.id || latestClearedFlagsRef.current.includes(flagText)) {
      return;
    }

    const currentClearedFlags = latestClearedFlagsRef.current;
    const nextClearedFlags = [...currentClearedFlags, flagText];

    setClearedFlags(nextClearedFlags);
    latestClearedFlagsRef.current = nextClearedFlags;

    void clearIGFlag(draft.id, currentClearedFlags, flagText).catch(() => {
      // Keep the UI optimistic. The underlying text change is autosaved separately.
    });
  }, [draft?.id]);

  const updateCover = useCallback((nextCover: IGCover) => {
    setWorkingContent((current) => current ? { ...current, cover: nextCover } : current);
  }, []);

  const updateItem = useCallback((index: number, nextItem: IGItem) => {
    setWorkingContent((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        items: current.items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
      };
    });
  }, []);

  const updateCaption = useCallback((nextCaption: string) => {
    setWorkingContent((current) => current ? { ...current, caption: nextCaption } : current);
  }, []);

  const updateHashtags = useCallback((nextHashtags: string[]) => {
    setWorkingContent((current) => current ? { ...current, hashtags: nextHashtags } : current);
  }, []);

  const handleClearItemFlag = useCallback((itemIndex: number, field: "name" | "body", flagText: string) => {
    setWorkingContent((current) => {
      if (!current) {
        return current;
      }

      const item = current.items[itemIndex];
      if (!item) {
        return current;
      }

      const nextItem = {
        ...item,
        [field]: stripFlagMarker(item[field], flagText),
      };

      return {
        ...current,
        items: current.items.map((existingItem, index) => (index === itemIndex ? nextItem : existingItem)),
      };
    });

    persistClearedFlag(flagText);
  }, [persistClearedFlag]);

  const handleClearCaptionFlag = useCallback((flagText: string) => {
    setWorkingContent((current) => current
      ? { ...current, caption: stripFlagMarker(current.caption, flagText) }
      : current);

    persistClearedFlag(flagText);
  }, [persistClearedFlag]);

  const handleGenerate = useCallback(async (itemCount: number) => {
    if (!trend || !draft?.id || generationPhase.status !== "idle") {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    queuedSaveRef.current = false;
    setGenerationPhase({ status: "generating" });

    try {
      const result = await generateIGCarousel({ trend, itemCount });

      if (!result.success) {
        setGenerationPhase({ status: "error", message: result.error });
        return;
      }

      const updatedDraft = await updateDraft.mutateAsync({
        assetId: draft.id,
        trendId,
        content: result.draft,
      });

      const nextContent = cloneIGContent(result.draft);
      const nextClearedFlags = normalizeClearedFlags(updatedDraft.cleared_flags);

      setWorkingContent(nextContent);
      setClearedFlags(nextClearedFlags);
      latestContentRef.current = nextContent;
      latestClearedFlagsRef.current = nextClearedFlags;
      lastSavedSnapshotRef.current = serializeIGContent(nextContent);
      setLastSavedAt(updatedDraft.updated);
      setSaveState("saved");
      setSaveErrorMessage(null);
      setIsHydrated(true);

      // Transition to Stage 2 — candidate fetch (modal stays open)
      await runCandidateFetch(nextContent);
    } catch (error) {
      setGenerationPhase({
        status: "error",
        message: error instanceof Error ? error.message : "Could not save generated carousel",
      });
    }
  }, [draft?.id, generationPhase.status, runCandidateFetch, trend, trendId, updateDraft]);

  const handleRegenerate = useCallback(async (itemCount: number) => {
    if (!trend || !draft?.id || generationPhase.status !== "idle") {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    queuedSaveRef.current = false;
    setRegenerateOpen(false);
    setGenerationPhase({ status: "generating" });

    try {
      if (savePromiseRef.current) {
        await savePromiseRef.current.catch(() => undefined);
      }

      const result = await generateIGCarousel({ trend, itemCount });
      if (!result.success) {
        setGenerationPhase({ status: "error", message: result.error });
        return;
      }

      const updatedDraft = await updateDraft.mutateAsync({
        assetId: draft.id,
        trendId,
        content: result.draft,
        clearedFlags: [],
      });

      const nextContent = cloneIGContent(result.draft);
      const nextClearedFlags = normalizeClearedFlags(updatedDraft.cleared_flags);

      setWorkingContent(nextContent);
      setClearedFlags(nextClearedFlags);
      latestContentRef.current = nextContent;
      latestClearedFlagsRef.current = nextClearedFlags;
      lastSavedSnapshotRef.current = serializeIGContent(nextContent);
      setLastSavedAt(updatedDraft.updated);
      setSaveState("saved");
      setSaveErrorMessage(null);
      setIsHydrated(true);

      // Transition to Stage 2 — candidate fetch (modal stays open)
      await runCandidateFetch(nextContent);
    } catch (error) {
      setGenerationPhase({
        status: "error",
        message: error instanceof Error ? error.message : "Could not regenerate carousel",
      });
    }
  }, [draft?.id, generationPhase.status, runCandidateFetch, trend, trendId, updateDraft]);

  const handleCopyMarkdown = useCallback(async () => {
    if (!workingContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(carouselToMarkdown(workingContent));
      setCopyState("markdown");
      toast({
        title: "Copied to clipboard",
        description: "Instagram carousel markdown is ready to paste.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy markdown to the clipboard.",
        variant: "destructive",
      });
    }
  }, [toast, workingContent]);

  const saveStateLabel = useMemo(() => {
    if (saveState === "saving") {
      return "Saving...";
    }

    if (saveState === "error") {
      return "Save failed";
    }

    if (saveState === "saved") {
      return formatSavedTime(lastSavedAt);
    }

    return "Saved";
  }, [lastSavedAt, saveState]);

  if (!trendId) {
    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-12">
          <Link
            href="/content-hub/trends"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trends Log
          </Link>
          <section className="ch-panel mt-8 px-6 py-14 text-center">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Trend not found</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              It may have been deleted or the link is incorrect.
            </p>
            <Link href="/content-hub/trends" className="ch-inline-button ch-inline-button-primary mt-6 inline-flex">
              Return to Trends Log
            </Link>
          </section>
        </div>
      </div>
    );
  }

  const topBar = (
    <header className="ch-composer-topbar">
      <div className="ch-composer-topbar-left">
        <Link
          href={`/content-hub/trends/${trendId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="ch-composer-crumb">
          <span>Content Hub</span>
          <span className="ch-composer-crumb-sep">/</span>
          <span>{trend ? trend.topic : <Skeleton className="inline-flex h-4 w-40 bg-[rgba(10,10,10,0.08)] align-middle" />}</span>
          <span className="ch-composer-crumb-sep">/</span>
          <strong>Compose IG</strong>
        </div>
      </div>

      <div className="ch-composer-topbar-right">
        <div
          className={[
            "ch-save-indicator",
            saveState === "saved" ? "is-saved" : "",
            saveState === "error" ? "is-error" : "",
          ].join(" ")}
        >
          {saveStateLabel}
        </div>
        {saveState === "error" ? (
          <button type="button" onClick={handleRetrySave} className="ch-composer-mini-button">
            Retry
          </button>
        ) : null}
        <ComposerDisabledButton className="ch-inline-button ch-inline-button-muted opacity-60">
          Version history
        </ComposerDisabledButton>
        <ComposerDisabledButton className="ch-inline-button ch-inline-button-muted opacity-60">
          Preview
        </ComposerDisabledButton>
        <button
          type="button"
          onClick={() => setRegenerateOpen(true)}
          disabled={generationPhase.status !== "idle"}
          className="ch-inline-button ch-inline-button-muted"
        >
          {generationPhase.status !== "idle" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {generationPhase.status !== "idle" ? "Working..." : "Regenerate"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyMarkdown()}
          disabled={!workingContent}
          className="ch-inline-button ch-inline-button-primary"
        >
          {copyState === "markdown" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copyState === "markdown" ? "Copied" : "Copy markdown"}
        </button>
      </div>
    </header>
  );

  if (isPocketBaseNotFound(trendQuery.error)) {
    return (
      <div className="content-hub">
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-12">
          <Link
            href="/content-hub/trends"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trends Log
          </Link>
          <section className="ch-panel mt-8 px-6 py-14 text-center">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Trend not found</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--ch-secondary)]">
              It may have been deleted or the link is incorrect.
            </p>
            <Link href="/content-hub/trends" className="ch-inline-button ch-inline-button-primary mt-6 inline-flex">
              Return to Trends Log
            </Link>
          </section>
        </div>
      </div>
    );
  }

  if (trendQuery.isLoading || (trendQuery.isSuccess && (draftQuery.isLoading || !isHydrated))) {
    return (
      <div className="content-hub">
        {topBar}
        <ComposerSkeleton />
      </div>
    );
  }

  if (trendQuery.isError || !trend) {
    return (
      <div className="content-hub">
        {topBar}
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-12">
          <section className="ch-panel px-6 py-12">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Could not load composer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">
              {trendQuery.error instanceof Error ? trendQuery.error.message : "We couldn’t load the source trend for this composer yet."}
            </p>
          </section>
        </div>
      </div>
    );
  }

  if (draftQuery.isError || !draft) {
    return (
      <div className="content-hub">
        {topBar}
        <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-8 md:py-12">
          <section className="ch-panel px-6 py-12">
            <h1 className="text-2xl font-semibold text-[var(--ch-text)]">Could not load draft</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ch-secondary)]">
              {draftQuery.error instanceof Error ? draftQuery.error.message : "We couldn’t load or create the working Instagram draft."}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="content-hub">
      {topBar}

      <div className="ch-composer-shell ch-ig-composer-shell">
        <aside className="ch-composer-side">
          <div className="space-y-5 p-6">
            <div>
              <div className="ch-kicker">Source trend</div>
              <h1 className="mt-3 text-[18px] font-semibold leading-7 text-[var(--ch-text)]">{trend.topic}</h1>
              <p className="mt-2 text-[13px] leading-6 text-[var(--ch-secondary)]">
                {trend.angle || "No editorial angle yet."}
              </p>
              <a
                href={`/content-hub/trends/${trendId}`}
                className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--ch-secondary)] transition-colors hover:text-[var(--ch-text)]"
              >
                View full trend
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-[var(--ch-border)] pb-5">
              <span className="inline-flex items-center border border-[var(--ch-border)] bg-[var(--ch-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                {categoryLabel}
              </span>
              <TrendSignalBadge score={trend.signal_score} />
            </div>

            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                    Suggested title
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(suggestedTitle, "suggested-title")}
                    disabled={!suggestedTitle}
                    className="ch-composer-mini-button"
                  >
                    {copyState === "suggested-title" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="font-[Georgia,'Times_New_Roman',serif] text-[14px] italic leading-6 text-[var(--ch-text)]">
                  {suggestedTitle || "No suggested title yet"}
                </div>
              </section>

              {shortTail.length > 0 ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                      Short-tail keywords
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(shortTail.join(", "), "short-tail")}
                      className="ch-composer-mini-button"
                    >
                      {copyState === "short-tail" ? "Copied" : "Copy all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shortTail.map((item) => (
                      <span key={item} className="ch-keyword-chip">{item}</span>
                    ))}
                  </div>
                </section>
              ) : null}

              {longTail.length > 0 ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                      Long-tail keywords
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(longTail.join(", "), "long-tail")}
                      className="ch-composer-mini-button"
                    >
                      {copyState === "long-tail" ? "Copied" : "Copy all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {longTail.map((item) => (
                      <span key={item} className="ch-keyword-chip">{item}</span>
                    ))}
                  </div>
                </section>
              ) : null}

              {geoQuestions.length > 0 ? (
                <section>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ch-secondary)]">
                    Questions to cover
                  </div>
                  <div className="border-t border-[var(--ch-border)]">
                    {geoQuestions.map((item) => (
                      <div key={item} className="border-b border-[var(--ch-border)] py-3 text-[12px] leading-6 text-[var(--ch-text)] last:border-b-0">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="ch-composer-main">
          <div className="mx-auto w-full max-w-[920px]">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ch-secondary)]">
              Instagram carousel · {resolvedTitle}
            </div>

            {showGeneratePanel || !workingContent ? (
              <IGGeneratePanel
                trendTopic={trend.topic}
                onGenerate={handleGenerate}
                isGenerating={generationPhase.status === "generating"}
                error={generationPhase.status === "error" ? generationPhase.message : null}
              />
            ) : (
              <div className="ch-ig-editor-stack">
                <IGCoverCard
                  cover={workingContent.cover}
                  carouselHeadline={workingContent.cover.headline}
                  onChange={updateCover}
                />

                {workingContent.items.map((item, index) => (
                  <IGItemCard
                    key={`${index}-${item.image_query}`}
                    item={item}
                    index={index}
                    carouselHeadline={workingContent.cover.headline}
                    clearedFlags={clearedFlags}
                    onChange={(next) => updateItem(index, next)}
                    onClearFlag={(field, flagText) => handleClearItemFlag(index, field, flagText)}
                  />
                ))}

                <IGCaptionEditor
                  caption={workingContent.caption}
                  hashtags={workingContent.hashtags}
                  clearedFlags={clearedFlags}
                  onCaptionChange={updateCaption}
                  onHashtagsChange={updateHashtags}
                  onClearFlag={handleClearCaptionFlag}
                />

                <IGMetaNote note={workingContent.meta_note} />
              </div>
            )}

            {saveState === "error" && saveErrorMessage ? (
              <div className="mt-4 text-sm text-[var(--ch-error)]">{saveErrorMessage}</div>
            ) : null}
          </div>
        </main>
      </div>

      <IGRegenerateModal
        isOpen={regenerateOpen && generationPhase.status === "idle"}
        currentItemCount={currentItemCount}
        isRegenerating={generationPhase.status === "generating"}
        onClose={() => setRegenerateOpen(false)}
        onConfirm={handleRegenerate}
      />

      {showGenerationModal ? (
        <div
          className="ch-generation-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ch-generation-modal-title"
          aria-describedby="ch-generation-modal-description"
        >
          <div className="ch-generation-modal">
            <div className="ch-kicker">AI draft in progress</div>
            {generationPhase.status === "error" ? (
              <>
                <h2 id="ch-generation-modal-title" className="ch-generation-modal-title">
                  Something went wrong
                </h2>
                <p id="ch-generation-modal-description" className="ch-generation-modal-description">
                  {generationPhase.message}
                </p>
                <button
                  type="button"
                  onClick={() => setGenerationPhase({ status: "idle" })}
                  className="ch-inline-button ch-inline-button-primary"
                  style={{ marginTop: "1rem" }}
                >
                  Dismiss
                </button>
              </>
            ) : generationPhase.status === "finding_images" ? (
              <>
                <h2 id="ch-generation-modal-title" className="ch-generation-modal-title">
                  Finding images
                </h2>
                <p id="ch-generation-modal-description" className="ch-generation-modal-description">
                  Copy is ready. Now searching the web for image options for each tile — this usually takes another minute.
                </p>

                <div className="ch-generation-progress" aria-hidden="true">
                  <div
                    className="ch-generation-progress-bar"
                    style={{ width: `${50 + (generationPhase.ready / generationPhase.total) * 50}%` }}
                  />
                </div>

                <div className="ch-generation-modal-meta">
                  <span>{generationStageLabel}</span>
                  <span>{Math.round(50 + (generationPhase.ready / generationPhase.total) * 50)}%</span>
                </div>
              </>
            ) : (
              <>
                <h2 id="ch-generation-modal-title" className="ch-generation-modal-title">
                  Generating Instagram carousel
                </h2>
                <p id="ch-generation-modal-description" className="ch-generation-modal-description">
                  We&apos;re turning this trend brief into a first carousel draft. This full process takes about 2 minutes — copy first, then images.
                </p>

                <div className="ch-generation-progress" aria-hidden="true">
                  <div
                    className="ch-generation-progress-bar"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>

                <div className="ch-generation-modal-meta">
                  <span>{generationStageLabel}</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
