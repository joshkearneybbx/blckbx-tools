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
import { contentTabs, reviewerOptions } from "../lib/types";
import { classNames, contentTabLabel, statusLabel } from "../lib/utils";
import {
  CatalogueGrid,
  CompactList,
  EmptyState
} from "./catalogue-card";

const gridModes: GridMode[] = [2, 3];
const tabOrder: CatalogueStatus[] = ["pending", "rejected"];
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

function candidateId(candidate: CatalogueItem) {
  return `${candidate.collection}:${candidate._key}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function replaceCatalogueItem(items: CatalogueItem[], updated: CatalogueItem) {
  let changed = false;
  const nextItems = items.map((item) => {
    if (item._key === updated._key && item.collection === updated.collection) {
      changed = true;
      return updated;
    }
    return item;
  });

  return changed ? nextItems : items;
}

function patchCatalogueResult(
  current: CatalogueQueryResult | undefined,
  updated: CatalogueItem
) {
  if (!current) {
    return current;
  }

  const nextItems = replaceCatalogueItem(current.items, updated);
  if (nextItems === current.items) {
    return current;
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
  const [reviewer, setReviewer, reviewerReady] = usePersistentState<ReviewerName>(
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
  }, [debouncedSearch, activeTab, contentTab, stayingInFilter, selectedSubcategory]);

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
  }, [activeTab, contentTab, page, stayingInFilter, selectedSubcategory, debouncedSearch]);

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
    onSuccess: async (updated) => {
      queryClient.setQueriesData<CatalogueQueryResult>(
        { queryKey: ["catalogue"] },
        (current) => patchCatalogueResult(current, updated)
      );
      queryClient.setQueriesData<CatalogueQueryResult>(
        { queryKey: ["travel-library"] },
        (current) => patchCatalogueResult(current, updated)
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

  const activeView = useMemo(() => {
    if (activeTab === "pending") {
      return pendingQuery.data?.items ?? [];
    }
    return rejectedQuery.data?.items ?? [];
  }, [
    activeTab,
    pendingQuery.data?.items,
    rejectedQuery.data?.items
  ]);

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
    <main className="min-h-screen bg-transparent p-3 md:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1520px] overflow-hidden border border-[var(--sand-300)] bg-[var(--white)] min-[900px]:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-[900px]:flex min-[900px]:h-full min-[900px]:flex-col min-[900px]:border-r min-[900px]:border-[var(--sand-300)] min-[900px]:bg-white">
          <div className="px-6 py-7">
            <p className="font-display text-[2rem] italic leading-none text-[var(--text)]">
              Blck Book
            </p>
            <p className="mt-2 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--sand-900)]">
              Approval Catalogue
            </p>
          </div>

          <nav className="flex-1 px-3">
            <div className="space-y-1.5">
              {contentTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setContentTab(tab)}
                  className={classNames(
                    "flex w-full items-center justify-between border-l-[3px] px-4 py-3 text-left text-[13px] transition",
                    contentTab === tab
                      ? "border-l-[var(--black)] bg-[var(--sand-100)] text-[var(--text)] font-medium"
                      : "border-l-transparent text-[var(--sand-900)] hover:bg-[var(--sand-100)] hover:text-[var(--text)]"
                  )}
                >
                  <span>{contentTabLabel(tab)}</span>
                  <span
                    className={classNames(
                      "border px-2 py-0.5 text-xs",
                      contentTab === tab
                        ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)] font-medium"
                        : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
                    )}
                  >
                    {sidebarCounts[tab] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-[var(--sand-300)] px-6 py-5">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--sand-700)]">
              Reviewer
            </label>
            <select
              value={reviewer}
              onChange={(event) => setReviewer(event.target.value as ReviewerName)}
              className="mt-2 w-full border border-[var(--sand-300)] bg-[var(--white)] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--black)]"
            >
              {reviewerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-[var(--sand-300)] bg-[var(--white)] px-4 py-5 md:px-8 min-[900px]:hidden">
            <p className="font-display text-[1.8rem] italic leading-none text-[var(--text)]">
              Blck Book
            </p>
            <p className="mt-2 text-[0.78rem] uppercase tracking-[0.22em] text-[var(--sand-900)]">
              Approval Catalogue
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {contentTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setContentTab(tab)}
                  className={classNames(
                    "border px-3 py-2 text-sm whitespace-nowrap",
                    contentTab === tab
                      ? "border-[var(--black)] bg-[var(--sand-100)] text-[var(--text)] font-medium"
                      : "border-[var(--sand-300)] bg-[var(--white)] text-[var(--sand-900)]"
                  )}
                >
                  {contentTabLabel(tab)} ({sidebarCounts[tab] ?? 0})
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--sand-700)]">
                Reviewer
              </label>
              <select
                value={reviewer}
                onChange={(event) => setReviewer(event.target.value as ReviewerName)}
                className="mt-2 w-full border border-[var(--sand-300)] bg-[var(--white)] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--black)]"
              >
                {reviewerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-[var(--sand-300)] px-4 pt-4 md:px-8 min-[900px]:pt-6">
              <div className="flex flex-wrap gap-3">
                {tabOrder.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={classNames(
                      "group relative flex items-center gap-2 px-4 pb-4 pt-2 text-sm transition",
                      activeTab === tab ? "text-[var(--text)] font-medium" : "text-[var(--sand-900)]"
                    )}
                  >
                    <span>{statusLabel(tab)}</span>
                    <span
                      className={classNames(
                        "border px-2 py-0.5 text-xs",
                        activeTab === tab
                          ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)] font-medium"
                          : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
                      )}
                    >
                      {tabCounts[tab]}
                    </span>
                    <span
                      className={classNames(
                        "absolute inset-x-0 bottom-0 h-[2px] transition",
                        activeTab === tab ? "bg-[var(--black)]" : "bg-transparent"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

          <div className="border-b border-[var(--sand-300)] px-4 py-4 md:px-8">
            {subcategoryOptions.length ? (
              <div className="mb-3 mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className={classNames(
                    "border px-3.5 py-1.5 text-[13px] transition",
                    selectedSubcategory === null
                      ? "border-[var(--black)] bg-[var(--black)] font-medium text-[var(--white)]"
                      : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
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
                      "border px-3.5 py-1.5 text-[13px] transition",
                      selectedSubcategory === option.slug
                        ? "border-[var(--black)] bg-[var(--black)] font-medium text-[var(--white)]"
                        : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <label className="flex flex-1 items-center gap-3 border border-[var(--sand-300)] bg-white px-4 py-3">
                <span className="text-sm text-[var(--sand-700)]">Search</span>
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
                  className="w-full border-none bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--sand-500)]"
                />
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--sand-900)]">Columns</span>
                <div className="flex border border-[var(--sand-300)] bg-[var(--sand-100)] p-1">
                  {gridModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGridMode(mode)}
                      className={classNames(
                        "px-4 py-2 text-sm transition",
                        gridMode === mode
                          ? "bg-[var(--black)] text-[var(--white)]"
                          : "text-[var(--sand-900)]"
                      )}
                    >
                      {mode} col
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {contentTab === "staying_in" ? (
              <div className="mt-4 flex gap-2">
                {(["all", "recipe", "entertainment"] as StayingInFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStayingInFilter(filter)}
                    className={classNames(
                      "border px-4 py-2 text-sm transition",
                      stayingInFilter === filter
                        ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)]"
                        : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
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

          <div className="flex-1 px-4 py-5 md:px-8">
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
            ) : !activeView.length ? (
              <EmptyState contentTab={contentTab} status={activeTab} />
            ) : activeTab === "pending" ? (
              <>
                <div className="mb-4 flex items-center justify-between text-sm text-[var(--sand-900)]">
                  <span>{activeView.length} items on this page</span>
                  {pendingQuery.isFetching ? <span>Refreshing…</span> : null}
                </div>
                <CatalogueGrid
                  candidates={activeView}
                  gridMode={gridMode}
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
                  <div className="sticky bottom-4 mt-5 flex flex-col gap-3 border border-[var(--black)] bg-[var(--black)] px-4 py-4 text-sm text-[var(--white)] md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="inline-flex h-6 w-6 items-center justify-center border border-[var(--white)] text-[var(--white)]"
                        aria-label="Clear selection"
                      >
                        ×
                      </button>
                      <span>{visibleSelectedIds.length} selected</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds(activeView.map((candidate) => candidateId(candidate)))
                        }
                        className="text-[var(--white)] underline underline-offset-4"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        disabled={bulkApproving}
                        onClick={() => void handleBulkApprove()}
                        className="border border-[var(--white)] bg-[var(--white)] px-4 py-2 font-medium text-[var(--black)] disabled:opacity-50"
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
          </div>
        </section>
      </div>

      {toast ? (
        <div
          className={classNames(
            "fixed bottom-5 right-5 border border-[var(--black)] px-4 py-3 text-sm",
            toast.tone === "success"
              ? "bg-[var(--black)] text-[var(--white)]"
              : "bg-[var(--error)] text-white"
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
    <div className="border border-[var(--error)] bg-[var(--error-light)] px-6 py-10 text-center">
      <p className="font-display text-2xl text-[var(--text)]">Could not load catalogue data</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--sand-900)]">
        Could not connect to the API. Make sure inspiration-gateway is running on port 3002.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[420px] animate-pulse border border-[var(--sand-300)] bg-[var(--sand-100)]"
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
    <div className="mt-6 flex items-center justify-between border border-[var(--sand-300)] bg-[var(--sand-100)] px-4 py-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="border border-transparent px-3 py-2 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:bg-white hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <p className="text-sm text-[var(--sand-900)]">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="border border-transparent px-3 py-2 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:bg-white hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
