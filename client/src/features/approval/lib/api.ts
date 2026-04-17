import type {
  CandidatePriority,
  CatalogueItem,
  CatalogueStatus,
  ContentScope,
  ContentTab,
  Endorsement,
  GeoMatchType,
  GeoSource,
  ListOption,
  ProductCandidate,
  RecommendationCandidate,
  SidebarCounts,
  StayingInFilter,
  TrendCandidate,
  TrendCategory,
  TrendContentType
} from "./types";

const API_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";

type ProductApiCandidate = {
  _key: string;
  _id?: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  product_url?: string | null;
  resolved_url?: string | null;
  candidate_url?: string | null;
  image_url?: string | null;
  primary_image?: string | null;
  hero_image_url?: string | null;
  image_source?: string | null;
  signal_phrase?: string | null;
  content_focus?: string | null;
  position?: number | null;
  subcategory?: string | null;
  gender_focus?: string | null;
  source_name: string;
  source_url?: string | null;
  source_type?: string | null;
  scrape_source?: string | null;
  confidence?: string | null;
  status: CatalogueStatus;
  curation_reason?: string | null;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  assigned_lists?: string[] | null;
  tags?: string[] | null;
  tags_pending_review?: string[] | null;
  tags_suggested?: string[] | null;
  tags_new?:
    | Array<{ slug?: string | null; category?: string | null; confidence?: string | null }>
    | null;
  endorsements?: Array<{ source?: string | null; award?: string | null; year?: number | null }> | null;
  is_blckbx_approved?: boolean | null;
  requested_by_client?: string | null;
  requested_by_client_name?: string | null;
  content_scope?: ContentScope | null;
  priority?: CandidatePriority | null;
  themes?: string[] | null;
  audit_log?:
    | Array<{
        action?: string | null;
        timestamp?: string | null;
        note?: string | null;
        user_name?: string | null;
      }>
    | null;
  promoted_to_key?: string | null;
  scraped_at?: string | null;
  created_at?: string | null;
  availability?: string | null;
};

type CandidatesApiResponse = {
  data: ProductApiCandidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type TrendApiCandidate = {
  _key: string;
  _id?: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  content_type?: TrendContentType | null;
  category?: TrendCategory | null;
  subcategory?: string | null;
  hero_image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: GeoSource | null;
  geo_place_name?: string | null;
  geo_match_type?: GeoMatchType | null;
  geo_needs_review?: boolean | null;
  destination?: string | null;
  travel_assistant_note?: string | null;
  cover_images?: string[] | null;
  body?: string | null;
  features_poi?:
    | Array<{
        _key?: string | null;
        name?: string | null;
        poi_type?: string | null;
        section_label?: string | null;
        note?: string | null;
      }>
    | null;
  poi_count?: number | null;
  location?: string | null;
  signal_phrase?: string | null;
  confidence?: TrendCandidate["confidence"];
  source_name: string;
  source_url: string;
  source_excerpt?: string | null;
  tags?: string[] | null;
  tags_pending_review?: string[] | null;
  tags_suggested?: string[] | null;
  tags_new?:
    | Array<{ slug?: string | null; category?: string | null; confidence?: string | null }>
    | null;
  endorsements?: Array<{ source?: string | null; award?: string | null; year?: number | null }> | null;
  is_blckbx_approved?: boolean | null;
  requested_by_client?: string | null;
  requested_by_client_name?: string | null;
  content_scope?: ContentScope | null;
  priority?: CandidatePriority | null;
  status: CatalogueStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  promoted_to_key?: string | null;
  is_read?: boolean | null;
  is_saved?: boolean | null;
  scraped_at?: string | null;
  created_at?: string | null;
  audit_log?:
    | Array<{
        action?: string | null;
        timestamp?: string | null;
        note?: string | null;
        user_name?: string | null;
      }>
    | null;
};

type TrendCandidatesApiResponse = {
  data: TrendApiCandidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type RecommendationApiItem = {
  _key: string;
  _id?: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  image_url?: string | null;
  hero_image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: GeoSource | null;
  geo_place_name?: string | null;
  geo_match_type?: GeoMatchType | null;
  geo_needs_review?: boolean | null;
  content_type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  location?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  tags?: string[] | null;
  resolved_tags?: string[] | null;
  endorsements?: Array<{ source?: string | null; award?: string | null; year?: number | null }> | null;
  is_blckbx_approved?: boolean | null;
  requested_by_client?: string | null;
  requested_by_client_name?: string | null;
  content_scope?: ContentScope | null;
  destination?: string | null;
  travel_assistant_note?: string | null;
  cover_images?: string[] | null;
  body?: string | null;
  features_poi?: TrendApiCandidate["features_poi"];
  poi_count?: number | null;
  curation_status?: "draft" | "pending" | "approved" | "rejected" | null;
  curation_reason?: string | null;
  curated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RecommendationsApiResponse = {
  data: RecommendationApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type StatsApiResponse = {
  pending: number;
  approved: number;
  rejected: number;
  ready_to_promote: number;
  total: number;
};

type TrendStatsApiResponse = {
  by_status: StatsApiResponse;
  by_category: Partial<Record<TrendCategory, Omit<StatsApiResponse, "total">>>;
  by_content_type: Partial<Record<TrendContentType, Omit<StatsApiResponse, "total">>>;
  travel_inbox: {
    new: number;
    saved: number;
    total: number;
  };
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "API error: 401") {
      return "Gateway authentication failed - check GATEWAY_API_KEY.";
    }
    return error.message;
  }
  return "Could not connect to the API. Make sure inspiration-gateway is running on port 3002.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(import.meta.env.VITE_GATEWAY_API_KEY
          ? { "x-api-key": import.meta.env.VITE_GATEWAY_API_KEY }
          : {}),
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("API error: 401");
      }
      throw new Error(
        typeof payload?.message === "string"
          ? payload.message
          : `API error: ${response.status}`
      );
    }

    return payload as T;
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

function mapAvailability(value?: string | null): ProductCandidate["availability"] {
  if (!value) {
    return "in_stock";
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("out")) {
    return "out_of_stock";
  }
  return "in_stock";
}

function mapEndorsements(
  endorsements?: Array<{ source?: string | null; award?: string | null; year?: number | null }> | null
): Endorsement[] {
  return (endorsements ?? [])
    .filter((entry) => entry.source && entry.award && typeof entry.year === "number")
    .map((entry) => ({
      source: entry.source ?? "",
      award: entry.award ?? "",
      year: entry.year ?? new Date().getFullYear()
    }));
}

function mapCandidate(candidate: ProductApiCandidate): ProductCandidate {
  return {
    _key: candidate._key,
    collection: "product_candidates",
    content_tab: "shopping",
    content_type: "product",
    name: candidate.name,
    brand: candidate.brand ?? null,
    description: candidate.description ?? null,
    price_text: candidate.price_text ?? null,
    price_pence: candidate.price_pence ?? null,
    image_url: candidate.image_url ?? null,
    primary_image: candidate.primary_image ?? null,
    hero_image_url: candidate.hero_image_url ?? null,
    product_url:
      candidate.product_url ?? candidate.resolved_url ?? candidate.candidate_url ?? null,
    resolved_url: candidate.resolved_url ?? null,
    candidate_url: candidate.candidate_url ?? null,
    image_source: candidate.image_source ?? null,
    signal_phrase: candidate.signal_phrase ?? null,
    content_focus: candidate.content_focus ?? null,
    position: candidate.position ?? null,
    subcategory: candidate.subcategory ?? null,
    availability: mapAvailability(candidate.availability),
    source_name: candidate.source_name,
    source_url: candidate.source_url ?? null,
    scrape_source: candidate.scrape_source ?? candidate.source_type ?? "api",
    currency:
      candidate.price_text?.includes("€") ? "EUR" : candidate.price_text?.includes("$") ? "USD" : "GBP",
    tags: candidate.tags ?? [],
    suggested_themes: candidate.themes ?? [],
    category: "shopping",
    gender_focus: candidate.gender_focus ?? null,
    age_suitability: null,
    status: candidate.status,
    curation_reason: candidate.curation_reason ?? candidate.rejection_reason ?? null,
    reviewed_by: candidate.reviewed_by ?? null,
    reviewed_at: candidate.reviewed_at ?? null,
    assigned_lists: candidate.assigned_lists ?? [],
    tags_pending_review: candidate.tags_pending_review ?? [],
    tags_suggested: candidate.tags_suggested ?? [],
    tags_new: (candidate.tags_new ?? []).map((tag) => ({
      slug: tag.slug ?? "",
      category: tag.category ?? "",
      confidence: tag.confidence ?? ""
    })),
    endorsements: mapEndorsements(candidate.endorsements),
    is_blckbx_approved: candidate.is_blckbx_approved ?? false,
    requested_by_client: candidate.requested_by_client ?? null,
    requested_by_client_name: candidate.requested_by_client_name ?? null,
    content_scope: candidate.content_scope ?? "general",
    priority: candidate.priority ?? "normal",
    audit_log: (candidate.audit_log ?? []).map((entry) => ({
      action: entry.action ?? "",
      timestamp: entry.timestamp ?? "",
      note: entry.note ?? "",
      user_name: entry.user_name ?? undefined
    })),
    promoted_to_key: candidate.promoted_to_key ?? null,
    created_at: candidate.created_at ?? candidate.scraped_at ?? new Date().toISOString(),
    url_status: "unknown"
  };
}

function mapTrendTab(
  category: TrendApiCandidate["category"],
  contentType: TrendApiCandidate["content_type"]
): TrendCandidate["content_tab"] {
  if (category === "travel" || contentType === "travel" || contentType === "guide") {
    return "travel";
  }
  if (category === "going_out") {
    return "going_out";
  }
  return "staying_in";
}

function mapTrendCandidate(candidate: TrendApiCandidate): TrendCandidate {
  const contentType = candidate.content_type ?? "experience";
  return {
    _key: candidate._key,
    collection: "trend_candidates",
    content_tab: mapTrendTab(candidate.category ?? null, contentType),
    content_type: contentType,
    subcategory: candidate.subcategory ?? null,
    name: candidate.name,
    brand: candidate.brand ?? null,
    description: candidate.description ?? null,
    image_url: null,
    hero_image_url: candidate.hero_image_url ?? null,
    lat: "lat" in candidate ? candidate.lat ?? null : undefined,
    lng: "lng" in candidate ? candidate.lng ?? null : undefined,
    geo_source: "geo_source" in candidate ? candidate.geo_source ?? null : undefined,
    geo_place_name:
      "geo_place_name" in candidate ? candidate.geo_place_name ?? null : undefined,
    geo_match_type:
      "geo_match_type" in candidate ? candidate.geo_match_type ?? null : undefined,
    geo_needs_review:
      "geo_needs_review" in candidate ? candidate.geo_needs_review ?? null : undefined,
    destination: candidate.destination ?? null,
    travel_assistant_note: candidate.travel_assistant_note ?? null,
    cover_images: candidate.cover_images ?? [],
    body: candidate.body ?? null,
    features_poi: (candidate.features_poi ?? [])
      .filter((poi) => poi.name)
      .map((poi) => ({
        _key: poi._key ?? undefined,
        name: poi.name ?? "",
        poi_type: poi.poi_type ?? null,
        section_label: poi.section_label ?? null,
        note: poi.note ?? null
      })),
    poi_count: candidate.poi_count ?? (candidate.features_poi ?? []).length,
    price_pence: candidate.price_pence ?? null,
    price_text: candidate.price_text ?? null,
    is_read: candidate.is_read === true,
    is_saved: candidate.is_saved === true,
    source_name: candidate.source_name,
    source_url: candidate.source_url,
    scrape_source: "trend_radar",
    tags: candidate.tags ?? [],
    tags_pending_review: candidate.tags_pending_review ?? [],
    tags_suggested: candidate.tags_suggested ?? [],
    tags_new: (candidate.tags_new ?? []).map((tag) => ({
      slug: tag.slug ?? "",
      category: tag.category ?? "",
      confidence: tag.confidence ?? ""
    })),
    endorsements: mapEndorsements(candidate.endorsements),
    is_blckbx_approved: candidate.is_blckbx_approved ?? false,
    requested_by_client: candidate.requested_by_client ?? null,
    requested_by_client_name: candidate.requested_by_client_name ?? null,
    content_scope: candidate.content_scope ?? "general",
    priority: candidate.priority ?? "normal",
    suggested_themes: [],
    status: candidate.status,
    curation_reason: candidate.rejection_reason ?? null,
    reviewed_by: candidate.reviewed_by ?? null,
    reviewed_at: candidate.reviewed_at ?? null,
    assigned_lists: [],
    created_at: candidate.created_at ?? candidate.scraped_at ?? new Date().toISOString(),
    category: candidate.category ?? null,
    location: candidate.location ?? null,
    confidence: candidate.confidence ?? null,
    signal_phrase: candidate.signal_phrase ?? null,
    source_excerpt: candidate.source_excerpt ?? null,
    promoted_to_key: candidate.promoted_to_key ?? null,
    scraped_at: candidate.scraped_at ?? null,
    audit_log: (candidate.audit_log ?? []).map((entry) => ({
      action: entry.action ?? "",
      timestamp: entry.timestamp ?? "",
      note: entry.note ?? "",
      user_name: entry.user_name ?? undefined
    }))
  };
}

function mapRecommendationStatus(
  curationStatus: RecommendationApiItem["curation_status"]
): CatalogueStatus {
  if (curationStatus === "approved") {
    return "approved";
  }
  if (curationStatus === "rejected") {
    return "rejected";
  }
  return "pending";
}

function mapRecommendationCandidate(candidate: RecommendationApiItem): RecommendationCandidate {
  return {
    _key: candidate._key,
    collection: "recommendations",
    content_tab: "travel",
    content_type: "guide",
    name: candidate.name,
    brand: candidate.brand ?? null,
    description: candidate.description ?? null,
    image_url: candidate.image_url ?? candidate.hero_image_url ?? null,
    hero_image_url: candidate.hero_image_url ?? candidate.image_url ?? null,
    lat: "lat" in candidate ? candidate.lat ?? null : undefined,
    lng: "lng" in candidate ? candidate.lng ?? null : undefined,
    geo_source: "geo_source" in candidate ? candidate.geo_source ?? null : undefined,
    geo_place_name:
      "geo_place_name" in candidate ? candidate.geo_place_name ?? null : undefined,
    geo_match_type:
      "geo_match_type" in candidate ? candidate.geo_match_type ?? null : undefined,
    geo_needs_review:
      "geo_needs_review" in candidate ? candidate.geo_needs_review ?? null : undefined,
    source_name: candidate.source_name ?? "Travel Hub",
    source_url: candidate.source_url ?? null,
    scrape_source: "travel_hub",
    tags: candidate.resolved_tags ?? candidate.tags ?? [],
    tags_pending_review: [],
    tags_suggested: [],
    tags_new: [],
    endorsements: mapEndorsements(candidate.endorsements),
    is_blckbx_approved: candidate.is_blckbx_approved ?? false,
    requested_by_client: candidate.requested_by_client ?? null,
    requested_by_client_name: candidate.requested_by_client_name ?? null,
    content_scope: candidate.content_scope ?? "general",
    priority: "normal",
    subcategory: candidate.subcategory ?? null,
    suggested_themes: [],
    status: mapRecommendationStatus(candidate.curation_status),
    curation_reason: candidate.curation_reason ?? null,
    reviewed_by: candidate.curated_by ?? null,
    reviewed_at: candidate.updated_at ?? null,
    assigned_lists: [],
    created_at: candidate.created_at ?? new Date().toISOString(),
    audit_log: [],
    category: "travel",
    location: candidate.location ?? null,
    confidence: null,
    signal_phrase: null,
    source_excerpt: null,
    promoted_to_key: null,
    scraped_at: null,
    destination: candidate.destination ?? null,
    travel_assistant_note: candidate.travel_assistant_note ?? null,
    cover_images: candidate.cover_images ?? [],
    body: candidate.body ?? null,
    features_poi: (candidate.features_poi ?? [])
      .filter((poi) => poi.name)
      .map((poi) => ({
        _key: poi._key ?? undefined,
        name: poi.name ?? "",
        poi_type: poi.poi_type ?? null,
        section_label: poi.section_label ?? null,
        note: poi.note ?? null
      })),
    poi_count: candidate.poi_count ?? (candidate.features_poi ?? []).length,
    curation_status: candidate.curation_status ?? "draft"
  };
}

export async function fetchCandidates(params: {
  status?: CatalogueStatus;
  search?: string;
  subcategory?: string;
  priority?: CandidatePriority;
  exclude_priority?: CandidatePriority;
  source_name?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}): Promise<{
  items: ProductCandidate[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      const apiKey = key === "search" ? "search" : key;
      searchParams.set(apiKey, String(value));
    }
  });

  const payload = await request<CandidatesApiResponse>(`/candidates?${searchParams.toString()}`);
  return {
    items: payload.data.map(mapCandidate),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
    pages: payload.pagination.pages
  };
}

export async function fetchCandidate(key: string): Promise<ProductCandidate> {
  const payload = await request<ProductApiCandidate>(`/candidates/${key}`);
  return mapCandidate(payload);
}

export async function updateCandidate(
  key: string,
  body: Record<string, unknown>
): Promise<ProductCandidate> {
  const payload = await request<ProductApiCandidate>(`/candidates/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return mapCandidate(payload);
}

export async function fetchTrendCandidates(params: {
  status?: CatalogueStatus;
  category?: TrendCategory;
  subcategory?: string;
  content_type?: TrendContentType;
  exclude_content_type?: TrendContentType;
  search?: string;
  is_read?: "true" | "false";
  is_saved?: "true" | "false";
  source_name?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}): Promise<{
  items: TrendCandidate[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const payload = await request<TrendCandidatesApiResponse>(
    `/trend-candidates?${searchParams.toString()}`
  );
  return {
    items: payload.data.map(mapTrendCandidate),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
    pages: payload.pagination.pages
  };
}

export async function updateTrendCandidate(
  key: string,
  body: Record<string, unknown>
): Promise<TrendCandidate> {
  const payload = await request<TrendApiCandidate>(`/trend-candidates/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return mapTrendCandidate(payload);
}

export async function fetchRecommendations(params: {
  category?: string;
  content_type?: string;
  curation_status?: string;
  search?: string;
  subcategory?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}): Promise<{
  data: RecommendationCandidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const payload = await request<RecommendationsApiResponse>(
    `/recommendations?${searchParams.toString()}`
  );
  return {
    data: payload.data.map(mapRecommendationCandidate),
    pagination: payload.pagination
  };
}

export async function updateRecommendation(
  key: string,
  body: Record<string, unknown>
): Promise<RecommendationCandidate> {
  const payload = await request<RecommendationApiItem>(`/recommendations/${key}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return mapRecommendationCandidate(payload);
}

export async function createCurationDecision(data: {
  candidate_key: string;
  candidate_collection: "product_candidates" | "trend_candidates";
  decision: "approved" | "rejected";
  reason?: string;
  rejection_preset?: string;
  decided_by: string;
}) {
  return request<{
    _key: string;
    candidate_key: string;
    candidate_collection: "product_candidates" | "trend_candidates";
    decision: "approved" | "rejected";
    reason: string | null;
    rejection_preset: string | null;
    decided_by: string;
    decided_at: string;
  }>("/curation-decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export async function promoteTrendCandidates(
  promotedBy: string,
  keys?: string[]
): Promise<{
  promoted: number;
  failed: number;
  errors: string[];
}> {
  return request("/trend-candidates/promote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promoted_by: promotedBy,
      ...(keys?.length ? { keys } : {})
    })
  });
}

export async function promoteCandidates(
  promotedBy: string,
  keys?: string[]
): Promise<{
  promoted: number;
  failed: number;
  errors: string[];
}> {
  return request("/candidates/promote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promoted_by: promotedBy,
      ...(keys?.length ? { keys } : {})
    })
  });
}

export async function fetchStats(): Promise<StatsApiResponse> {
  return request<StatsApiResponse>("/candidates/stats");
}

export async function fetchTrendStats(): Promise<TrendStatsApiResponse> {
  return request<TrendStatsApiResponse>("/trend-candidates/stats");
}

export async function fetchLists(params?: {
  list_type?: string;
  status?: string;
}): Promise<{ items: ListOption[] }> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, String(value));
      }
    });
  }

  const payload = await request<Array<ListOption & Record<string, unknown>>>(
    `/lists?${searchParams.toString()}`
  );

  return {
    items: payload.map((item) => ({
      _key: item._key,
      name: item.name,
      list_type: item.list_type,
      occasion: typeof item.occasion === "string" ? item.occasion : null,
      year: typeof item.year === "string" ? item.year : null
    }))
  };
}

export async function createList(body: {
  name: string;
  list_type: string;
  category: string;
  occasion?: string | null;
  year?: string | null;
  status?: string;
  content_type?: string;
}) {
  return request<ListOption & Record<string, unknown>>("/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function emptySidebarCounts(): SidebarCounts {
  return {
    requests: 0,
    shopping: 0,
    going_out: 0,
    travel: 0,
    staying_in: 0
  };
}

export function isShoppingTab(contentTab: ContentTab) {
  return contentTab === "shopping";
}

export function getInactiveTabItems(
  _contentTab: Exclude<ContentTab, "shopping">,
  _status: CatalogueStatus,
  _stayingInFilter: StayingInFilter
): CatalogueItem[] {
  return [];
}
