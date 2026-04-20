import { createElement, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { pb } from "@/lib/pocketbase";
import type {
  ContentHubAssetRecord,
  ContentHubSortKey,
  ContentHubStatusFilter,
  ContentHubTrendRecord,
  ContentHubTrendSourceRecord,
  ContentHubTrendsQueryResult,
  ContentHubTrendStatus,
  IGCarouselContent,
} from "../types";

const SORT_MAP: Record<ContentHubSortKey, string> = {
  signal_score: "-signal_score,-last_seen_at",
  recency: "-last_seen_at,-signal_score",
  velocity: "-velocity,-signal_score",
  views: "-views,-signal_score",
};

const CONTENT_HUB_TRENDS_QUERY_KEY = ["content-hub-trends-live"] as const;
const CONTENT_HUB_TREND_COUNT_QUERY_KEY = ["content-hub-trends-total-count-live"] as const;
const CONTENT_HUB_TREND_QUERY_KEY = ["content-hub-trend-live"] as const;
const CONTENT_HUB_TREND_SOURCES_QUERY_KEY = ["content-hub-trend-sources-live"] as const;
const CONTENT_HUB_ASSETS_QUERY_KEY = ["content-hub-assets-live"] as const;
const CONTENT_HUB_BLOG_DRAFT_QUERY_KEY = ["content-hub-blog-draft-live"] as const;
const CONTENT_HUB_IG_DRAFT_QUERY_KEY = ["content-hub-ig-draft-live"] as const;

type TrendStatusTarget = Pick<ContentHubTrendRecord, "id" | "status" | "topic">;

type CachedTrendsQuery = readonly [readonly unknown[], ContentHubTrendsQueryResult | undefined];

type UpdateTrendStatusContext = {
  previousQueries: CachedTrendsQuery[];
  previousTrend?: ContentHubTrendRecord;
};

function buildStatusFilter(statusFilter: ContentHubStatusFilter) {
  switch (statusFilter) {
    case "active":
      return 'status != "dismissed"';
    case "pinned":
      return 'status = "pinned"';
    case "dismissed":
      return 'status = "dismissed"';
    case "all":
    default:
      return "";
  }
}

function buildTrendSourceFilter(trendIds: string[]) {
  return trendIds.map((trendId) => `trend = "${trendId}"`).join(" || ");
}

function groupSourcesByTrendId(records: ContentHubTrendSourceRecord[]) {
  const grouped: Record<string, ContentHubTrendSourceRecord[]> = {};

  for (const record of records) {
    if (!grouped[record.trend]) {
      grouped[record.trend] = [];
    }

    grouped[record.trend].push(record);
  }

  return grouped;
}

function getTrendQueryKey(trendId: string) {
  return [...CONTENT_HUB_TREND_QUERY_KEY, trendId] as const;
}

function getTrendSourcesQueryKey(trendId: string) {
  return [...CONTENT_HUB_TREND_SOURCES_QUERY_KEY, trendId] as const;
}

function getBlogDraftQueryKey(trendId: string) {
  return [...CONTENT_HUB_BLOG_DRAFT_QUERY_KEY, trendId] as const;
}

function getIGDraftQueryKey(trendId: string) {
  return [...CONTENT_HUB_IG_DRAFT_QUERY_KEY, trendId] as const;
}

function isPocketBaseNotFound(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "status" in error &&
    (error as { status?: number }).status === 404,
  );
}

function normalizeAssetContentValue(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() ? value : " ";
}

export function useContentHubTrends(statusFilter: ContentHubStatusFilter, sortKey: ContentHubSortKey) {
  return useQuery<ContentHubTrendsQueryResult>({
    queryKey: [...CONTENT_HUB_TRENDS_QUERY_KEY, statusFilter, sortKey],
    queryFn: async () => {
      const trendResult = await pb.collection("ch_trends").getList(1, 100, {
        filter: buildStatusFilter(statusFilter) || undefined,
        sort: SORT_MAP[sortKey],
        requestKey: null,
      });

      const trends = trendResult.items as unknown as ContentHubTrendRecord[];
      const trendIds = trends.map((trend) => trend.id);

      if (trendIds.length === 0) {
        return {
          trends,
          sourcesByTrendId: {},
        };
      }

      const sourceRecords = await pb.collection("ch_trend_sources").getFullList({
        filter: buildTrendSourceFilter(trendIds),
        sort: "source,-seen_at",
        requestKey: null,
      });

      return {
        trends,
        sourcesByTrendId: groupSourcesByTrendId(
          sourceRecords as unknown as ContentHubTrendSourceRecord[],
        ),
      };
    },
    enabled: pb.authStore.isValid,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useContentHubTrend(trendId?: string) {
  return useQuery<ContentHubTrendRecord>({
    queryKey: trendId ? getTrendQueryKey(trendId) : [...CONTENT_HUB_TREND_QUERY_KEY, "missing-id"],
    queryFn: async () => {
      if (!trendId) {
        throw new Error("Trend id is required");
      }

      const record = await pb.collection("ch_trends").getOne(trendId, {
        requestKey: null,
      });

      return record as unknown as ContentHubTrendRecord;
    },
    enabled: pb.authStore.isValid && Boolean(trendId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useContentHubTrendSources(trendId?: string) {
  return useQuery<ContentHubTrendSourceRecord[]>({
    queryKey: trendId ? getTrendSourcesQueryKey(trendId) : [...CONTENT_HUB_TREND_SOURCES_QUERY_KEY, "missing-id"],
    queryFn: async () => {
      if (!trendId) {
        throw new Error("Trend id is required");
      }

      const records = await pb.collection("ch_trend_sources").getFullList({
        filter: `trend = "${trendId}"`,
        sort: "-seen_at",
        requestKey: null,
      });

      return records as unknown as ContentHubTrendSourceRecord[];
    },
    enabled: pb.authStore.isValid && Boolean(trendId),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useContentHubBlogDraft(trendId?: string, enabled = true) {
  return useQuery<ContentHubAssetRecord>({
    queryKey: trendId ? getBlogDraftQueryKey(trendId) : [...CONTENT_HUB_BLOG_DRAFT_QUERY_KEY, "missing-id"],
    queryFn: async () => {
      if (!trendId) {
        throw new Error("Trend id is required");
      }

      try {
        const existingDraft = await pb.collection("ch_assets").getFirstListItem(
          `type = "blog" && trends ~ "${trendId}" && status = "draft"`,
          { requestKey: null },
        );

        return existingDraft as unknown as ContentHubAssetRecord;
      } catch (error) {
        if (!isPocketBaseNotFound(error)) {
          throw error;
        }
      }

      const userId = pb.authStore.model?.id;

      const createdDraft = await pb.collection("ch_assets").create(
        {
          type: "blog",
          status: "draft",
          trends: [trendId],
          title: "Untitled",
          subtitle: "",
          slug: "",
          content: " ",
          cleared_flags: [],
          ...(userId ? { created_by: userId } : {}),
        },
        { requestKey: null },
      );

      return createdDraft as unknown as ContentHubAssetRecord;
    },
    enabled: pb.authStore.isValid && Boolean(trendId) && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export async function fetchOrCreateIGDraft(trendId: string, userId: string) {
  const existing = await pb.collection("ch_assets").getFirstListItem(
    `type = "instagram_post" && trends ~ "${trendId}"`,
    { requestKey: null },
  ).catch(() => null);

  if (existing) {
    return existing as unknown as ContentHubAssetRecord;
  }

  return pb.collection("ch_assets").create(
    {
      type: "instagram_post",
      status: "draft",
      trends: [trendId],
      created_by: userId,
      title: "Untitled IG carousel",
      content: {
        cover: null,
        items: [],
        caption: "",
        hashtags: [],
      },
      cleared_flags: [],
    },
    { requestKey: null },
  ) as Promise<ContentHubAssetRecord>;
}

export async function updateIGDraft(
  assetId: string,
  content: IGCarouselContent,
  options?: { clearedFlags?: string[] },
) {
  const payload: {
    content: IGCarouselContent;
    title: string;
    cleared_flags?: string[];
  } = {
    content,
    title: content.cover?.headline || "Untitled IG carousel",
  };

  if (options?.clearedFlags) {
    payload.cleared_flags = options.clearedFlags;
  }

  return pb.collection("ch_assets").update(
    assetId,
    payload,
    { requestKey: null },
  ) as Promise<ContentHubAssetRecord>;
}

export async function clearIGFlag(assetId: string, currentClearedFlags: string[], flagText: string) {
  const updated = [...currentClearedFlags, flagText];
  return pb.collection("ch_assets").update(
    assetId,
    { cleared_flags: updated },
    { requestKey: null },
  ) as Promise<ContentHubAssetRecord>;
}

export function useContentHubIGDraft(trendId?: string, enabled = true) {
  return useQuery<ContentHubAssetRecord>({
    queryKey: trendId ? getIGDraftQueryKey(trendId) : [...CONTENT_HUB_IG_DRAFT_QUERY_KEY, "missing-id"],
    queryFn: async () => {
      if (!trendId) {
        throw new Error("Trend id is required");
      }

      const userId = pb.authStore.model?.id;
      if (!userId) {
        throw new Error("Authenticated user is required");
      }

      return fetchOrCreateIGDraft(trendId, userId);
    },
    enabled: pb.authStore.isValid && Boolean(trendId) && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useContentHubTrendCount() {
  return useQuery<number>({
    queryKey: CONTENT_HUB_TREND_COUNT_QUERY_KEY,
    queryFn: async () => {
      const result = await pb.collection("ch_trends").getList(1, 1, {
        requestKey: null,
      });

      return result.totalItems;
    },
    enabled: pb.authStore.isValid,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
}

export function useUpdateContentHubTrendStatus() {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, { id: string; status: ContentHubTrendStatus }, UpdateTrendStatusContext>({
    mutationFn: async ({ id, status }) => {
      return pb.collection("ch_trends").update(
        id,
        { status },
        { requestKey: null },
      );
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: CONTENT_HUB_TRENDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: getTrendQueryKey(id) });

      const previousQueries: CachedTrendsQuery[] = queryClient.getQueriesData<ContentHubTrendsQueryResult>({
        queryKey: CONTENT_HUB_TRENDS_QUERY_KEY,
      }).map(([queryKey, data]) => [queryKey, data] as const);

      const previousTrend = queryClient.getQueryData<ContentHubTrendRecord>(getTrendQueryKey(id));

      queryClient.setQueriesData<ContentHubTrendsQueryResult>(
        { queryKey: CONTENT_HUB_TRENDS_QUERY_KEY },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            trends: current.trends.map((trend) => (
              trend.id === id ? { ...trend, status } : trend
            )),
          };
        },
      );

      queryClient.setQueryData<ContentHubTrendRecord>(
        getTrendQueryKey(id),
        (current) => (current ? { ...current, status } : current),
      );

      return { previousQueries, previousTrend };
    },
    onError: (_error, variables, context) => {
      context?.previousQueries?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      if (context?.previousTrend) {
        queryClient.setQueryData(getTrendQueryKey(variables.id), context.previousTrend);
      }
    },
    onSettled: async (_data, _error, variables) => {
      if (variables?.id) {
        await queryClient.invalidateQueries({ queryKey: getTrendQueryKey(variables.id) });
      }

      await queryClient.invalidateQueries({ queryKey: CONTENT_HUB_TRENDS_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: CONTENT_HUB_TREND_COUNT_QUERY_KEY });
    },
  });
}

type UpdateContentHubBlogDraftData = Partial<Pick<
  ContentHubAssetRecord,
  "title" | "subtitle" | "slug" | "content" | "model" | "cost_estimate" | "generation_params" | "cleared_flags"
>>;

export function useUpdateContentHubBlogDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    ContentHubAssetRecord,
    unknown,
    {
      draftId: string;
      trendId: string;
      data: UpdateContentHubBlogDraftData;
    }
  >({
    mutationFn: async ({ draftId, data }) => {
      const payload = {
        ...data,
        ...(Object.prototype.hasOwnProperty.call(data, "content")
          ? { content: normalizeAssetContentValue(data.content) }
          : {}),
      };

      const updatedDraft = await pb.collection("ch_assets").update(draftId, payload, {
        requestKey: null,
      });

      return updatedDraft as unknown as ContentHubAssetRecord;
    },
    onSuccess: async (updatedDraft, variables) => {
      queryClient.setQueryData(getBlogDraftQueryKey(variables.trendId), updatedDraft);
      await queryClient.invalidateQueries({ queryKey: CONTENT_HUB_ASSETS_QUERY_KEY });
    },
  });
}

export function useUpdateClearedFlags() {
  const queryClient = useQueryClient();

  return useMutation<
    ContentHubAssetRecord,
    unknown,
    {
      draftId: string;
      trendId: string;
      clearedFlags: string[];
    }
  >({
    mutationFn: async ({ draftId, clearedFlags }) => {
      const updatedDraft = await pb.collection("ch_assets").update(
        draftId,
        { cleared_flags: clearedFlags },
        { requestKey: null },
      );

      return updatedDraft as unknown as ContentHubAssetRecord;
    },
    onSuccess: async (updatedDraft, variables) => {
      queryClient.setQueryData(getBlogDraftQueryKey(variables.trendId), updatedDraft);
      await queryClient.invalidateQueries({ queryKey: CONTENT_HUB_ASSETS_QUERY_KEY });
    },
  });
}

export function useUpdateContentHubIGDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    ContentHubAssetRecord,
    unknown,
    {
      assetId: string;
      trendId: string;
      content: IGCarouselContent;
      clearedFlags?: string[];
    }
  >({
    mutationFn: async ({ assetId, content, clearedFlags }) => {
      return updateIGDraft(assetId, content, { clearedFlags });
    },
    onSuccess: async (updatedDraft, variables) => {
      queryClient.setQueryData(getIGDraftQueryKey(variables.trendId), updatedDraft);
      await queryClient.invalidateQueries({ queryKey: CONTENT_HUB_ASSETS_QUERY_KEY });
    },
  });
}

export function useContentHubTrendStatusActions() {
  const { toast } = useToast();
  const updateTrendStatus = useUpdateContentHubTrendStatus();

  const showUpdateError = useCallback((error: unknown, title = "Could not update trend") => {
    toast({
      title,
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  const togglePin = useCallback((trend: TrendStatusTarget) => {
    const nextStatus: ContentHubTrendStatus = trend.status === "pinned" ? "active" : "pinned";

    updateTrendStatus.mutate(
      { id: trend.id, status: nextStatus },
      {
        onError: (error) => {
          showUpdateError(error);
        },
      },
    );
  }, [showUpdateError, updateTrendStatus]);

  const toggleDismiss = useCallback((trend: TrendStatusTarget) => {
    const nextStatus: ContentHubTrendStatus = trend.status === "dismissed" ? "active" : "dismissed";

    updateTrendStatus.mutate(
      { id: trend.id, status: nextStatus },
      {
        onSuccess: () => {
          if (nextStatus !== "dismissed") {
            return;
          }

          toast({
            title: "Dismissed",
            description: `“${trend.topic}” moved to Dismissed.`,
            duration: 5000,
            action: createElement(
              ToastAction,
              {
                altText: "Undo dismiss",
                onClick: () => {
                  updateTrendStatus.mutate(
                    { id: trend.id, status: "active" },
                    {
                      onError: (error) => {
                        showUpdateError(error, "Could not undo dismissal");
                      },
                    },
                  );
                },
              },
              "Undo",
            ) as unknown as ToastActionElement,
          });
        },
        onError: (error) => {
          showUpdateError(error);
        },
      },
    );
  }, [showUpdateError, toast, updateTrendStatus]);

  const isPendingForTrend = useCallback((trendId: string) => {
    return updateTrendStatus.isPending && updateTrendStatus.variables?.id === trendId;
  }, [updateTrendStatus.isPending, updateTrendStatus.variables]);

  return {
    togglePin,
    toggleDismiss,
    isPendingForTrend,
    updateTrendStatus,
  };
}
