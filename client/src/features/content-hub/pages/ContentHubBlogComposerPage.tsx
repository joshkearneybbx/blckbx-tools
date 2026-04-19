import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import FlaggedContent from "../components/FlaggedContent";
import { stripFlagMarkers } from "../lib/flag-parser";
import {
  useContentHubBlogDraft,
  useContentHubTrend,
  useUpdateClearedFlags,
  useUpdateContentHubBlogDraft,
} from "../lib/pb-queries";
import type {
  ContentHubAssetRecord,
  ContentHubTrendCategory,
  ContentHubTrendRecord,
} from "../types";
import "../content-hub.css";

type ComposerFields = {
  title: string;
  subtitle: string;
  slug: string;
  content: string;
};

type SaveState = "idle" | "saving" | "saved" | "retrying" | "error";

const EMPTY_FIELDS: ComposerFields = {
  title: "",
  subtitle: "",
  slug: "",
  content: "",
};

const AUTOSAVE_DEBOUNCE_MS = 600;
const SAVE_RETRY_DELAY_MS = 2000;
const GENERATION_TIMEOUT_MS = 90_000;
const COPY_STATE_DURATION_MS = 1500;
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

interface BlogGenerationRequest {
  trend: ContentHubTrendRecord;
  adjustments: {
    length_target: number;
    custom_instructions: string;
  };
}

interface BlogGenerationMeta {
  model: string;
  cost_estimate_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  generation_params: {
    temperature: number;
    length_target: number;
    custom_instructions: string;
    style_guide_id: string;
  };
  generated_at: string;
}

interface BlogGenerationSuccessResponse {
  success: true;
  draft: {
    title: string;
    subtitle: string;
    slug: string;
    content: string;
  };
  meta: BlogGenerationMeta;
}

interface BlogGenerationFailureResponse {
  success: false;
  error: string;
  [key: string]: unknown;
}

type BlogGenerationResponse = BlogGenerationSuccessResponse | BlogGenerationFailureResponse;

function isPocketBaseNotFound(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: number }).status === 404,
  );
}

function assetContentToString(value: ContentHubAssetRecord["content"]) {
  if (typeof value === "string") {
    return value.trim() ? value : "";
  }

  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function draftFieldsFromAsset(asset: ContentHubAssetRecord): ComposerFields {
  const content = assetContentToString(asset.content);
  const subtitle = asset.subtitle ?? "";
  const slug = asset.slug ?? "";
  const isNewUntitledDraft = asset.title === "Untitled" && !subtitle && !slug && !content;

  return {
    title: isNewUntitledDraft ? "" : asset.title,
    subtitle,
    slug,
    content,
  };
}

function normalizeDraftFields(fields: ComposerFields): ComposerFields {
  return {
    title: fields.title.trim() || "Untitled",
    subtitle: fields.subtitle,
    slug: fields.slug.trim().replace(/^\/?blog\//, ""),
    content: fields.content.trim() ? fields.content : " ",
  };
}

function areFieldsEqual(left: ComposerFields | null, right: ComposerFields | null) {
  if (!left || !right) {
    return false;
  }

  return (
    left.title === right.title &&
    left.subtitle === right.subtitle &&
    left.slug === right.slug &&
    left.content === right.content
  );
}

function normalizeClearedFlags(value: ContentHubAssetRecord["cleared_flags"]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function formatCompactNumber(value?: number | null) {
  const numeric = Number(value ?? 0);

  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: numeric >= 100 ? 0 : 1,
  }).format(numeric);
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

function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
}

function estimateReadTime(words: number) {
  return words > 0 ? Math.ceil(words / 225) : 0;
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
    <div className="ch-composer-shell">
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
        <div className="mx-auto w-full max-w-[820px] space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-40 bg-[rgba(10,10,10,0.06)]" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 bg-[rgba(10,10,10,0.05)]" />
              <Skeleton className="h-9 w-32 bg-[rgba(10,10,10,0.05)]" />
            </div>
          </div>

          <div className="ch-composer-generate-panel">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-64 bg-[rgba(255,255,255,0.14)]" />
              <Skeleton className="h-4 w-full max-w-[520px] bg-[rgba(255,255,255,0.1)]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 bg-[rgba(255,255,255,0.12)]" />
              <Skeleton className="h-10 w-36 bg-[rgba(255,255,255,0.16)]" />
            </div>
          </div>

          <div className="ch-composer-doc-card">
            <Skeleton className="h-10 w-3/4 bg-[rgba(10,10,10,0.06)]" />
            <Skeleton className="mt-4 h-6 w-2/3 bg-[rgba(10,10,10,0.05)]" />
            <Skeleton className="mt-6 h-12 w-full bg-[rgba(10,10,10,0.04)]" />
            <Skeleton className="mt-6 h-[420px] w-full bg-[rgba(10,10,10,0.04)]" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ContentHubBlogComposerPage() {
  const [, params] = useRoute("/content-hub/compose/blog/:trendId");
  const trendId = params?.trendId ? decodeURIComponent(params.trendId) : "";
  const trendQuery = useContentHubTrend(trendId);
  const draftQuery = useContentHubBlogDraft(trendId, trendQuery.isSuccess);
  const updateDraft = useUpdateContentHubBlogDraft();
  const updateClearedFlags = useUpdateClearedFlags();
  const { toast } = useToast();

  const [fields, setFields] = useState<ComposerFields>(EMPTY_FIELDS);
  const [clearedFlagIds, setClearedFlagIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [, forceRelativeTimeTick] = useState(0);

  const latestFieldsRef = useRef(fields);
  const latestClearedFlagIdsRef = useRef<string[]>([]);
  const lastSavedFieldsRef = useRef<ComposerFields | null>(null);
  const lastSavedClearedFlagsRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const clearFlagsDebounceTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const clearFlagsInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const queuedClearFlagsRef = useRef(false);
  const retryScheduledRef = useRef(false);

  const trend = trendQuery.data;
  const draft = draftQuery.data;

  const suggestedTitle = trend?.suggested_title?.trim() ?? "";
  const shortTail = trend?.seo_short_tail?.filter(Boolean) ?? [];
  const longTail = trend?.seo_long_tail?.filter(Boolean) ?? [];
  const geoQuestions = trend?.geo_questions?.filter(Boolean) ?? [];
  const categoryLabel = trend?.category ? CATEGORY_LABELS[trend.category] : "Uncategorised";
  const resolvedTitle = fields.title.trim() || "Untitled";
  const plainContent = useMemo(() => stripFlagMarkers(fields.content), [fields.content]);
  const contentWordCount = useMemo(() => wordCount(plainContent), [plainContent]);
  const readTime = useMemo(() => estimateReadTime(contentWordCount), [contentWordCount]);
  const showGenerationPanel = !plainContent.trim();
  const generationStageLabel = useMemo(() => (
    GENERATION_STAGES.find((stage) => generationProgress <= stage.threshold)?.label
    ?? GENERATION_STAGES[GENERATION_STAGES.length - 1].label
  ), [generationProgress]);

  latestFieldsRef.current = fields;
  latestClearedFlagIdsRef.current = clearedFlagIds;

  useEffect(() => {
    setFields(EMPTY_FIELDS);
    setClearedFlagIds([]);
    latestFieldsRef.current = EMPTY_FIELDS;
    latestClearedFlagIdsRef.current = [];
    lastSavedFieldsRef.current = null;
    lastSavedClearedFlagsRef.current = [];
    setIsHydrated(false);
    setSaveState("idle");
    setLastSavedAt(null);
    setSaveErrorMessage(null);
    setIsGenerating(false);
    setGenerationProgress(0);
    setCopyState(null);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (clearFlagsDebounceTimerRef.current) {
      window.clearTimeout(clearFlagsDebounceTimerRef.current);
      clearFlagsDebounceTimerRef.current = null;
    }

    saveInFlightRef.current = false;
    clearFlagsInFlightRef.current = false;
    queuedSaveRef.current = false;
    queuedClearFlagsRef.current = false;
    retryScheduledRef.current = false;
  }, [trendId]);

  useEffect(() => {
    if (!draft || isHydrated) {
      return;
    }

    const nextFields = draftFieldsFromAsset(draft);
    const normalized = normalizeDraftFields(nextFields);
    const nextClearedFlags = normalizeClearedFlags(draft.cleared_flags);

    setFields(nextFields);
    setClearedFlagIds(nextClearedFlags);
    latestFieldsRef.current = nextFields;
    latestClearedFlagIdsRef.current = nextClearedFlags;
    lastSavedFieldsRef.current = normalized;
    lastSavedClearedFlagsRef.current = nextClearedFlags;
    setLastSavedAt(draft.updated);
    setSaveState("saved");
    setSaveErrorMessage(null);
    setIsHydrated(true);
  }, [draft, isHydrated]);

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
    if (!isGenerating) {
      setGenerationProgress(0);
      return;
    }

    setGenerationProgress(8);

    const interval = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current >= 92) {
          return current;
        }

        const remaining = 92 - current;
        const nextStep = Math.max(3, Math.round(remaining * 0.18));
        return Math.min(92, current + nextStep);
      });
    }, GENERATION_PROGRESS_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [isGenerating]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }

      if (clearFlagsDebounceTimerRef.current) {
        window.clearTimeout(clearFlagsDebounceTimerRef.current);
      }
    };
  }, []);

  const saveDraft = useCallback(async (normalizedFields: ComposerFields, attempt = 0) => {
    if (!draft?.id || !trendId) {
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    setSaveState(attempt === 0 ? "saving" : "saving");
    setSaveErrorMessage(null);

    try {
      const updatedDraft = await updateDraft.mutateAsync({
        draftId: draft.id,
        trendId,
        data: normalizedFields,
      });

      lastSavedFieldsRef.current = normalizedFields;
      setLastSavedAt(updatedDraft.updated);
      setSaveState("saved");
      setSaveErrorMessage(null);
      retryScheduledRef.current = false;

      saveInFlightRef.current = false;

      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        const latestNormalized = normalizeDraftFields(latestFieldsRef.current);
        if (!areFieldsEqual(latestNormalized, lastSavedFieldsRef.current)) {
          void saveDraft(latestNormalized, 0);
        }
      }
    } catch (error) {
      saveInFlightRef.current = false;

      if (attempt === 0) {
        retryScheduledRef.current = true;
        setSaveState("retrying");
        setSaveErrorMessage(error instanceof Error ? error.message : "Save failed");
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          retryScheduledRef.current = false;
          const latestNormalized = normalizeDraftFields(latestFieldsRef.current);
          void saveDraft(latestNormalized, 1);
        }, SAVE_RETRY_DELAY_MS);
        return;
      }

      setSaveState("error");
      setSaveErrorMessage(error instanceof Error ? error.message : "Save failed");
    }
  }, [draft?.id, trendId, updateDraft]);

  useEffect(() => {
    if (!isHydrated || !draft?.id || retryScheduledRef.current) {
      return;
    }

    const normalized = normalizeDraftFields(fields);
    if (areFieldsEqual(normalized, lastSavedFieldsRef.current)) {
      return;
    }

    setSaveState("saving");

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const latestNormalized = normalizeDraftFields(latestFieldsRef.current);
      if (areFieldsEqual(latestNormalized, lastSavedFieldsRef.current)) {
        return;
      }

      void saveDraft(latestNormalized, 0);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [draft?.id, fields, isHydrated, saveDraft]);

  const saveClearedFlags = useCallback(async (nextClearedFlags: string[]) => {
    if (!draft?.id || !trendId) {
      return;
    }

    if (clearFlagsDebounceTimerRef.current) {
      window.clearTimeout(clearFlagsDebounceTimerRef.current);
      clearFlagsDebounceTimerRef.current = null;
    }

    if (clearFlagsInFlightRef.current) {
      queuedClearFlagsRef.current = true;
      return;
    }

    clearFlagsInFlightRef.current = true;

    try {
      const updatedDraft = await updateClearedFlags.mutateAsync({
        draftId: draft.id,
        trendId,
        clearedFlags: nextClearedFlags,
      });

      lastSavedClearedFlagsRef.current = normalizeClearedFlags(updatedDraft.cleared_flags);
      setLastSavedAt(updatedDraft.updated);
    } catch {
      // Keep the UI optimistic. The next clear/edit will retry with the latest list.
    } finally {
      clearFlagsInFlightRef.current = false;

      if (queuedClearFlagsRef.current) {
        queuedClearFlagsRef.current = false;
        const latestClearedFlags = latestClearedFlagIdsRef.current;
        if (!areStringArraysEqual(latestClearedFlags, lastSavedClearedFlagsRef.current)) {
          void saveClearedFlags(latestClearedFlags);
        }
      }
    }
  }, [draft?.id, trendId, updateClearedFlags]);

  useEffect(() => {
    if (!isHydrated || !draft?.id) {
      return;
    }

    if (areStringArraysEqual(clearedFlagIds, lastSavedClearedFlagsRef.current)) {
      return;
    }

    if (clearFlagsDebounceTimerRef.current) {
      window.clearTimeout(clearFlagsDebounceTimerRef.current);
    }

    clearFlagsDebounceTimerRef.current = window.setTimeout(() => {
      const latestClearedFlags = latestClearedFlagIdsRef.current;
      if (areStringArraysEqual(latestClearedFlags, lastSavedClearedFlagsRef.current)) {
        return;
      }

      void saveClearedFlags(latestClearedFlags);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (clearFlagsDebounceTimerRef.current) {
        window.clearTimeout(clearFlagsDebounceTimerRef.current);
        clearFlagsDebounceTimerRef.current = null;
      }
    };
  }, [clearedFlagIds, draft?.id, isHydrated, saveClearedFlags]);

  const handleClearFlag = useCallback((flagId: string) => {
    setClearedFlagIds((current) => (
      current.includes(flagId) ? current : [...current, flagId]
    ));
  }, []);

  const handleRetrySave = useCallback(() => {
    const normalized = normalizeDraftFields(latestFieldsRef.current);
    void saveDraft(normalized, 0);
  }, [saveDraft]);

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

  const handleGenerateDraft = useCallback(async () => {
    if (!trend || !draft?.id || isGenerating) {
      return;
    }

    const webhookUrl = import.meta.env.VITE_CH_BLOG_GENERATE_WEBHOOK;
    const webhookSecret = import.meta.env.VITE_CH_BLOG_GENERATE_SECRET;

    if (!webhookUrl || !webhookSecret) {
      toast({
        title: "Generation failed: webhook is not configured",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const generationToast = toast({
      title: "Generating...",
      description: "Creating a draft from the trend brief.",
    });

    try {
      let response: Response;

      try {
        const requestBody: BlogGenerationRequest = {
          trend,
          adjustments: {
            length_target: 800,
            custom_instructions: "",
          },
        };

        response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": webhookSecret,
          },
          body: JSON.stringify(requestBody),
          signal: withTimeout(GENERATION_TIMEOUT_MS),
        });
      } catch {
        toast({
          title: "Generation failed: could not reach the server",
          variant: "destructive",
        });
        return;
      }

      let payload: BlogGenerationResponse | null = null;

      try {
        payload = await response.json() as BlogGenerationResponse;
      } catch {
        payload = null;
      }

      if (payload && payload.success === false) {
        toast({
          title: payload.error || "Generation failed",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok || !payload || !payload.success) {
        toast({
          title: "Generation failed: server error",
          variant: "destructive",
        });
        return;
      }

      const generatedFields: ComposerFields = {
        title: payload.draft.title.trim() || trend.suggested_title?.trim() || `Draft: ${trend.topic}`,
        subtitle: payload.draft.subtitle?.trim() || "",
        slug: payload.draft.slug?.trim() || slugify(payload.draft.title || trend.topic),
        content: payload.draft.content,
      };

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (clearFlagsDebounceTimerRef.current) {
        window.clearTimeout(clearFlagsDebounceTimerRef.current);
        clearFlagsDebounceTimerRef.current = null;
      }

      try {
        const updatedDraft = await updateDraft.mutateAsync({
          draftId: draft.id,
          trendId,
          data: {
            title: generatedFields.title,
            subtitle: generatedFields.subtitle,
            slug: generatedFields.slug,
            content: generatedFields.content,
            model: payload.meta.model,
            cost_estimate: payload.meta.cost_estimate_usd,
            generation_params: {
              ...payload.meta.generation_params,
              prompt_tokens: payload.meta.prompt_tokens,
              completion_tokens: payload.meta.completion_tokens,
              generated_at: payload.meta.generated_at,
            },
            cleared_flags: [],
          },
        });

        setFields(generatedFields);
        setClearedFlagIds([]);
        latestFieldsRef.current = generatedFields;
        latestClearedFlagIdsRef.current = [];
        lastSavedFieldsRef.current = normalizeDraftFields(generatedFields);
        lastSavedClearedFlagsRef.current = [];
        queuedSaveRef.current = false;
        queuedClearFlagsRef.current = false;
        retryScheduledRef.current = false;
        setLastSavedAt(updatedDraft.updated);
        setSaveState("saved");
        setSaveErrorMessage(null);
      } catch (error) {
        toast({
          title: "Generation failed: could not save the draft",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
        return;
      }
    } finally {
      generationToast.dismiss();
      setIsGenerating(false);
    }
  }, [draft?.id, isGenerating, toast, trend, trendId, updateDraft]);

  const handleCopyMarkdown = useCallback(async () => {
    const markdown = [
      `# ${resolvedTitle}`,
      "",
      fields.subtitle.trim() ? `*${fields.subtitle.trim()}*` : "",
      fields.subtitle.trim() ? "" : "",
      plainContent,
    ].filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
      .join("\n");

    await copyToClipboard(markdown, "markdown");
  }, [copyToClipboard, fields.subtitle, plainContent, resolvedTitle]);

  const saveStateLabel = useMemo(() => {
    if (saveState === "saving") {
      return "Saving...";
    }

    if (saveState === "retrying") {
      return "Save failed — retrying";
    }

    if (saveState === "error") {
      return "Save failed";
    }

    if (saveState === "saved") {
      return formatSavedTime(lastSavedAt);
    }

    return "Draft ready";
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
          <span>Compose</span>
          <span className="ch-composer-crumb-sep">/</span>
          <strong>
            Blog — {trend ? trend.topic : <Skeleton className="inline-flex h-4 w-40 bg-[rgba(10,10,10,0.08)] align-middle" />}
          </strong>
        </div>
      </div>

      <div className="ch-composer-topbar-right">
        <div
          className={[
            "ch-save-indicator",
            saveState === "saved" ? "is-saved" : "",
            saveState === "error" || saveState === "retrying" ? "is-error" : "",
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
        <button type="button" onClick={() => void handleCopyMarkdown()} className="ch-inline-button ch-inline-button-primary">
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

  if (trendQuery.isLoading || (trendQuery.isSuccess && draftQuery.isLoading && !isHydrated)) {
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
              {draftQuery.error instanceof Error ? draftQuery.error.message : "We couldn’t load or create the working blog draft."}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="content-hub">
      {topBar}

      <div className="ch-composer-shell">
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
          <div className="mx-auto w-full max-w-[820px]">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ch-secondary)]">
                Blog draft · {resolvedTitle}
              </div>
              <div className="flex flex-wrap gap-2">
                <ComposerDisabledButton className="ch-inline-button ch-inline-button-muted opacity-60">
                  Tone: BlckBx
                </ComposerDisabledButton>
                <ComposerDisabledButton className="ch-inline-button ch-inline-button-muted opacity-60">
                  Length: ~800 words
                </ComposerDisabledButton>
              </div>
            </div>

            {showGenerationPanel ? (
              <section className="ch-composer-generate-panel">
                <div className="min-w-0 flex-1">
                  <div className="ch-composer-generate-title">Draft with AI using this trend brief</div>
                  <p className="ch-composer-generate-sub">
                    Uses the suggested title, keywords, questions and BlckBx voice. You&apos;ll review and edit before publishing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ComposerDisabledButton className="ch-composer-dark-ghost-button opacity-70">
                    Adjust prompt
                  </ComposerDisabledButton>
                  <button
                    type="button"
                    onClick={() => void handleGenerateDraft()}
                    disabled={isGenerating}
                    className="ch-composer-dark-primary-button"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isGenerating ? "Generating..." : "Generate draft"}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="ch-composer-doc-card">
              <input
                value={fields.title}
                onChange={(event) => setFields((current) => ({ ...current, title: event.target.value }))}
                placeholder="Blog title..."
                className="ch-composer-title-input"
              />

              <input
                value={fields.subtitle}
                onChange={(event) => setFields((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Optional subtitle or dek..."
                className="ch-composer-subtitle-input"
              />

              <div className="ch-composer-meta-strip">
                <span>Slug:</span>
                <span className="text-[var(--ch-muted)]">/blog/</span>
                <input
                  value={fields.slug}
                  onChange={(event) => setFields((current) => ({
                    ...current,
                    slug: event.target.value.replace(/^\/?blog\//, ""),
                  }))}
                  className="ch-composer-slug-input"
                />
                <span className="text-[var(--ch-muted)]">·</span>
                <span>
                  By <strong className="font-semibold text-[var(--ch-text)]">BlckBx</strong>
                </span>
              </div>

              <FlaggedContent
                content={fields.content}
                clearedFlagIds={clearedFlagIds}
                onChange={(nextContent) => setFields((current) => ({ ...current, content: nextContent }))}
                onClearFlag={handleClearFlag}
                placeholder="Start writing, or click Generate draft above to produce a first cut from the trend brief..."
                className="ch-composer-body-input ch-composer-body-editor"
              />
            </section>

            <div className="ch-composer-footer">
              <div>
                <strong className="font-semibold text-[var(--ch-text)]">{contentWordCount}</strong> words · ~{readTime} min read
              </div>
              <div className="flex flex-wrap gap-2">
                <ComposerDisabledButton className="ch-composer-ghost-button opacity-70">
                  Regenerate section
                </ComposerDisabledButton>
                <ComposerDisabledButton className="ch-composer-ghost-button opacity-70">
                  Check against keywords
                </ComposerDisabledButton>
                <ComposerDisabledButton className="ch-composer-ghost-button opacity-70">
                  Check tone
                </ComposerDisabledButton>
              </div>
            </div>

            {saveState === "error" && saveErrorMessage ? (
              <div className="mt-4 text-sm text-[var(--ch-error)]">
                {saveErrorMessage}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {isGenerating ? (
        <div
          className="ch-generation-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ch-generation-modal-title"
          aria-describedby="ch-generation-modal-description"
        >
          <div className="ch-generation-modal">
            <div className="ch-kicker">AI draft in progress</div>
            <h2 id="ch-generation-modal-title" className="ch-generation-modal-title">
              Generating blog draft
            </h2>
            <p id="ch-generation-modal-description" className="ch-generation-modal-description">
              We&apos;re turning this trend brief into a first draft. This can take around 30 seconds.
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
