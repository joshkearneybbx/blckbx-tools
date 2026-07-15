import type {
  AddItemSubmission,
  BrandOption,
  ClientAccount,
  ClientProfile,
  DedupCheckResult,
  InterestTagOption,
  ProfileAffinity,
  ProfileInterest,
  Recommendation,
} from "./types";
import type { EditQueueHousehold, HouseholdEditsResponse } from "./edit-types";
import { mockClientAccounts } from "./mock-clients";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";

export const CURRENT_USER_KEY = "research_hub_local";

export interface SearchResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  query: string;
  processingTimeMs?: number;
}

async function gatewayFetch(path: string, options?: RequestInit) {
  return fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(import.meta.env.VITE_GATEWAY_API_KEY
        ? { "x-api-key": import.meta.env.VITE_GATEWAY_API_KEY }
        : {}),
      ...options?.headers,
    },
  });
}

async function parseGatewayJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  return data as T;
}

function unwrapDataArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function toSearchParams(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams;
}

export async function fetchRecommendations(params: {
  q?: string;
  category?: string;
  subcategory?: string;
  content_type?: string;
  /** Pool §1 */
  provenance?: string;
  persona?: string;
  season?: string;
  freshness?: string;
  is_blckbx_approved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse<Recommendation>> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.subcategory) searchParams.set("subcategory", params.subcategory);
  if (params.content_type) {
    searchParams.set("content_type", params.content_type);
  } else {
    // Lists are not a Recommendations Manager surface — keep them out of Pool.
    searchParams.set("content_type_exclude", "list");
  }
  if (params.provenance) searchParams.set("provenance", params.provenance);
  if (params.persona) searchParams.set("persona", params.persona);
  if (params.season) searchParams.set("season", params.season);
  if (params.freshness) searchParams.set("freshness", params.freshness);
  if (params.is_blckbx_approved) searchParams.set("is_blckbx_approved", "true");
  searchParams.set("limit", String(params.limit ?? 24));
  searchParams.set("offset", String(params.offset ?? 0));

  const response = await gatewayFetch(`/search?${searchParams.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : `HTTP ${response.status}`;
    throw new Error(`Search error (${response.status}): ${detail}`);
  }
  return {
    data: (data.hits ?? []).map((hit: Record<string, unknown>) => ({
      ...hit,
      _key: String(hit._key ?? hit.id ?? ""),
    })) as Recommendation[],
    pagination: {
      total: data.estimatedTotalHits || 0,
      limit: data.limit ?? params.limit ?? 24,
      offset: data.offset ?? params.offset ?? 0,
    },
    query: data.query ?? params.q ?? "",
    processingTimeMs: data.processingTimeMs,
  };
}

export async function searchClientAccounts(query: string): Promise<ClientAccount[]> {
  const searchParams = toSearchParams({ q: query.trim() });

  try {
    const response = await gatewayFetch(`/client-accounts?${searchParams.toString()}`);
    if (!response.ok) throw new Error("Client account search failed");
    const data = await response.json();
    return data.data as ClientAccount[];
  } catch {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? mockClientAccounts.filter((client) => client.account_name.toLowerCase().includes(normalizedQuery))
      : mockClientAccounts;
  }
}

export async function searchInterestClientAccounts(query: string, limit = 20): Promise<ClientAccount[]> {
  const searchParams = toSearchParams({ search: query.trim(), limit });
  const response = await gatewayFetch(`/client-accounts?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Client account search failed");
  }

  return unwrapDataArray<ClientAccount>(await response.json());
}

export async function fetchClientInterestProfiles(clientAccountKey: string): Promise<ClientProfile[]> {
  const response = await gatewayFetch(`/client-accounts/${encodeURIComponent(clientAccountKey)}/profiles`);

  if (!response.ok) {
    throw new Error("Failed to load profiles");
  }

  return unwrapDataArray<ClientProfile>(await response.json());
}

export async function fetchProfileInterests(profileKey: string): Promise<ProfileInterest[]> {
  const response = await gatewayFetch(`/profiles/${encodeURIComponent(profileKey)}/interests`);

  if (!response.ok) {
    throw new Error("Failed to load interests");
  }

  const payload = await response.json();
  if (payload && typeof payload === "object" && Array.isArray((payload as { interests?: unknown[] }).interests)) {
    return (payload as { interests: ProfileInterest[] }).interests;
  }
  return unwrapDataArray<ProfileInterest>(payload);
}

export async function fetchProfileAffinities(profileKey: string): Promise<ProfileAffinity[]> {
  const response = await gatewayFetch(`/profiles/${encodeURIComponent(profileKey)}/affinities`);

  if (!response.ok) {
    throw new Error("Failed to load affinities");
  }

  const payload = await response.json();
  if (payload && typeof payload === "object" && Array.isArray((payload as { affinities?: unknown[] }).affinities)) {
    return (payload as { affinities: ProfileAffinity[] }).affinities;
  }
  return unwrapDataArray<ProfileAffinity>(payload);
}

export async function searchInterestTags(query: string, limit = 10): Promise<InterestTagOption[]> {
  const searchParams = toSearchParams({ search: query.trim(), limit });
  const response = await gatewayFetch(`/tags?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load tags");
  }

  return unwrapDataArray<InterestTagOption>(await response.json());
}

export async function createInterestTag(payload: {
  label: string;
  category: string;
}): Promise<InterestTagOption> {
  const response = await gatewayFetch("/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await parseGatewayJson<Record<string, unknown>>(response);
  if (!response.ok) {
    throw new Error(String(data.error ?? data.message ?? "Failed to create tag"));
  }

  return data as unknown as InterestTagOption;
}

export async function createProfileInterest(
  profileKey: string,
  payload: {
    tag_key: string;
    strength: number;
    note?: string;
    added_by?: string;
  }
) {
  const response = await gatewayFetch(`/profiles/${encodeURIComponent(profileKey)}/interests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await parseGatewayJson<Record<string, unknown>>(response);
  if (!response.ok) {
    const message = String(data.error ?? data.message ?? "Failed to add interest");
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function updateProfileInterest(
  profileKey: string,
  edgeKey: string,
  payload: {
    strength?: number;
    note?: string;
  }
) {
  const response = await gatewayFetch(
    `/profiles/${encodeURIComponent(profileKey)}/interests/${encodeURIComponent(edgeKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update interest");
  }

  return response.json();
}

export async function deleteProfileInterest(profileKey: string, edgeKey: string) {
  const response = await gatewayFetch(
    `/profiles/${encodeURIComponent(profileKey)}/interests/${encodeURIComponent(edgeKey)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error("Failed to delete interest");
  }
}

export async function searchBrands(query: string, limit = 10): Promise<BrandOption[]> {
  const searchParams = toSearchParams({ search: query.trim(), limit });
  const response = await gatewayFetch(`/brands?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load brands");
  }

  return unwrapDataArray<BrandOption>(await response.json());
}

export async function createProfileAffinity(
  profileKey: string,
  payload: {
    brand_key: string;
    note?: string;
    added_by?: string;
  }
) {
  const response = await gatewayFetch(`/profiles/${encodeURIComponent(profileKey)}/affinities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await parseGatewayJson<Record<string, unknown>>(response);
  if (!response.ok) {
    const message = String(data.error ?? data.message ?? "Failed to add brand affinity");
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function updateProfileAffinity(
  profileKey: string,
  edgeKey: string,
  payload: {
    note?: string;
  }
) {
  const response = await gatewayFetch(
    `/profiles/${encodeURIComponent(profileKey)}/affinities/${encodeURIComponent(edgeKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update affinity");
  }

  return response.json();
}

export async function deleteProfileAffinity(profileKey: string, edgeKey: string) {
  const response = await gatewayFetch(
    `/profiles/${encodeURIComponent(profileKey)}/affinities/${encodeURIComponent(edgeKey)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error("Failed to delete affinity");
  }
}

export async function updateProfileNotes(profileKey: string, notes: string) {
  const response = await gatewayFetch(`/profiles/${encodeURIComponent(profileKey)}`, {
    method: "PATCH",
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw new Error("Failed to save notes");
  }

  return response.json();
}

export async function checkCandidateDedup(payload: {
  name: string;
  brand?: string;
  url: string;
}): Promise<DedupCheckResult> {
  const searchParams = toSearchParams(payload);

  try {
    const response = await gatewayFetch(`/candidates/check-dedup?${searchParams.toString()}`);
    if (!response.ok) throw new Error("Dedup check failed");
    return response.json() as Promise<DedupCheckResult>;
  } catch {
    return { exists: false };
  }
}

export async function createCandidate(payload: AddItemSubmission) {
  const content_scope =
    payload.content_scope ??
    (payload.routing === "for_pool" ? "general" : "unique_request");

  const body: Record<string, unknown> = {
    name: payload.name,
    description: payload.description,
    url: payload.url,
    image_url: payload.image_url,
    category: payload.category,
    subcategory: payload.subcategory,
    content_scope,
    submitted_by: CURRENT_USER_KEY,
    brand: payload.brand ?? "",
    gender_target: payload.gender_target || null,
    reviewer_notes: payload.reviewer_notes || null,
    price_pence: payload.price_pence ?? null,
  };

  if (content_scope === "unique_request") {
    body.requested_for_profile = payload.requested_for_profile;
    if (payload.client_account_key) {
      body.client_account_key = payload.client_account_key;
    }
  }

  const response = await gatewayFetch("/candidates", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Candidate submission failed");
  }
  return data;
}

export async function fetchMyCandidateSubmissions() {
  const searchParams = toSearchParams({ submitted_by: CURRENT_USER_KEY });
  const response = await gatewayFetch(`/candidates/my-submissions?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load submissions");
  }

  const data = await response.json();
  return data.data as AddItemSubmission[];
}

// ── The Edit (read-only queue + household drafts) ─────────────────

/** Canonical Monday YYYY-MM-DD (UTC) — same rule as gateway week-of.ts */
export function canonicalWeekOf(input: Date = new Date()): string {
  const utc = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = utc.getUTCDay(); // 0=Sun … 6=Sat
  const daysSinceMonday = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - daysSinceMonday);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function fetchEditQueue(weekOf?: string): Promise<{
  week_of: string;
  households: EditQueueHousehold[];
}> {
  const week = weekOf || canonicalWeekOf();
  const qs = `?week_of=${encodeURIComponent(week)}`;
  const response = await gatewayFetch(`/weekly-edits/queue${qs}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to load Edit queue (${response.status})${body ? `: ${body.slice(0, 160)}` : ""} — is gateway local with /weekly-edits routes?`
    );
  }
  return response.json();
}

export async function fetchHouseholdEdits(
  householdKey: string,
  weekOf?: string
): Promise<HouseholdEditsResponse> {
  const week = weekOf || canonicalWeekOf();
  const qs = `?week_of=${encodeURIComponent(week)}`;
  const response = await gatewayFetch(
    `/weekly-edits/household/${encodeURIComponent(householdKey)}${qs}`
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to load household drafts (${response.status})${body ? `: ${body.slice(0, 160)}` : ""}`
    );
  }
  return response.json();
}

export type SwapEditPayload = {
  recommendation_key_out: string;
  recommendation_key_in: string;
  section: string;
  reason_preset: string;
  reason_text?: string;
  decided_by: string;
  rationale?: string;
};

async function postEditAction(path: string, payload: Record<string, unknown>, label: string) {
  const response = await gatewayFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      typeof data?.message === "string" ? data.message : `${label} failed (${response.status})`
    ) as Error & { code?: string; status?: number; body?: unknown };
    err.code = typeof data?.code === "string" ? data.code : undefined;
    err.status = response.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function swapEditItem(editKey: string, payload: SwapEditPayload) {
  return postEditAction(
    `/weekly-edits/${encodeURIComponent(editKey)}/swap`,
    payload,
    "Swap"
  ) as Promise<{
    edit: HouseholdEditsResponse["drafts"][number];
    decision: Record<string, unknown>;
    llm_proposed_untouched: boolean;
  }>;
}

export async function removeEditItem(
  editKey: string,
  payload: {
    recommendation_key_out: string;
    section: string;
    reason_preset: string;
    reason_text?: string;
    decided_by: string;
  }
) {
  return postEditAction(`/weekly-edits/${encodeURIComponent(editKey)}/remove`, payload, "Remove");
}

export async function moveEditItem(
  editKey: string,
  payload: {
    recommendation_key_out: string;
    section: string;
    moved_to_profile_key: string;
    decided_by: string;
    reason_text?: string;
  }
) {
  return postEditAction(`/weekly-edits/${encodeURIComponent(editKey)}/move`, payload, "Move");
}

export async function addEditItem(
  editKey: string,
  payload: {
    recommendation_key_in: string;
    section: string;
    decided_by: string;
    bound_action?: string;
    rationale?: string;
  }
) {
  return postEditAction(`/weekly-edits/${encodeURIComponent(editKey)}/add`, payload, "Add");
}

export async function regenerateEdit(
  editKey: string,
  payload: {
    scope: "section" | "edit";
    section?: string;
    reason_preset: string;
    reason_text?: string;
    decided_by: string;
  }
) {
  return postEditAction(
    `/weekly-edits/${encodeURIComponent(editKey)}/regenerate`,
    payload,
    "Regenerate"
  );
}

export async function shipEdit(editKey: string, decided_by: string) {
  return postEditAction(`/weekly-edits/${encodeURIComponent(editKey)}/ship`, { decided_by }, "Ship");
}

export async function undoShipEdit(editKey: string) {
  return postEditAction(`/weekly-edits/${encodeURIComponent(editKey)}/undo-ship`, {}, "Undo ship");
}
