export type ContentHubTrendCategory =
  | "going_out"
  | "staying_in"
  | "shopping"
  | "gifting"
  | "travel"
  | "hr";

export type ContentHubTrendStatus = "active" | "pinned" | "dismissed" | "used";

export type ContentHubSource = "tiktok" | "instagram" | "google_trends" | "manual";

export type ContentHubStatusFilter = "active" | "pinned" | "dismissed" | "all";

export type ContentHubSignalFilter = "all" | "gt4" | "gt7";

export type ContentHubSortKey = "signal_score" | "recency" | "velocity" | "views";

export interface ContentHubTrendRecord {
  id: string;
  topic_key: string;
  topic: string;
  category?: ContentHubTrendCategory | null;
  status: ContentHubTrendStatus;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  signal_count?: number | null;
  velocity?: number | null;
  views?: number | null;
  cross_platform_count?: number | null;
  signal_score?: number | null;
  suggested_title?: string | null;
  angle?: string | null;
  seo_short_tail?: string[] | null;
  seo_long_tail?: string[] | null;
  geo_questions?: string[] | null;
  raw_payload?: Record<string, unknown> | null;
  created: string;
  updated: string;
}

export interface ContentHubTrendSourceRecord {
  id: string;
  trend: string;
  source: ContentHubSource;
  external_id: string;
  url?: string | null;
  metric_name?: string | null;
  metric_value?: number | null;
  seen_at?: string | null;
  created: string;
  updated: string;
}

export type ContentHubAssetType = "newsletter" | "instagram_post" | "blog";

export type ContentHubAssetStatus = "draft" | "approved" | "published" | "archived";

export interface ContentHubAssetRecord {
  id: string;
  type: ContentHubAssetType;
  status: ContentHubAssetStatus;
  trends: string[];
  title: string;
  subtitle?: string | null;
  slug?: string | null;
  content?: string | Record<string, unknown> | null;
  image?: string | null;
  source_image?: string | null;
  template_id?: string | null;
  generation_params?: Record<string, unknown> | string | null;
  model?: string | null;
  cost_estimate?: number | null;
  cleared_flags?: string[];
  created_by?: string | null;
  published_at?: string | null;
  created: string;
  updated: string;
}

export interface IGCover {
  headline: string;
  image_query: string;
  image_url?: string;
  image_thumbnail_url?: string;
  image_source_url?: string;
  image_candidates?: ImageSearchResult[]; // page-state only, not persisted
}

export interface IGItem {
  name: string;
  body: string;
  image_query: string;
  image_url?: string;
  image_thumbnail_url?: string;
  image_source_url?: string;
  image_candidates?: ImageSearchResult[]; // page-state only, not persisted
}

export interface IGCarouselContent {
  cover: IGCover;
  items: IGItem[];
  caption: string;
  hashtags: string[];
  meta_note?: string;
}

export interface IGGenerationMeta {
  model: string;
  temperature: number;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  style_guide_id: string;
  search_query: string;
  search_result_count: number;
  item_count_requested: number;
  item_count_actual: number;
  generated_at: string;
}

export interface ImageSearchResult {
  rank: number;
  image_url: string;
  source_url: string;
  source_title: string;
  source_domain: string;
  width: number | null;
  height: number | null;
}

export interface ContentHubTrendsQueryResult {
  trends: ContentHubTrendRecord[];
  sourcesByTrendId: Record<string, ContentHubTrendSourceRecord[]>;
}

export interface ContentHubTrendRow extends ContentHubTrendRecord {
  sources: ContentHubTrendSourceRecord[];
}
