import type {
  GuideDraft,
  GuidePoiInput,
  PaginatedResponse,
  PoiDraft,
  Recommendation,
  TrendCandidate
} from "./types";

const API_BASE = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(import.meta.env.VITE_GATEWAY_API_KEY
        ? { "x-api-key": import.meta.env.VITE_GATEWAY_API_KEY }
        : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildGeoPayload(draft: PoiDraft) {
  const lat = toOptionalNumber(draft.lat || draft.latitude);
  const lng = toOptionalNumber(draft.lng || draft.longitude);
  const hasCoords = lat != null && lng != null;

  return {
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    geo_source: hasCoords ? "manual" : draft.geo_source || null,
    geo_place_name: draft.geo_place_name || null,
    geo_match_type: hasCoords ? "manual" : draft.geo_match_type || null,
    geo_needs_review: hasCoords ? false : draft.geo_needs_review
  };
}

export function fetchIncoming(search: string) {
  const params = new URLSearchParams({
    category: "travel",
    status: "pending",
    sort: "created_at",
    order: "desc",
    limit: "24"
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  return request<PaginatedResponse<TrendCandidate>>(`/trend-candidates?${params.toString()}`);
}

export function updateIncoming(key: string, draft: PoiDraft) {
  return request<TrendCandidate>(`/trend-candidates/${key}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      poi_type: draft.poi_type || null,
      location: draft.location || null,
      location_address: draft.location_address || null,
      location_city: draft.location_city || null,
      location_country: draft.location_country || null,
      ...buildGeoPayload(draft),
      images: splitCsv(draft.images),
      hero_image_url: splitCsv(draft.images)[0] ?? null,
      website_url: draft.website_url || null,
      booking_url: draft.booking_url || null,
      contact_phone: draft.contact_phone || null,
      contact_email: draft.contact_email || null,
      price_indicator: draft.price_indicator || null,
      tags: splitCsv(draft.tags)
    })
  });
}

export function rejectIncoming(key: string) {
  return request<TrendCandidate>(`/trend-candidates/${key}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "rejected",
      rejection_reason: "Rejected from Travel Hub"
    })
  });
}

export function promoteIncoming(key: string) {
  return request<{ promoted_to_key: string }>(`/trend-candidates/${key}/promote-poi`, {
    method: "POST",
    body: JSON.stringify({
      promoted_by: "Nicole"
    })
  });
}

export function fetchPois(search: string, poiType: string) {
  const params = new URLSearchParams({
    category: "travel",
    content_type: "travel_poi",
    sort: "updated_at",
    order: "desc",
    limit: "48"
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (poiType.trim()) {
    params.set("poi_type", poiType.trim());
  }

  return request<PaginatedResponse<Recommendation>>(`/recommendations?${params.toString()}`);
}

export function createPoi(draft: PoiDraft) {
  const images = splitCsv(draft.images);
  return request<Recommendation>("/recommendations", {
    method: "POST",
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      content_type: "travel_poi",
      category: "travel",
      poi_type: draft.poi_type || null,
      location: draft.location || null,
      location_address: draft.location_address || null,
      location_city: draft.location_city || null,
      location_country: draft.location_country || null,
      ...buildGeoPayload(draft),
      images,
      image_url: images[0] ?? null,
      hero_image_url: images[0] ?? null,
      website_url: draft.website_url || null,
      booking_url: draft.booking_url || null,
      contact_phone: draft.contact_phone || null,
      contact_email: draft.contact_email || null,
      price_indicator: draft.price_indicator || null,
      tags: splitCsv(draft.tags)
    })
  });
}

export function updatePoi(key: string, draft: PoiDraft) {
  const images = splitCsv(draft.images);
  return request<Recommendation>(`/recommendations/${key}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      poi_type: draft.poi_type || null,
      location: draft.location || null,
      location_address: draft.location_address || null,
      location_city: draft.location_city || null,
      location_country: draft.location_country || null,
      ...buildGeoPayload(draft),
      images,
      image_url: images[0] ?? null,
      hero_image_url: images[0] ?? null,
      website_url: draft.website_url || null,
      booking_url: draft.booking_url || null,
      contact_phone: draft.contact_phone || null,
      contact_email: draft.contact_email || null,
      price_indicator: draft.price_indicator || null,
      tags: splitCsv(draft.tags)
    })
  });
}

export function fetchGuides(search: string) {
  const params = new URLSearchParams({
    category: "travel",
    content_type: "guide",
    sort: "updated_at",
    order: "desc",
    limit: "24"
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  return request<PaginatedResponse<Recommendation>>(`/recommendations?${params.toString()}`);
}

export function createGuide(
  draft: GuideDraft,
  pois: GuidePoiInput[],
  curationStatus: "draft" | "pending" = "draft"
) {
  return request<Recommendation>("/recommendations", {
    method: "POST",
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      content_type: "guide",
      category: "travel",
      destination: draft.destination || null,
      subcategory: draft.subcategory || null,
      hero_image_url: draft.hero_image_url || null,
      image_url: draft.hero_image_url || null,
      hero_video_url: draft.hero_video_url || null,
      cover_images: splitCsv(draft.cover_images),
      seasonal_tags: splitCsv(draft.seasonal_tags),
      tags: splitCsv(draft.tags),
      travel_assistant_note: draft.travel_assistant_note || null,
      body: draft.body || null,
      curation_status: curationStatus,
      pois
    })
  });
}

export function updateGuide(
  key: string,
  draft: GuideDraft,
  curationStatus?: "draft" | "pending" | "approved" | "rejected"
) {
  return request<Recommendation>(`/recommendations/${key}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: draft.name,
      description: draft.description,
      destination: draft.destination || null,
      subcategory: draft.subcategory || null,
      hero_image_url: draft.hero_image_url || null,
      image_url: draft.hero_image_url || null,
      hero_video_url: draft.hero_video_url || null,
      cover_images: splitCsv(draft.cover_images),
      seasonal_tags: splitCsv(draft.seasonal_tags),
      tags: splitCsv(draft.tags),
      travel_assistant_note: draft.travel_assistant_note || null,
      body: draft.body || null,
      curation_status: curationStatus
    })
  });
}

export function addPoiToGuide(
  guideKey: string,
  poiKey: string,
  position: number,
  sectionLabel: string,
  note?: string
) {
  return request<{ data: Recommendation["features_poi"] }>(`/recommendations/${guideKey}/pois`, {
    method: "POST",
    body: JSON.stringify({
      poi_key: poiKey,
      position,
      section_label: sectionLabel,
      note: note || null
    })
  });
}

export function updateGuidePoi(
  guideKey: string,
  poiKey: string,
  payload: {
    position: number;
    section_label: string;
    note?: string | null;
  }
) {
  return request<Recommendation["features_poi"]>(`/recommendations/${guideKey}/pois/${poiKey}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function removePoiFromGuide(guideKey: string, poiKey: string) {
  return request<void>(`/recommendations/${guideKey}/pois/${poiKey}`, {
    method: "DELETE"
  });
}
