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
  Recipient,
  TaskMatchResponse,
} from "./types";
import { mockClientAccounts, mockRecipients } from "./mock-clients";
import { mockTaskMatch } from "./mock-data";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";
const MEILISEARCH_URL = import.meta.env.VITE_MEILISEARCH_URL || "http://localhost:7700";
const MEILISEARCH_API_KEY = import.meta.env.VITE_MEILISEARCH_API_KEY || "";
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_RESEARCH_WEBHOOK_URL || "";

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

export interface PaginatedGatewayResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

async function gatewayFetch(path: string, options?: RequestInit) {
  return fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  is_blckbx_approved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse<Recommendation>> {
  const body: Record<string, unknown> = {
    q: params.q || "",
    limit: params.limit || 24,
    offset: params.offset || 0,
  };
  const filters: string[] = ['content_type != "list"'];

  if (params.category) filters.push(`category = "${params.category}"`);
  if (params.subcategory) filters.push(`subcategory = "${params.subcategory}"`);
  if (params.is_blckbx_approved) filters.push("is_blckbx_approved = true");
  body.filter = filters.join(" AND ");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MEILISEARCH_API_KEY) headers.Authorization = `Bearer ${MEILISEARCH_API_KEY}`;

  const response = await fetch(`${MEILISEARCH_URL}/indexes/recommendations/search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Search error: ${response.status}`);
  }

  const data = await response.json();
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

export async function fetchGatewayRecommendations(params: {
  search?: string;
  category?: string;
  content_type?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedGatewayResponse<Recommendation>> {
  const response = await gatewayFetch(`/recommendations?${toSearchParams(params).toString()}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<PaginatedGatewayResponse<Recommendation>>;
}

export async function fetchGatewayRecommendation(key: string): Promise<Recommendation> {
  const response = await gatewayFetch(`/recommendations/${encodeURIComponent(key)}`);

  if (response.status === 404) {
    throw new Error("NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<Recommendation>;
}

export async function submitLink(payload: {
  url: string;
  source_name: string;
  content_focus: string;
  article_title: string;
  is_direct_article: boolean;
}) {
  if (!N8N_WEBHOOK_URL) {
    return { ok: true, mocked: true, payload };
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Webhook submission failed.");
  }

  return { ok: true };
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

export async function searchRecipients(query: string, clientAccountKey: string): Promise<Recipient[]> {
  const normalizedQuery = query.trim().toLowerCase();

  return mockRecipients.filter((recipient) => {
    const matchesClient = recipient.client_account_key === clientAccountKey;
    const matchesQuery = normalizedQuery ? recipient.name.toLowerCase().includes(normalizedQuery) : true;
    return matchesClient && matchesQuery;
  });
}

export async function findTaskMatches(_payload: {
  client_account_key: string;
  recipient_key: string;
  task_name: string;
  description: string;
  additional_context: string;
}): Promise<TaskMatchResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 450));
  return mockTaskMatch;
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
  const response = await gatewayFetch("/candidates", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      submitted_by: CURRENT_USER_KEY,
    }),
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
