export const catalogueStatuses = ["pending", "approved", "rejected"] as const;
export const contentTabs = ["requests", "shopping", "going_out", "travel", "staying_in"] as const;
export const stayingInFilters = ["all", "recipe", "entertainment"] as const;
export const reviewerOptions = ["Kath", "Charlotte"] as const;

export type CatalogueStatus = (typeof catalogueStatuses)[number];
export type ContentTab = (typeof contentTabs)[number];
export type StayingInFilter = (typeof stayingInFilters)[number];
export type GridMode = 2 | 3;
export type ReviewerName = (typeof reviewerOptions)[number];
export type UrlStatus = "ok" | "broken" | "unknown";
export type CollectionName = "product_candidates" | "trend_candidates" | "recommendations";
export type TrendContentType =
  | "venue"
  | "travel"
  | "guide"
  | "experience"
  | "recipe"
  | "entertainment"
  | "list";
export type TrendCategory = "going_out" | "staying_in" | "shopping" | "gifting" | "travel";
export type TrendConfidence = "low" | "medium" | "high";
export type ContentScope = "unique_request" | "general";
export type CandidatePriority = "fast_track" | "normal";
export type GeoSource = "mapbox_searchbox" | "mapbox_error" | "manual";
export type GeoMatchType = "poi" | "locality" | "address" | "place" | "manual";
export type AuditLogEntry = {
  action: string;
  timestamp: string;
  note: string;
  user_name?: string;
};
export type NewTagSuggestion = { slug: string; category: string; confidence: string };
export type Endorsement = { source: string; award: string; year: number };
export type GuidePoiLink = {
  _key?: string;
  name: string;
  poi_type?: string | null;
  section_label?: string | null;
  note?: string | null;
};

type CandidateBase = {
  _key: string;
  collection: CollectionName;
  content_tab: ContentTab;
  name: string;
  description: string | null;
  image_url: string | null;
  source_name: string;
  source_url?: string | null;
  scrape_source: string;
  tags: string[];
  tags_pending_review?: string[];
  tags_suggested?: string[];
  tags_new?: NewTagSuggestion[];
  endorsements?: Endorsement[];
  is_blckbx_approved?: boolean;
  requested_by_client?: string | null;
  requested_by_client_name?: string | null;
  content_scope?: ContentScope;
  priority?: CandidatePriority;
  subcategory?: string | null;
  suggested_themes: string[];
  status: CatalogueStatus;
  curation_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  assigned_lists: string[];
  created_at: string;
  audit_log?: AuditLogEntry[];
  url_status?: UrlStatus;
};

export type ProductCandidate = CandidateBase & {
  collection: "product_candidates";
  content_tab: "shopping";
  content_type: "product";
  brand: string | null;
  price_text: string | null;
  price_pence: number | null;
  product_url: string | null;
  primary_image?: string | null;
  hero_image_url?: string | null;
  resolved_url?: string | null;
  candidate_url?: string | null;
  image_source?: string | null;
  signal_phrase?: string | null;
  content_focus?: string | null;
  position?: number | null;
  availability: "in_stock" | "out_of_stock";
  currency: string | null;
  category: string | null;
  gender_focus: string | null;
  age_suitability: string | null;
  promoted_to_key: string | null;
  already_in_catalogue?: boolean;
};

export type TrendCandidate = CandidateBase & {
  collection: "trend_candidates";
  content_tab: Exclude<ContentTab, "shopping">;
  content_type: TrendContentType;
  brand?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  category: TrendCategory | null;
  hero_image_url: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: GeoSource | null;
  geo_place_name?: string | null;
  geo_match_type?: GeoMatchType | null;
  geo_needs_review?: boolean | null;
  destination?: string | null;
  travel_assistant_note?: string | null;
  cover_images?: string[];
  body?: string | null;
  features_poi?: GuidePoiLink[];
  poi_count?: number;
  is_read: boolean;
  is_saved: boolean;
  location: string | null;
  confidence: TrendConfidence | null;
  signal_phrase: string | null;
  source_excerpt: string | null;
  source_url: string;
  promoted_to_key: string | null;
  scraped_at: string | null;
};

export type RecommendationCandidate = CandidateBase & {
  collection: "recommendations";
  content_tab: "travel";
  content_type: "guide";
  brand?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  category: "travel";
  hero_image_url: string | null;
  lat?: number | null;
  lng?: number | null;
  geo_source?: GeoSource | null;
  geo_place_name?: string | null;
  geo_match_type?: GeoMatchType | null;
  geo_needs_review?: boolean | null;
  destination?: string | null;
  travel_assistant_note?: string | null;
  cover_images?: string[];
  body?: string | null;
  features_poi?: GuidePoiLink[];
  poi_count?: number;
  location: string | null;
  confidence: TrendConfidence | null;
  signal_phrase: string | null;
  source_excerpt: string | null;
  promoted_to_key: string | null;
  scraped_at: string | null;
  curation_status?: "draft" | "pending" | "approved" | "rejected" | null;
};

export type CatalogueItem = ProductCandidate | TrendCandidate | RecommendationCandidate;

export type CatalogueResponse = {
  items: CatalogueItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type SidebarCounts = Record<ContentTab, number>;

export type ListOption = {
  _key: string;
  name: string;
  list_type: string;
};

export type ListsResponse = {
  items: ListOption[];
};

export type MutationResponse = {
  item: CatalogueItem;
};
