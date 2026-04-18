import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  createCurationDecision,
  createList,
  emptySidebarCounts,
  fetchCandidates,
  fetchLists,
  fetchRecommendations,
  fetchStats,
  fetchTrendCandidates,
  fetchTrendStats,
  isShoppingTab,
  promoteCandidates,
  promoteTrendCandidates,
  updateCandidate,
  updateRecommendation,
  updateTrendCandidate
} from "../lib/api";
import type {
  CatalogueItem,
  CatalogueStatus,
  ContentTab,
  GridMode,
  ListOption,
  ReviewerName,
  StayingInFilter,
  TrendCandidate
} from "../lib/types";
import { contentTabs } from "../lib/types";
import { classNames, contentTabLabel, statusLabel } from "../lib/utils";
import {
  CatalogueGrid,
  CompactList,
  EmptyState
} from "./catalogue-card";

const gridModes: GridMode[] = [2, 3];
const tabOrder = ["pending", "rejected"] as const;
const pendingPageSize = 12;
const compactPageSize = 50;
const SUBCATEGORY_MAP: Partial<
  Record<ContentTab, Array<{ slug: string; label: string }>>
> = {
  going_out: [
    { slug: "restaurants_and_bars", label: "Restaurants & Bars" },
    { slug: "events_and_experiences", label: "Events & Experiences" },
    { slug: "culture", label: "Culture" },
    { slug: "local_walks_and_day_trips", label: "Local Walks & Day Trips" }
  ],
  staying_in: [
    { slug: "streaming_and_tv", label: "Streaming & TV" },
    { slug: "books_and_reading", label: "Books & Reading" },
    { slug: "podcasts_and_audio", label: "Podcasts & Audio" },
    { slug: "recipes_and_kitchen", label: "Recipes & Kitchen" },
    { slug: "fitness_and_wellness", label: "Fitness & Wellness" }
  ],
  shopping: [
    { slug: "fashion", label: "Fashion" },
    { slug: "beauty", label: "Beauty" },
    { slug: "tech_and_gadgets", label: "Tech & Gadgets" },
    { slug: "home", label: "Home" },
    { slug: "kids", label: "Kids" }
  ],
  travel: [
    { slug: "hotels_and_villas", label: "Hotels & Villas" },
    { slug: "travel_experiences", label: "Experiences" },
    { slug: "destinations", label: "Destinations" },
    { slug: "retreats_and_wellness", label: "Retreats & Wellness" }
  ]
};

function getTrendFilters(contentTab: ContentTab, stayingInFilter: StayingInFilter) {
  if (contentTab === "going_out") {
    return {
      category: "going_out" as const,
      exclude_content_type: "guide" as const
    };
  }
  if (contentTab === "travel") {
    return { category: "travel" as const };
  }
  return {
    category: "staying_in" as const,
    content_type: stayingInFilter === "all" ? undefined : stayingInFilter
  };
}

function isRequestsTab(contentTab: ContentTab) {
  return contentTab === "requests";
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      setValue(JSON.parse(raw) as T);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, ready, value]);

  return [value, setValue, ready] as const;
}

type ToastState = {
  tone: "success" | "error";
  message: string;
} | null;

type CatalogueQueryResult = {
  items: CatalogueItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

type ReviewFilter = "all_flagged" | "image" | "location" | "both" | null;

function candidateId(candidate: CatalogueItem) {
  return `${candidate.collection}:${candidate._key}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeCatalogueItemArrays(item: CatalogueItem): CatalogueItem {
  const base = {
    ...item,
    tags: item.tags ?? [],
    tags_pending_review: item.tags_pending_review ?? [],
    tags_suggested: item.tags_suggested ?? [],
    tags_new: item.tags_new ?? [],
    endorsements: item.endorsements ?? [],
    assigned_lists: item.assigned_lists ?? [],
    suggested_themes: item.suggested_themes ?? []
  } as CatalogueItem;

  if (item.collection === "product_candidates") {
    return base;
  }

  return {
    ...base,
    cover_images: item.cover_images ?? [],
    features_poi: item.features_poi ?? []
  } as CatalogueItem;
}

function replaceCatalogueItem(items: CatalogueItem[] | undefined, updated: CatalogueItem) {
  const safeItems = items ?? [];
  let changed = false;
  const normalizedUpdated = normalizeCatalogueItemArrays(updated);
  const nextItems = safeItems.map((item) => {
    const normalizedItem = normalizeCatalogueItemArrays(item);

    if (
      normalizedItem._key === normalizedUpdated._key &&
      normalizedItem.collection === normalizedUpdated.collection
    ) {
      changed = true;
      return normalizedUpdated;
    }

    return normalizedItem;
  });

  return changed ? nextItems : safeItems;
}

function patchCatalogueResult(
  current: CatalogueQueryResult | undefined,
  updated: CatalogueItem
) {
  if (!current) {
    return current;
  }

  const safeCurrentItems = current.items ?? [];
  const nextItems = replaceCatalogueItem(safeCurrentItems, updated);
  if (nextItems === safeCurrentItems) {
    return {
      ...current,
      items: safeCurrentItems.map((item) => normalizeCatalogueItemArrays(item))
    };
  }

  return {
    ...current,
    items: nextItems
  };
}

export function CatalogueApp() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CatalogueStatus>("pending");
  const [contentTab, setContentTab] = useState<ContentTab>("shopping");
  const [stayingInFilter, setStayingInFilter] = useState<StayingInFilter>("all");
  const [searchByTab, setSearchByTab] = useState<Record<ContentTab, string>>({
    requests: "",
    shopping: "",
    going_out: "",
    travel: "",
    staying_in: ""
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(null);
  const [reviewer, , reviewerReady] = usePersistentState<ReviewerName>(
    "catalogue-reviewer",
    "Kath"
  );
  const [gridMode, setGridMode, gridReady] = usePersistentState<GridMode>(
    "catalogue-grid-mode",
    2
  );
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyApproveId, setBusyApproveId] = useState<string | undefined>(undefined);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const search = searchByTab[contentTab];

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeTab, contentTab, stayingInFilter, selectedSubcategory, reviewFilter]);

  useEffect(() => {
    if (contentTab !== "staying_in") {
      setStayingInFilter("all");
    }
    setSelectedSubcategory(null);
  }, [contentTab]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const handle = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(handle);
  }, [toast]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, contentTab, page, stayingInFilter, selectedSubcategory, debouncedSearch, reviewFilter]);

  const statsQuery = useQuery({
    queryKey: ["catalogue-stats"],
    queryFn: fetchStats
  });

  const trendStatsQuery = useQuery({
    queryKey: ["trend-catalogue-stats"],
    queryFn: fetchTrendStats
  });

  const requestsCountQuery = useQuery({
    queryKey: ["catalogue", "requests-count"],
    queryFn: () =>
      fetchCandidates({
        status: "pending",
        priority: "fast_track",
        page: 1,
        limit: 1
      })
  });

  const shoppingCountQuery = useQuery({
    queryKey: ["catalogue", "shopping-count"],
    queryFn: () =>
      fetchCandidates({
        status: "pending",
        exclude_priority: "fast_track",
        page: 1,
        limit: 1
      })
  });

  const travelCountQuery = useQuery({
    queryKey: ["catalogue", "travel-guides-count"],
    queryFn: () =>
      fetchRecommendations({
        category: "travel",
        content_type: "guide",
        curation_status: "draft,pending",
        page: 1,
        limit: 1
      })
  });

  const pendingQuery = useQuery<CatalogueQueryResult>({
    queryKey: [
      "catalogue",
      contentTab,
      "pending",
      page,
      debouncedSearch,
      stayingInFilter,
      selectedSubcategory
    ],
    queryFn: () => {
      if (isRequestsTab(contentTab)) {
        return fetchCandidates({
          status: "pending",
          priority: "fast_track",
          page,
          limit: pendingPageSize,
          search: debouncedSearch
        }) as Promise<CatalogueQueryResult>;
      }

      if (isShoppingTab(contentTab)) {
        return fetchCandidates({
          status: "pending",
          exclude_priority: "fast_track",
          page,
          limit: pendingPageSize,
          search: debouncedSearch,
          subcategory: selectedSubcategory ?? undefined
        }) as Promise<CatalogueQueryResult>;
      }

      if (contentTab === "travel") {
        return fetchRecommendations({
          category: "travel",
          content_type: "guide",
          curation_status: "draft,pending",
          page,
          limit: pendingPageSize,
          search: debouncedSearch,
          subcategory: selectedSubcategory ?? undefined,
          sort: "updated_at",
          order: "desc"
        }).then((response) => ({
          items: response.data,
          total: response.pagination.total,
          page: response.pagination.page,
          pageSize: response.pagination.limit,
          pages: response.pagination.pages
        })) as Promise<CatalogueQueryResult>;
      }

      return fetchTrendCandidates({
        status: "pending",
        ...getTrendFilters(contentTab, stayingInFilter),
        page,
        limit: pendingPageSize,
        search: debouncedSearch,
        subcategory: selectedSubcategory ?? undefined
      }) as Promise<CatalogueQueryResult>;
    },
    placeholderData: keepPreviousData
  });

  const rejectedQuery = useQuery<CatalogueQueryResult>({
    queryKey: [
      "catalogue",
      contentTab,
      "rejected",
      debouncedSearch,
      stayingInFilter,
      selectedSubcategory
    ],
    queryFn: () => {
      if (isRequestsTab(contentTab)) {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          pageSize: compactPageSize,
          pages: 1
        });
      }

      if (isShoppingTab(contentTab)) {
        return fetchCandidates({
          status: "rejected",
          page: 1,
          limit: compactPageSize,
          search: debouncedSearch,
          subcategory: selectedSubcategory ?? undefined
        }) as Promise<CatalogueQueryResult>;
      }

      if (contentTab === "travel") {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          pageSize: compactPageSize,
          pages: 1
        });
      }

      return fetchTrendCandidates({
        status: "rejected",
        ...getTrendFilters(contentTab, stayingInFilter),
        page: 1,
        limit: compactPageSize,
        search: debouncedSearch,
        subcategory: selectedSubcategory ?? undefined
      }) as Promise<CatalogueQueryResult>;
    }
  });

  const listsQuery = useQuery({
    queryKey: ["lists"],
    queryFn: () => fetchLists()
  });

  const mutationOptions = {
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalogue"] }),
        queryClient.invalidateQueries({ queryKey: ["catalogue-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["trend-catalogue-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["lists"] })
      ]);
    },
    onError: (error: Error) => {
      setToast({ tone: "error", message: error.message });
    }
  };

  const rejectMutation = useMutation<
    unknown,
    Error,
    {
      key: string;
      collection: CatalogueItem["collection"];
      rejectionReason?: string;
      rejectionPreset?: string;
      decidedBy: string;
    }
  >({
    mutationFn: ({
      key,
      collection,
      rejectionReason,
      rejectionPreset,
      decidedBy
    }: {
      key: string;
      collection: CatalogueItem["collection"];
      rejectionReason?: string;
      rejectionPreset?: string;
      decidedBy: string;
    }) =>
      collection === "product_candidates"
        ? createCurationDecision({
            candidate_key: key,
            candidate_collection: "product_candidates",
            decision: "rejected",
            reason: rejectionReason,
            rejection_preset: rejectionPreset,
            decided_by: decidedBy
          })
        : collection === "recommendations"
          ? updateRecommendation(key, {
              curation_status: "rejected",
              status: "draft",
              curated_by: decidedBy,
              curation_reason: rejectionReason || rejectionPreset
            })
        : createCurationDecision({
            candidate_key: key,
            candidate_collection: "trend_candidates",
            decision: "rejected",
            reason: rejectionReason,
            rejection_preset: rejectionPreset,
            decided_by: decidedBy
          }),
    ...mutationOptions,
    onSuccess: async () => {
      setToast({ tone: "success", message: "Item rejected." });
      await mutationOptions.onSuccess();
    }
  });

  const restoreMutation = useMutation<
    CatalogueItem,
    Error,
    {
      key: string;
      collection: CatalogueItem["collection"];
    }
  >({
    mutationFn: ({
      key,
      collection
    }: {
      key: string;
      collection: CatalogueItem["collection"];
    }) =>
      collection === "product_candidates"
        ? updateCandidate(key, {
            status: "pending"
          })
        : collection === "recommendations"
          ? updateRecommendation(key, {
              curation_status: "draft",
              status: "draft"
            })
        : updateTrendCandidate(key, {
            status: "pending"
          }),
    ...mutationOptions,
    onSuccess: async () => {
      setToast({ tone: "success", message: "Item returned to pending." });
      await mutationOptions.onSuccess();
    }
  });

  const tagsMutation = useMutation({
    mutationFn: ({ key, tags }: { key: string; tags: string[] }) =>
      updateCandidate(key, { tags }),
    ...mutationOptions,
    onSuccess: async () => {
      setToast({ tone: "success", message: "Tags updated." });
      await mutationOptions.onSuccess();
    }
  });

  const listsMutation = useMutation({
    mutationFn: ({ key, assignedLists }: { key: string; assignedLists: string[] }) =>
      updateCandidate(key, { assigned_lists: assignedLists }),
    ...mutationOptions,
    onSuccess: async () => {
      setToast({ tone: "success", message: "Lists updated." });
      await mutationOptions.onSuccess();
    }
  });

  const editMutation = useMutation<
    CatalogueItem,
    Error,
    {
      candidate: CatalogueItem;
      changes: Record<string, unknown>;
    }
  >({
    mutationFn: ({ candidate, changes }) =>
      candidate.collection === "product_candidates"
        ? updateCandidate(candidate._key, changes)
        : candidate.collection === "recommendations"
          ? updateRecommendation(candidate._key, changes)
        : updateTrendCandidate(candidate._key, changes),
    onError: mutationOptions.onError,
    onSuccess: async (updated, variables) => {
      const normalizedUpdated = normalizeCatalogueItemArrays({
        ...updated,
        ...(variables.changes.image_needs_review === false ? { image_needs_review: false } : {}),
        ...(variables.candidate.collection !== "product_candidates" && variables.changes.geo_needs_review === false
          ? { geo_needs_review: false }
          : {})
      } as CatalogueItem);

      queryClient.setQueriesData<CatalogueQueryResult>(
        { queryKey: ["catalogue"] },
        (current) => patchCatalogueResult(current, normalizedUpdated)
      );
      queryClient.setQueriesData<CatalogueQueryResult>(
        { queryKey: ["travel-library"] },
        (current) => patchCatalogueResult(current, normalizedUpdated)
      );

      setToast({ tone: "success", message: "Candidate updated." });
    }
  });

  const stats = statsQuery.data ?? {
    pending: 0,
    approved: 0,
    rejected: 0,
    ready_to_promote: 0,
    total: 0
  };
  const trendStats = trendStatsQuery.data;

  const tabCounts = isShoppingTab(contentTab)
    ? {
        pending: pendingQuery.data?.total ?? 0,
        rejected: stats.rejected
      }
    : isRequestsTab(contentTab)
      ? {
          pending: pendingQuery.data?.total ?? 0,
          rejected: 0
        }
    : {
        pending: contentTab === "travel" ? pendingQuery.data?.total ?? 0 : pendingQuery.data?.total ?? 0,
        rejected: contentTab === "travel" ? 0 : rejectedQuery.data?.total ?? 0
      };

  const totalPages = Math.max(1, Math.ceil((pendingQuery.data?.total ?? 0) / pendingPageSize));
  const catalogueCategoryClass = `category-${contentTab.replace(/_/g, "-")}`;
  const isCurrentFetching = activeTab === "pending" ? pendingQuery.isFetching : rejectedQuery.isFetching;
  const isLoading = !(gridReady && reviewerReady);
  const lists = listsQuery.data?.items ?? [];
  const subcategoryOptions = isRequestsTab(contentTab) ? [] : SUBCATEGORY_MAP[contentTab] ?? [];
  const sidebarCounts = isShoppingTab(contentTab)
    ? {
        ...emptySidebarCounts(),
        shopping: pendingQuery.data?.total ?? 0
      }
    : {
        ...emptySidebarCounts(),
        shopping: shoppingCountQuery.data?.total ?? 0
      };

  sidebarCounts.requests =
    contentTab === "requests"
      ? pendingQuery.data?.total ?? 0
      : requestsCountQuery.data?.total ?? 0;
  sidebarCounts.going_out = trendStats?.by_category.going_out?.pending ?? 0;
  sidebarCounts.travel =
    contentTab === "travel"
      ? pendingQuery.data?.total ?? 0
      : travelCountQuery.data?.pagination.total ?? 0;
  sidebarCounts.staying_in = trendStats?.by_category.staying_in?.pending ?? 0;

  const currentPageItems = useMemo(() => {
    if (activeTab === "pending") {
      return pendingQuery.data?.items ?? [];
    }
    return rejectedQuery.data?.items ?? [];
  }, [
    activeTab,
    pendingQuery.data?.items,
    rejectedQuery.data?.items
  ]);

  const reviewCounts = useMemo(() => {
    const image = currentPageItems.filter((candidate) => candidate.image_needs_review === true).length;
    const location = currentPageItems.filter(
      (candidate) => "geo_needs_review" in candidate && candidate.geo_needs_review === true
    ).length;
    const both = currentPageItems.filter(
      (candidate) =>
        candidate.image_needs_review === true &&
        "geo_needs_review" in candidate &&
        candidate.geo_needs_review === true
    ).length;
    const allFlagged = currentPageItems.filter(
      (candidate) =>
        candidate.image_needs_review === true ||
        ("geo_needs_review" in candidate && candidate.geo_needs_review === true)
    ).length;

    return { allFlagged, image, location, both };
  }, [currentPageItems]);

  const activeView = useMemo(() => {
    if (!reviewFilter) {
      return currentPageItems;
    }

    return currentPageItems.filter((candidate) => {
      const imageNeedsReview = candidate.image_needs_review === true;
      const locationNeedsReview = "geo_needs_review" in candidate && candidate.geo_needs_review === true;

      switch (reviewFilter) {
        case "all_flagged":
          return imageNeedsReview || locationNeedsReview;
        case "image":
          return imageNeedsReview;
        case "location":
          return locationNeedsReview;
        case "both":
          return imageNeedsReview && locationNeedsReview;
        default:
          return true;
      }
    });
  }, [currentPageItems, reviewFilter]);

  useEffect(() => {
    if (reviewCounts.allFlagged === 0 && reviewFilter !== null) {
      setReviewFilter(null);
    }
  }, [reviewCounts.allFlagged, reviewFilter]);

  const visibleSelectedIds = selectedIds.filter((id) =>
    activeView.some((candidate) => candidateId(candidate) === id)
  );

  const busyKey =
    busyApproveId ??
    (rejectMutation.isPending ? rejectMutation.variables?.key : undefined) ??
    (restoreMutation.isPending ? restoreMutation.variables?.key : undefined) ??
    (editMutation.isPending ? editMutation.variables?.candidate._key : undefined) ??
    (tagsMutation.isPending ? tagsMutation.variables?.key : undefined) ??
    (listsMutation.isPending ? listsMutation.variables?.key : undefined);

  async function invalidateCatalogueData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalogue"] }),
      queryClient.invalidateQueries({ queryKey: ["catalogue-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["trend-catalogue-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["lists"] })
    ]);
  }

  async function approveCandidateNow(candidate: CatalogueItem, curationReason?: string) {
    const id = candidateId(candidate);
    setBusyApproveId(candidate._key);
    try {
      if (candidate.collection === "product_candidates") {
        await updateCandidate(candidate._key, {
          status: "approved",
          reviewed_by: reviewer,
          reviewed_at: new Date().toISOString(),
          curation_reason: curationReason || null
        });
        try {
          await promoteCandidates(reviewer, [candidate._key]);
        } catch (error) {
          await updateCandidate(candidate._key, {
            status: "pending",
            reviewed_by: null,
            reviewed_at: null,
            curation_reason: null
          });
          throw error;
        }
      } else if (candidate.collection === "trend_candidates") {
        await updateTrendCandidate(candidate._key, {
          status: "approved",
          reviewed_by: reviewer,
          reviewed_at: new Date().toISOString(),
          curation_reason: curationReason || null
        });
        try {
          await promoteTrendCandidates(reviewer, [candidate._key]);
        } catch (error) {
          await updateTrendCandidate(candidate._key, {
            status: "pending",
            reviewed_by: null,
            reviewed_at: null,
            curation_reason: null
          });
          throw error;
        }
      } else {
        await updateRecommendation(candidate._key, {
          curation_status: "approved",
          status: "active",
          curated_by: reviewer,
          curation_reason: curationReason || null
        });
      }

      setExitingIds((current) => [...current, id]);
      await sleep(180);
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      setToast({ tone: "success", message: `${candidate.name} approved.` });
      await invalidateCatalogueData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed.";
      setToast({ tone: "error", message });
      throw error;
    } finally {
      setExitingIds((current) => current.filter((candidateKey) => candidateKey !== id));
      setBusyApproveId(undefined);
    }
  }

  async function handleBulkApprove() {
    const candidates = activeView.filter((candidate) =>
      visibleSelectedIds.includes(candidateId(candidate))
    );
    if (!candidates.length) return;

    setBulkApproving(true);
    const failures: string[] = [];
    for (const candidate of candidates) {
      try {
        await approveCandidateNow(candidate);
      } catch {
        failures.push(candidate.name);
      }
    }
    setBulkApproving(false);
    setSelectedIds([]);
    if (failures.length) {
      setToast({
        tone: "error",
        message: `Failed to approve: ${failures.join(", ")}`
      });
    }
  }

  async function handleCreateList(
    candidate: CatalogueItem,
    payload: {
      name: string;
      list_type: string;
      occasion?: string;
      year?: string;
    }
  ): Promise<ListOption> {
    const created = await createList({
      name: payload.name,
      list_type: payload.list_type,
      occasion: payload.occasion || null,
      year: payload.year || null,
      category:
        contentTab === "requests" ? "shopping" : contentTab,
      status: "active",
      content_type: "list"
    });
    await queryClient.invalidateQueries({ queryKey: ["lists"] });
    setToast({ tone: "success", message: `Created list "${created.name}".` });
    return {
      _key: created._key,
      name: created.name,
      list_type: created.list_type,
      occasion: typeof created.occasion === "string" ? created.occasion : null,
      year: typeof created.year === "string" ? created.year : null
    };
  }

  return (
    <main className="approval-app-shell">
      <div className="approval-layout">
        <aside className="approval-sidebar hidden min-[900px]:flex">
          <div className="approval-sidebar__brand">
            <p className="approval-sidebar__brand-title">Blck Book</p>
            <p className="approval-sidebar__brand-subtitle">Approval catalogue</p>
          </div>

          <nav className="approval-sidebar__nav">
            {contentTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setContentTab(tab)}
                className={classNames(
                  "approval-sidebar__nav-item",
                  contentTab === tab && "is-active"
                )}
              >
                <span>{contentTabLabel(tab)}</span>
                <span className="approval-sidebar__count">{sidebarCounts[tab] ?? 0}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="approval-main">
          <div className="approval-mobile-header min-[900px]:hidden">
            <p className="approval-sidebar__brand-title">Blck Book</p>
            <p className="approval-sidebar__brand-subtitle">Approval catalogue</p>
            <div className="approval-mobile-nav">
              {contentTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setContentTab(tab)}
                  className={classNames(
                    "approval-mobile-nav__item",
                    contentTab === tab && "is-active"
                  )}
                >
                  <span>{contentTabLabel(tab)}</span>
                  <span className="approval-mobile-nav__count">{sidebarCounts[tab] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="approval-main__header">
            <div className="approval-status-tabs">
              {tabOrder.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={classNames(
                    "approval-status-tab",
                    activeTab === tab && "is-active"
                  )}
                >
                  <span>{statusLabel(tab)}</span>
                  <span className="approval-status-tab__count">{tabCounts[tab]}</span>
                </button>
              ))}
            </div>

            {subcategoryOptions.length ? (
              <div className="approval-category-pills">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className={classNames(
                    "approval-filter-pill",
                    selectedSubcategory === null && "is-active"
                  )}
                >
                  All
                </button>
                {subcategoryOptions.map((option) => (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => setSelectedSubcategory(option.slug)}
                    className={classNames(
                      "approval-filter-pill",
                      selectedSubcategory === option.slug && "is-active"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            {reviewCounts.allFlagged > 0 ? (
              <div className="approval-review-bar">
                <span className="approval-review-bar__label">Needs review</span>
                {[
                  { key: "all_flagged" as const, label: "All flagged", count: reviewCounts.allFlagged },
                  { key: "image" as const, label: "Image", count: reviewCounts.image },
                  { key: "location" as const, label: "Location", count: reviewCounts.location },
                  { key: "both" as const, label: "Both", count: reviewCounts.both }
                ]
                  .filter((option) => option.count > 0)
                  .map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() =>
                        setReviewFilter((current) => (current === option.key ? null : option.key))
                      }
                      className={classNames(
                        "approval-review-pill",
                        reviewFilter === option.key && "is-active"
                      )}
                    >
                      {option.label} {option.count}
                    </button>
                  ))}
              </div>
            ) : null}

            <div className="approval-toolbar">
              <label className="approval-search">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearchByTab((current) => ({
                      ...current,
                      [contentTab]: event.target.value
                    }))
                  }
                  placeholder={
                    isShoppingTab(contentTab) || isRequestsTab(contentTab)
                      ? "Name, brand, tags"
                      : "Name, description, location"
                  }
                  className="approval-search__input"
                />
              </label>
              <div className="approval-grid-toggle" role="group" aria-label="Grid columns">
                {gridModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGridMode(mode)}
                    className={classNames(
                      "approval-grid-toggle__button",
                      gridMode === mode && "is-active"
                    )}
                  >
                    {mode} col
                  </button>
                ))}
              </div>
            </div>

            {contentTab === "staying_in" ? (
              <div className="approval-subcategory-tabs">
                {(["all", "recipe", "entertainment"] as StayingInFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStayingInFilter(filter)}
                    className={classNames(
                      "approval-subcategory-tab",
                      stayingInFilter === filter && "is-active"
                    )}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "recipe"
                        ? "Recipes"
                        : "Entertainment"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="approval-main__content">
            {isLoading ||
            statsQuery.isLoading ||
            trendStatsQuery.isLoading ||
            requestsCountQuery.isLoading ||
            shoppingCountQuery.isLoading ||
            travelCountQuery.isLoading ||
            pendingQuery.isLoading ||
            rejectedQuery.isLoading ? (
              <LoadingState />
            ) : pendingQuery.isError ||
              rejectedQuery.isError ||
              statsQuery.isError ||
              trendStatsQuery.isError ||
              requestsCountQuery.isError ||
              shoppingCountQuery.isError ||
              travelCountQuery.isError ||
              listsQuery.isError ? (
              <ErrorState />
            ) : !currentPageItems.length ? (
              <EmptyState contentTab={contentTab} status={activeTab} />
            ) : (
              <>
                <div className="approval-item-count-row">
                  <span className="approval-item-count">
                    {activeView.length} item{activeView.length === 1 ? "" : "s"} on this page
                  </span>
                  {isCurrentFetching ? <span>Refreshing…</span> : null}
                </div>

                {!activeView.length ? (
                  <div className="approval-empty-filter-state">
                    No items match the selected review filter.
                  </div>
                ) : activeTab === "pending" ? (
                  <>
                    <CatalogueGrid
                      candidates={activeView}
                      gridMode={gridMode}
                      categoryClass={catalogueCategoryClass}
                      lists={lists}
                      currentUser={reviewer}
                      busyKey={busyKey}
                      exitingIds={exitingIds}
                      selectionEnabled
                      selectedIds={selectedIds}
                      onToggleSelect={(candidate) => {
                        const id = candidateId(candidate);
                        setSelectedIds((current) =>
                          current.includes(id)
                            ? current.filter((selectedId) => selectedId !== id)
                            : [...current, id]
                        );
                      }}
                      onApprove={(candidate, reason) => {
                        void approveCandidateNow(candidate, reason);
                      }}
                      onReject={(candidate, payload) =>
                        rejectMutation.mutate({
                          key: candidate._key,
                          collection: candidate.collection,
                          rejectionReason: payload.reason,
                          rejectionPreset: payload.rejectionPreset,
                          decidedBy: reviewer
                        })
                      }
                      onEdit={(candidate, changes) =>
                        editMutation.mutateAsync({
                          candidate,
                          changes
                        })
                      }
                      onTagsChange={(candidate, tags) =>
                        tagsMutation.mutate({
                          key: candidate._key,
                          tags
                        })
                      }
                      onListsChange={(candidate, assignedLists) =>
                        listsMutation.mutate({
                          key: candidate._key,
                          assignedLists
                        })
                      }
                      onCreateList={handleCreateList}
                    />
                    {visibleSelectedIds.length ? (
                      <div className="approval-bulk-bar">
                        <div className="approval-bulk-bar__summary">
                          <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="approval-bulk-bar__clear"
                            aria-label="Clear selection"
                          >
                            ×
                          </button>
                          <span>{visibleSelectedIds.length} selected</span>
                        </div>
                        <div className="approval-bulk-bar__actions">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedIds(activeView.map((candidate) => candidateId(candidate)))
                            }
                            className="approval-bulk-bar__link"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            disabled={bulkApproving}
                            onClick={() => void handleBulkApprove()}
                            className="approval-bulk-bar__button"
                          >
                            {bulkApproving ? "Approving..." : "Approve Selected"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
                  </>
                ) : (
                  <CompactList
                    candidates={activeView}
                    lists={lists}
                    type={activeTab}
                    busyKey={busyKey}
                    onRestore={(candidate: CatalogueItem) =>
                      restoreMutation.mutate({
                        key: candidate._key,
                        collection: candidate.collection
                      })
                    }
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {toast ? (
        <div
          className={classNames(
            "approval-toast",
            toast.tone === "success" ? "is-success" : "is-error"
          )}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

function ErrorState() {
  return (
    <div className="approval-state-card approval-state-card--error">
      <p className="font-display text-2xl text-[var(--cat-text-primary)]">Could not load catalogue data</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--cat-text-secondary)]">
        Could not connect to the API. Make sure inspiration-gateway is running on port 3002.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[420px] animate-pulse border border-[var(--cat-border)] bg-[var(--cat-bg-card)]"
        />
      ))}
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="approval-pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="approval-pagination__button"
      >
        Previous
      </button>
      <p className="approval-pagination__summary">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="approval-pagination__button"
      >
        Next
      </button>
    </div>
  );
}
