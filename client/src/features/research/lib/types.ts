export type Category = "all" | "shopping" | "going_out" | "travel" | "staying_in" | "gifting";
export type ContentType = "product" | "venue" | "recipe" | "entertainment" | "experience" | "list" | "guide";
export type Endorsement = {
  source: string;
  award: string;
  year: number;
};

export type Recommendation = {
  _key: string;
  _id?: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  price_range?: string | null;
  image_url?: string | null;
  hero_image_url?: string | null;
  url?: string | null;
  content_type: ContentType;
  category: Exclude<Category, "all">;
  subcategory?: string | null;
  location?: string | null;
  tags?: string[];
  resolved_tags?: string[];
  endorsements?: Endorsement[];
  source_name?: string;
  source?: string | null;
  source_url?: string | null;
  status?: string;
  curation_status?: string;
  curated_by?: string | null;
  list_type?: "evergreen" | "occasion" | "editorial" | "seasonal" | null;
  price_tier_focus?: "mixed" | "budget" | "premium" | "luxury" | null;
  gender_focus?: "female" | "male" | "mixed" | "gender_neutral" | null;
  product_count?: number | null;
  is_blckbx_approved?: boolean;
  created_at: string;
  in_stock?: boolean;
  destination?: string | null;
  poi_count?: number | null;
};

export type AddItemSubmission = {
  _key?: string;
  name: string;
  description: string;
  url: string;
  image_url: string;
  category: Exclude<Category, "all">;
  subcategory: string;
  client_account_key: string;
  price_pence?: number | null;
  brand?: string;
  gender_target?: "for_her" | "for_him" | "gender_neutral" | "";
  reviewer_notes?: string;
  status?: string;
  submitted_at?: string;
};

export type DedupCheckResult = {
  exists: boolean;
  location?: "recommendations" | "product_candidates";
  message?: string;
  key?: string;
};

export type Suggestion = {
  recommendation_key: string;
  reason: string;
  match_tags: string[];
  confidence: "high" | "medium" | "low";
};

export type TaskMatchResponse = {
  intro: string;
  suggestions: Suggestion[];
  candidates: Recommendation[];
};

export type ClientAccount = {
  _key: string;
  account_name: string;
  primary_contact?: string | null;
  primary_contact_name?: string | null;
  membership_tier?: "standard" | "premium" | "luxury" | "ultra" | string | null;
};

export type Recipient = {
  _key: string;
  name: string;
  client_account_key: string;
};

export type ClientProfile = {
  _key: string;
  first_name: string;
  last_name: string;
  is_primary?: boolean;
  interests_count?: number;
  affinities_count?: number;
  notes?: string | null;
};

export type InterestTagOption = {
  _key: string;
  label: string;
  category?: string | null;
  usage_count?: number | null;
};

export type BrandOption = {
  _key: string;
  name: string;
  tier?: "budget" | "mid" | "premium" | "luxury" | "ultra_luxury" | string | null;
  website?: string | null;
};

export type ProfileInterest = {
  edge_key: string;
  tag_key: string;
  label: string;
  strength: number;
  note?: string | null;
  editable: boolean;
  added_by?: string | null;
  inferred_from?: string | null;
  updated_at?: string | null;
};

export type ProfileAffinity = {
  edge_key: string;
  brand_key: string;
  name: string;
  tier?: string | null;
  note?: string | null;
  editable: boolean;
  added_by?: string | null;
  inferred_from?: string | null;
  purchase_count?: number | null;
  total_spend_pence?: number | null;
  updated_at?: string | null;
};

export type RecentSubmission = {
  id: string;
  url: string;
  source_name: string;
  content_focus: string;
  article_title: string;
  is_direct_article: boolean;
  created_at: string;
};
