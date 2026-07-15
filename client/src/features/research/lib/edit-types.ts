export type EditSection = "going_out" | "staying_in" | "shopping" | "gifting";

export type BoundAction = "ask_assistant" | "book" | "buy" | "save";

export type EditItemSnapshot = {
  name: string;
  image_url?: string | null;
  price_pence?: number | null;
  price_text?: string | null;
  url?: string | null;
};

export type EditItem = {
  recommendation_key: string;
  section: EditSection;
  position: number;
  bound_action: BoundAction;
  rationale: string;
  snapshot: EditItemSnapshot;
};

export type PersonaMatch = { slug: string; weight: number };

export type UnderfillReport = {
  profile_key: string;
  section: EditSection;
  wanted: number;
  got: number;
};

export type WeeklyEditDraft = {
  _key: string;
  profile_key: string;
  household_key: string;
  week_of: string;
  status: "draft" | "shipped" | string;
  composed_by?: string;
  shipped_at?: string | null;
  llm_proposed?: EditItem[];
  items: EditItem[];
  personas_matched?: PersonaMatch[];
  no_primary_set?: boolean;
  primary_key?: string | null;
  underfilled?: UnderfillReport[];
  profile_name?: string;
  profile_first_name?: string | null;
  profile_last_name?: string | null;
};

export type EditQueueHousehold = {
  household_key: string;
  account_name: string;
  week_of: string;
  status: string;
  adult_count: number;
  item_count: number;
  no_primary_set: boolean;
  draft_keys: string[];
};

export type HouseholdEditsResponse = {
  household_key: string;
  account_name: string;
  week_of: string;
  no_primary_set: boolean;
  primary_key: string | null;
  drafts: WeeklyEditDraft[];
};

export const SECTION_LABELS: Record<EditSection, string> = {
  going_out: "Going Out",
  staying_in: "Staying In",
  shopping: "Shopping",
  gifting: "Gifting",
};

export const SECTIONS: EditSection[] = ["going_out", "staying_in", "shopping", "gifting"];

export const BOUND_ACTION_LABELS: Record<BoundAction, string> = {
  ask_assistant: "Ask assistant",
  book: "Book",
  buy: "Buy",
  save: "Save",
};
