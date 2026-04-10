import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Bookings from "@/pages/Bookings";
import QuoteGenerator from "@/pages/QuoteGenerator";
import QuotesList from "@/pages/QuotesList";
import { pb } from "@/lib/pocketbase";

import {
  addPoiToGuide,
  createGuide,
  createPoi,
  fetchGuides,
  fetchIncoming,
  fetchPois,
  promoteIncoming,
  rejectIncoming,
  removePoiFromGuide,
  updateGuide,
  updateGuidePoi,
  updateIncoming,
  updatePoi
} from "../lib/api";
import type {
  GuideDraft,
  GuidePoiInput,
  PoiDraft,
  Recommendation,
  RecommendationPoiLink,
  TrendCandidate,
  TravelTab
} from "../lib/types";

const tabs: Array<{ key: TravelTab; label: string }> = [
  { key: "incoming", label: "Incoming" },
  { key: "poi-library", label: "POI Library" },
  { key: "guides", label: "Guides" },
  { key: "quotes", label: "Quotes" },
  { key: "bookings", label: "Bookings" },
  { key: "insurance-checker", label: "Insurance Checker" }
];

const GUIDE_SECTIONS = [
  {
    key: "stay",
    title: "Where to Stay",
    suggestionLabel: "hotel",
    defaultTypes: ["hotel", "villa", "resort"],
    positions: [1, 2, 3]
  },
  {
    key: "eat",
    title: "Where to Eat",
    suggestionLabel: "restaurant",
    defaultTypes: ["restaurant", "bar", "cafe"],
    positions: [4, 5, 6]
  },
  {
    key: "do",
    title: "Things to Do",
    suggestionLabel: "activity",
    defaultTypes: ["activity", "museum", "walk", "spa", "beach", "market"],
    positions: [7, 8, 9]
  }
] as const;

const POI_TYPE_PILLS = [
  { label: "All", value: null },
  { label: "Hotels", value: "hotel" },
  { label: "Villas", value: "villa" },
  { label: "Restaurants", value: "restaurant" },
  { label: "Bars", value: "bar" },
  { label: "Activities", value: "activity" },
  { label: "Spas", value: "spa" },
  { label: "Museums", value: "museum" }
] as const;

type GuideSectionKey = (typeof GUIDE_SECTIONS)[number]["key"];

type GuideSlot = {
  sectionKey: GuideSectionKey;
  sectionLabel: string;
  position: number;
  poi: Recommendation | null;
  note: string;
};

const EMPTY_INCOMING: TrendCandidate[] = [];
const EMPTY_RECOMMENDATIONS: Recommendation[] = [];

function emptyPoiDraft(): PoiDraft {
  return {
    name: "",
    description: "",
    poi_type: "",
    location: "",
    location_address: "",
    location_city: "",
    location_country: "",
    lat: "",
    lng: "",
    geo_source: "",
    geo_place_name: "",
    geo_match_type: "",
    geo_needs_review: false,
    latitude: "",
    longitude: "",
    images: "",
    website_url: "",
    booking_url: "",
    contact_phone: "",
    contact_email: "",
    price_indicator: "",
    tags: ""
  };
}

function emptyGuideDraft(): GuideDraft {
  return {
    name: "",
    description: "",
    destination: "",
    subcategory: "destinations",
    hero_image_url: "",
    hero_video_url: "",
    cover_images: "",
    seasonal_tags: "",
    tags: "",
    travel_assistant_note: "",
    body: ""
  };
}

function poiToDraft(item?: Partial<TrendCandidate | Recommendation> | null): PoiDraft {
  if (!item) {
    return emptyPoiDraft();
  }

  const recommendation = item as Recommendation;
  const candidate = item as TrendCandidate;

  return {
    name: item.name ?? "",
    description: item.description ?? "",
    poi_type: item.poi_type ?? "",
    location: getLocationText(item) ?? "",
    location_address: item.location_address ?? "",
    location_city: item.location_city ?? "",
    location_country: item.location_country ?? "",
    lat:
      "lat" in item && item.lat != null
        ? String(item.lat)
        : item.latitude == null
          ? ""
          : String(item.latitude),
    lng:
      "lng" in item && item.lng != null
        ? String(item.lng)
        : item.longitude == null
          ? ""
          : String(item.longitude),
    geo_source: ("geo_source" in item ? item.geo_source : null) ?? "",
    geo_place_name: ("geo_place_name" in item ? item.geo_place_name : null) ?? "",
    geo_match_type: ("geo_match_type" in item ? item.geo_match_type : null) ?? "",
    geo_needs_review: "geo_needs_review" in item ? Boolean(item.geo_needs_review) : false,
    latitude: item.latitude == null ? "" : String(item.latitude),
    longitude: item.longitude == null ? "" : String(item.longitude),
    images: item.images?.join(", ") ?? item.hero_image_url ?? "",
    website_url: item.website_url ?? "",
    booking_url: item.booking_url ?? "",
    contact_phone: item.contact_phone ?? "",
    contact_email: item.contact_email ?? "",
    price_indicator: item.price_indicator ?? "",
    tags: recommendation.resolved_tags?.join(", ") ?? candidate.tags?.join(", ") ?? ""
  };
}

function guideToDraft(item?: Recommendation | null): GuideDraft {
  if (!item) {
    return emptyGuideDraft();
  }

  return {
    name: item.name ?? "",
    description: item.description ?? "",
    destination: item.destination ?? "",
    subcategory: item.subcategory ?? "destinations",
    hero_image_url: item.hero_image_url ?? item.image_url ?? "",
    hero_video_url: item.hero_video_url ?? "",
    cover_images: item.cover_images?.join(", ") ?? "",
    seasonal_tags: item.seasonal_tags?.join(", ") ?? "",
    tags: item.resolved_tags?.join(", ") ?? "",
    travel_assistant_note: item.travel_assistant_note ?? "",
    body: item.body ?? ""
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function cardImage(item: Partial<TrendCandidate | Recommendation>) {
  return item.hero_image_url ?? (item as Recommendation).image_url ?? item.images?.[0] ?? "";
}

function normaliseLabel(value?: string | null) {
  return value?.trim() || "Unclassified";
}

function matchesPoiTypeFilter(value: string | null | undefined, filter: string | null) {
  if (!filter) {
    return true;
  }

  return (value ?? "").trim().toLowerCase() === filter;
}

function getLocationText(item: Partial<TrendCandidate | Recommendation>) {
  const locationValue = item.location;
  if (typeof locationValue === "string" && locationValue.trim()) {
    return locationValue.trim();
  }

  if (locationValue && typeof locationValue === "object") {
    const objectLocation = locationValue as { city?: string | null; country?: string | null };
    const combined = [objectLocation.city, objectLocation.country].filter(Boolean).join(", ");
    if (combined) {
      return combined;
    }
  }

  return item.location_city ?? item.location_country ?? null;
}

function getGeoCoordinates(item: Partial<TrendCandidate | Recommendation>) {
  const lat = "lat" in item ? item.lat ?? item.latitude ?? null : item.latitude ?? null;
  const lng = "lng" in item ? item.lng ?? item.longitude ?? null : item.longitude ?? null;

  return {
    lat,
    lng
  };
}

function hasReviewedGeo(item: Partial<TrendCandidate | Recommendation>) {
  const { lat, lng } = getGeoCoordinates(item);
  return lat != null && lng != null && !("geo_needs_review" in item && item.geo_needs_review === true);
}

function validatePoiDraftGeo(draft: PoiDraft) {
  const lat = draft.lat || draft.latitude;
  const lng = draft.lng || draft.longitude;

  if (!lat.trim() && !lng.trim()) {
    return null;
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    return "Latitude must be between -90 and 90.";
  }

  if (!Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    return "Longitude must be between -180 and 180.";
  }

  return null;
}

function extractTopValues(values: Array<string | null | undefined>, limit = 6) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])
  ).slice(0, limit);
}

function createEmptyGuideSlots(): GuideSlot[] {
  return GUIDE_SECTIONS.flatMap((section) =>
    section.positions.map((position) => ({
      sectionKey: section.key,
      sectionLabel: section.title,
      position,
      poi: null,
      note: ""
    }))
  );
}

function hydrateGuideSlots(
  guide: Recommendation | null,
  poiItems: Recommendation[]
): GuideSlot[] {
  const slots = createEmptyGuideSlots();

  for (const link of guide?.features_poi ?? []) {
    const slot = slots.find((item) => item.position === (link.position ?? 0));
    if (!slot || !link._key) {
      continue;
    }

    const poi =
      poiItems.find((item) => item._key === link._key) ??
      ({
        _key: link._key,
        name: link.name,
        content_type: "travel_poi",
        category: "travel",
        poi_type: link.poi_type ?? null,
        image_url: link.image_url ?? null,
        location_city: link.location_city ?? null,
        location_country: link.location_country ?? null,
        price_indicator: link.price_indicator ?? null
      } as Recommendation);

    slot.poi = poi;
    slot.note = link.note ?? "";
  }

  return slots;
}

function buildGuidePoiInputs(slots: GuideSlot[]): GuidePoiInput[] {
  return slots
    .filter((slot) => slot.poi?._key)
    .map((slot) => ({
      poi_key: slot.poi!._key,
      position: slot.position,
      section_label: slot.sectionLabel,
      note: slot.note.trim() || null
    }));
}

function getSectionByKey(sectionKey: GuideSectionKey) {
  return GUIDE_SECTIONS.find((section) => section.key === sectionKey)!;
}

function getBadgeClasses(badge: string, tone: "default" | "teal") {
  const normalizedBadge = badge.trim().toLowerCase();

  if (tone === "teal" || normalizedBadge === "approved") {
    return "border border-[var(--approved-green)] bg-[var(--approved-bg)] text-[var(--approved-text)]";
  }

  if (normalizedBadge === "rejected") {
    return "border border-[var(--rejected-red)] bg-[var(--rejected-bg)] text-[var(--rejected-text)]";
  }

  if (normalizedBadge === "pending") {
    return "border border-[var(--sand-300)] bg-[var(--sand-200)] text-[var(--sand-900)]";
  }

  return "border border-[#0a0a0a] bg-[#0a0a0a] text-[#fafaf8]";
}

function missingGuideSections(slots: GuideSlot[]) {
  return GUIDE_SECTIONS.filter(
    (section) => slots.filter((slot) => slot.sectionKey === section.key && slot.poi?._key).length < 3
  ).map((section) => section.title);
}

export function TravelHubApp() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TravelTab>("incoming");
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [draftQuotesCount, setDraftQuotesCount] = useState<number | null>(null);
  const [draftBookingsCount, setDraftBookingsCount] = useState<number | null>(null);
  const [incomingSearch, setIncomingSearch] = useState("");
  const [poiSearch, setPoiSearch] = useState("");
  const [guideSearch, setGuideSearch] = useState("");
  const [incomingPoiTypeFilter, setIncomingPoiTypeFilter] = useState<string | null>(null);
  const [incomingSourceFilter, setIncomingSourceFilter] = useState<string | null>(null);
  const [poiTypeFilter, setPoiTypeFilter] = useState<string | null>(null);
  const [poiPlaceFilter, setPoiPlaceFilter] = useState<string | null>(null);
  const [poiTagFilter, setPoiTagFilter] = useState<string | null>(null);
  const deferredIncomingSearch = useDeferredValue(incomingSearch);
  const deferredPoiSearch = useDeferredValue(poiSearch);
  const deferredGuideSearch = useDeferredValue(guideSearch);

  const [incomingModal, setIncomingModal] = useState<TrendCandidate | null>(null);
  const [poiModal, setPoiModal] = useState<Recommendation | null>(null);
  const [guideModal, setGuideModal] = useState<Recommendation | null>(null);
  const [poiPickerSlot, setPoiPickerSlot] = useState<number | null>(null);
  const [poiPickerSearch, setPoiPickerSearch] = useState("");
  const [poiPickerShowAll, setPoiPickerShowAll] = useState(false);
  const [showManualPoiModal, setShowManualPoiModal] = useState(false);
  const [incomingDraft, setIncomingDraft] = useState<PoiDraft>(emptyPoiDraft);
  const [poiDraft, setPoiDraft] = useState<PoiDraft>(emptyPoiDraft);
  const [manualPoiDraft, setManualPoiDraft] = useState<PoiDraft>(emptyPoiDraft);
  const [guideDraft, setGuideDraft] = useState<GuideDraft>(emptyGuideDraft);
  const [guideSlots, setGuideSlots] = useState<GuideSlot[]>(createEmptyGuideSlots);
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const incomingQuery = useQuery({
    queryKey: ["incoming-travel", deferredIncomingSearch],
    queryFn: () => fetchIncoming(deferredIncomingSearch),
    placeholderData: keepPreviousData
  });

  const poiQuery = useQuery({
    queryKey: ["travel-pois", deferredPoiSearch, poiTypeFilter],
    queryFn: () => fetchPois(deferredPoiSearch, poiTypeFilter ?? ""),
    placeholderData: keepPreviousData
  });

  const guidesQuery = useQuery({
    queryKey: ["travel-guides", deferredGuideSearch],
    queryFn: () => fetchGuides(deferredGuideSearch),
    placeholderData: keepPreviousData
  });

  const guidePoiQuery = useQuery({
    queryKey: ["guide-picker-pois"],
    queryFn: () => fetchPois("", ""),
    placeholderData: keepPreviousData
  });

  const incomingItems = useMemo(
    () => incomingQuery.data?.data ?? EMPTY_INCOMING,
    [incomingQuery.data?.data]
  );
  const poiItems = useMemo(
    () => poiQuery.data?.data ?? EMPTY_RECOMMENDATIONS,
    [poiQuery.data?.data]
  );
  const guideItems = useMemo(
    () => guidesQuery.data?.data ?? EMPTY_RECOMMENDATIONS,
    [guidesQuery.data?.data]
  );
  const guidePoiItems = useMemo(
    () => guidePoiQuery.data?.data ?? EMPTY_RECOMMENDATIONS,
    [guidePoiQuery.data?.data]
  );

  useEffect(() => {
    const fetchDraftCounts = async () => {
      try {
        const quotes = await pb.collection("blckbx_quotes").getList(1, 1, {
          filter: 'status = "draft"',
          requestKey: null,
        });
        setDraftQuotesCount(quotes.totalItems);
      } catch {
        setDraftQuotesCount(0);
      }

      try {
        const bookings = await pb.collection("blckbx_bookings").getList(1, 1, {
          filter: 'status = "draft"',
          requestKey: null,
        });
        setDraftBookingsCount(bookings.totalItems);
      } catch {
        setDraftBookingsCount(0);
      }
    };

    fetchDraftCounts();
  }, [activeTab]);

  useEffect(() => {
    setIncomingDraft(poiToDraft(incomingModal));
  }, [incomingModal]);

  useEffect(() => {
    setPoiDraft(poiToDraft(poiModal));
  }, [poiModal]);

  useEffect(() => {
    setGuideDraft(guideToDraft(guideModal));
    setGuideSlots(hydrateGuideSlots(guideModal, guidePoiItems));
    setPoiPickerSlot(null);
    setPoiPickerSearch("");
    setPoiPickerShowAll(false);
  }, [guideModal, guidePoiItems]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const handle = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(handle);
  }, [toast]);

  const filteredIncoming = useMemo(
    () =>
      incomingItems.filter((item) => {
        const poiTypeMatch = matchesPoiTypeFilter(item.poi_type, incomingPoiTypeFilter);
        const sourceMatch = !incomingSourceFilter || normaliseLabel(item.source_name) === incomingSourceFilter;
        return poiTypeMatch && sourceMatch;
      }),
    [incomingItems, incomingPoiTypeFilter, incomingSourceFilter]
  );

  const filteredPois = useMemo(
    () =>
      poiItems.filter((item) => {
        const place = getLocationText(item);
        const tagList = item.resolved_tags ?? [];
        const typeMatch = matchesPoiTypeFilter(item.poi_type, poiTypeFilter);
        const placeMatch = !poiPlaceFilter || normaliseLabel(place) === poiPlaceFilter;
        const tagMatch = !poiTagFilter || tagList.includes(poiTagFilter);
        return typeMatch && placeMatch && tagMatch;
      }),
    [poiItems, poiPlaceFilter, poiTagFilter, poiTypeFilter]
  );

  const selectedGuidePoiKeys = useMemo(
    () => guideSlots.map((slot) => slot.poi?._key).filter(Boolean) as string[],
    [guideSlots]
  );
  const activePickerSlot = useMemo(
    () => guideSlots.find((slot) => slot.position === poiPickerSlot) ?? null,
    [guideSlots, poiPickerSlot]
  );
  const availablePoiOptions = useMemo(() => {
    const search = poiPickerSearch.trim().toLowerCase();
    const suggestedTypes: string[] = activePickerSlot
      ? [...getSectionByKey(activePickerSlot.sectionKey).defaultTypes]
      : [];

    return guidePoiItems.filter((item) => {
      const isAlreadyInGuide =
        selectedGuidePoiKeys.includes(item._key) && item._key !== activePickerSlot?.poi?._key;

      if (isAlreadyInGuide) {
        return true;
      }

      if (!poiPickerShowAll && suggestedTypes.length) {
        const currentType = (item.poi_type ?? "").toLowerCase();
        if (currentType && !suggestedTypes.includes(currentType)) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      const searchText = [item.name, item.location_city, item.location_country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(search);
    });
  }, [activePickerSlot, guidePoiItems, poiPickerSearch, poiPickerShowAll, selectedGuidePoiKeys]);

  const incomingSources = useMemo(
    () => extractTopValues(incomingItems.map((item) => item.source_name)),
    [incomingItems]
  );
  const poiPlaces = useMemo(
    () => extractTopValues(poiItems.map((item) => getLocationText(item))),
    [poiItems]
  );
  const poiTags = useMemo(
    () => extractTopValues(poiItems.flatMap((item) => item.resolved_tags ?? [])),
    [poiItems]
  );

  function invalidateAll() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["incoming-travel"] }),
      queryClient.invalidateQueries({ queryKey: ["travel-pois"] }),
      queryClient.invalidateQueries({ queryKey: ["travel-guides"] })
    ]);
  }

  const saveIncomingMutation = useMutation({
    mutationFn: ({ key, draft }: { key: string; draft: PoiDraft }) => updateIncoming(key, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["incoming-travel"] });
      setToast({ tone: "success", message: "Incoming item updated." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  const rejectIncomingMutation = useMutation({
    mutationFn: (key: string) => rejectIncoming(key),
    onSuccess: async () => {
      await invalidateAll();
      setIncomingModal(null);
      setToast({ tone: "success", message: "Candidate rejected." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  const promoteIncomingMutation = useMutation({
    mutationFn: (key: string) => promoteIncoming(key),
    onSuccess: async () => {
      await invalidateAll();
      setIncomingModal(null);
      setActiveTab("poi-library");
      setToast({ tone: "success", message: "Promoted to POI." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  const createPoiMutation = useMutation({
    mutationFn: (draft: PoiDraft) => createPoi(draft),
    onSuccess: async (poi) => {
      await queryClient.invalidateQueries({ queryKey: ["travel-pois"] });
      setShowManualPoiModal(false);
      setManualPoiDraft(emptyPoiDraft());
      setPoiModal(poi);
      setToast({ tone: "success", message: "POI created." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  const updatePoiMutation = useMutation({
    mutationFn: ({ key, draft }: { key: string; draft: PoiDraft }) => updatePoi(key, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["travel-pois"] });
      setToast({ tone: "success", message: "POI saved." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  function submitIncomingDraft() {
    const geoError = validatePoiDraftGeo(incomingDraft);
    if (geoError) {
      setToast({ tone: "error", message: geoError });
      return;
    }

    if (!incomingModal) {
      return;
    }

    saveIncomingMutation.mutate({ key: incomingModal._key, draft: incomingDraft });
  }

  function submitManualPoiDraft() {
    const geoError = validatePoiDraftGeo(manualPoiDraft);
    if (geoError) {
      setToast({ tone: "error", message: geoError });
      return;
    }

    createPoiMutation.mutate(manualPoiDraft);
  }

  function submitPoiDraft() {
    const geoError = validatePoiDraftGeo(poiDraft);
    if (geoError) {
      setToast({ tone: "error", message: geoError });
      return;
    }

    if (!poiModal) {
      return;
    }

    updatePoiMutation.mutate({ key: poiModal._key, draft: poiDraft });
  }

  const createGuideMutation = useMutation({
    mutationFn: ({
      draft,
      slots,
      curationStatus
    }: {
      draft: GuideDraft;
      slots: GuideSlot[];
      curationStatus?: "draft" | "pending";
    }) => createGuide(draft, buildGuidePoiInputs(slots), curationStatus),
    onSuccess: async (guide, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["travel-guides"] });
      setGuideModal({
        ...guide,
        features_poi: variables.slots
          .filter((slot) => slot.poi)
          .map((slot) => ({
            _key: slot.poi!._key,
            name: slot.poi!.name,
            poi_type: slot.poi!.poi_type,
            position: slot.position,
            section_label: slot.sectionLabel,
            note: slot.note || null,
            image_url: cardImage(slot.poi!),
            location_city: slot.poi!.location_city ?? null,
            location_country: slot.poi!.location_country ?? null,
            price_indicator: slot.poi!.price_indicator ?? null
          }))
      });
      setToast({ tone: "success", message: "Guide created." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  const updateGuideMutation = useMutation({
    mutationFn: async ({
      key,
      draft,
      slots,
      curationStatus
    }: {
      key: string;
      draft: GuideDraft;
      slots: GuideSlot[];
      curationStatus?: "draft" | "pending" | "approved" | "rejected";
    }) => {
      const desired = buildGuidePoiInputs(slots);
      const current = guideModal?.features_poi ?? [];

      await updateGuide(key, draft, curationStatus);

      const desiredKeys = new Set(desired.map((item) => item.poi_key));
      const currentKeys = new Set(current.map((item) => item._key).filter(Boolean) as string[]);

      await Promise.all(
        current
          .filter((item) => item._key && !desiredKeys.has(item._key))
          .map((item) => removePoiFromGuide(key, item._key!))
      );

      await Promise.all(
        desired.map((item) =>
          currentKeys.has(item.poi_key)
            ? updateGuidePoi(key, item.poi_key, {
                position: item.position,
                section_label: item.section_label,
                note: item.note ?? null
              })
            : addPoiToGuide(
                key,
                item.poi_key,
                item.position,
                item.section_label,
                item.note ?? undefined
              )
        )
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["travel-guides"] });
      setGuideModal((current) =>
        current
          ? {
              ...current,
              name: variables.draft.name,
              description: variables.draft.description,
              destination: variables.draft.destination,
              subcategory: variables.draft.subcategory,
              hero_image_url: variables.draft.hero_image_url,
              hero_video_url: variables.draft.hero_video_url,
              travel_assistant_note: variables.draft.travel_assistant_note,
              body: variables.draft.body,
              cover_images: variables.draft.cover_images
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              seasonal_tags: variables.draft.seasonal_tags
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              curation_status: variables.curationStatus ?? current.curation_status,
              features_poi: variables.slots
                .filter((slot) => slot.poi)
                .map((slot) => ({
                  _key: slot.poi!._key,
                  name: slot.poi!.name,
                  poi_type: slot.poi!.poi_type,
                  position: slot.position,
                  section_label: slot.sectionLabel,
                  note: slot.note || null,
                  image_url: cardImage(slot.poi!),
                  location_city: slot.poi!.location_city ?? null,
                  location_country: slot.poi!.location_country ?? null,
                  price_indicator: slot.poi!.price_indicator ?? null
                }))
            }
          : current
      );
      setToast({ tone: "success", message: "Guide updated." });
    },
    onError: (error: Error) => setToast({ tone: "error", message: error.message })
  });

  function updateGuideSlot(position: number, updates: Partial<GuideSlot>) {
    setGuideSlots((current) =>
      current.map((slot) => (slot.position === position ? { ...slot, ...updates } : slot))
    );
  }

  function reorderGuideSection(sectionKey: GuideSectionKey, fromPosition: number, toPosition: number) {
    setGuideSlots((current) => {
      const otherSlots = current.filter((slot) => slot.sectionKey !== sectionKey);
      const section = current
        .filter((slot) => slot.sectionKey === sectionKey)
        .sort((left, right) => left.position - right.position);
      const fromIndex = section.findIndex((slot) => slot.position === fromPosition);
      const toIndex = section.findIndex((slot) => slot.position === toPosition);

      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }

      const reordered = [...section];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      const reassigned = reordered.map((slot, index) => ({
        ...slot,
        position: getSectionByKey(sectionKey).positions[index]
      }));

      return [...otherSlots, ...reassigned].sort((left, right) => left.position - right.position);
    });
  }

  async function handleGuideSave(curationStatus: "draft" | "pending" = "draft") {
    const missingSections = missingGuideSections(guideSlots);
    if (
      curationStatus === "pending" &&
      missingSections.length &&
      !window.confirm(
        `This guide has empty slots in ${missingSections.join(", ")}. Send anyway?`
      )
    ) {
      return;
    }

    if (guideModal?._key) {
      await updateGuideMutation.mutateAsync({
        key: guideModal._key,
        draft: guideDraft,
        slots: guideSlots,
        curationStatus
      });
      return;
    }

    await createGuideMutation.mutateAsync({
      draft: guideDraft,
      slots: guideSlots,
      curationStatus
    });
  }

  return (
    <main className="min-h-screen bg-[var(--sand-200)] px-4 py-5 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1380px]">
        <header className="bb-panel p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl leading-none text-[var(--black)] md:text-6xl">
                Travel Hub
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sand-900)] md:text-lg">
                Review incoming travel leads, shape them into reusable POIs, and build guides for approval.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard label="Incoming Queue" value={incomingQuery.data?.pagination.total ?? 0} />
              <StatCard label="POI Library" value={poiQuery.data?.pagination.total ?? 0} />
              <StatCard label="Guides" value={guidesQuery.data?.pagination.total ?? 0} />
              <StatCard label="Draft Quotes" value={draftQuotesCount ?? "–"} />
              <StatCard label="Draft Bookings" value={draftBookingsCount ?? "–"} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setActiveQuoteId(null);
                }}
                className={`border px-4 py-2 text-sm font-medium uppercase tracking-[0.08em] transition ${
                  activeTab === tab.key
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-[#fafaf8]"
                    : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--black)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="bb-panel mt-5 p-5 md:p-6">
          {activeTab === "incoming" ? (
            <>
              <SectionHeader
                title="Incoming"
                description="Scraped travel items awaiting review. Card grid with promote and reject actions."
                ctaLabel="Add Manual POI"
                onCta={() => setShowManualPoiModal(true)}
              />
              <SearchRow
                value={incomingSearch}
                onChange={setIncomingSearch}
                placeholder="Search by name, city, or country"
              />
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {POI_TYPE_PILLS.map((pill) => (
                  <FilterPill
                    key={pill.label}
                    active={incomingPoiTypeFilter === pill.value}
                    onClick={() => setIncomingPoiTypeFilter(pill.value)}
                    label={pill.label}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterPill
                  active={!incomingSourceFilter}
                  onClick={() => setIncomingSourceFilter(null)}
                  label="All Sources"
                />
                {incomingSources.map((value) => (
                  <FilterPill
                    key={value}
                    active={incomingSourceFilter === value}
                    onClick={() => setIncomingSourceFilter(value)}
                    label={value}
                  />
                ))}
              </div>
              <CardGrid>
                {filteredIncoming.map((item) => (
                  <TravelCard
                    key={item._key}
                    title={item.name}
                    subtitle={item.source_name ?? "Travel lead"}
                    meta={getLocationText(item) ?? "Location pending"}
                    badge={normaliseLabel(item.poi_type)}
                    image={cardImage(item)}
                    footer={formatDate(item.created_at)}
                    onClick={() => setIncomingModal(item)}
                  />
                ))}
              </CardGrid>
            </>
          ) : null}

          {activeTab === "poi-library" ? (
            <>
              <SectionHeader
                title="POI Library"
                description="Browse, search, and refine saved travel POIs."
              />
              <SearchRow
                value={poiSearch}
                onChange={setPoiSearch}
                placeholder="Search name, city, or country"
              />
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {POI_TYPE_PILLS.map((pill) => (
                  <FilterPill
                    key={pill.label}
                    active={poiTypeFilter === pill.value}
                    onClick={() => setPoiTypeFilter(pill.value)}
                    label={pill.label}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterPill
                  active={!poiPlaceFilter}
                  onClick={() => setPoiPlaceFilter(null)}
                  label="All Cities / Countries"
                />
                {poiPlaces.map((value) => (
                  <FilterPill
                    key={value}
                    active={poiPlaceFilter === value}
                    onClick={() => setPoiPlaceFilter(value)}
                    label={value}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <FilterPill
                  active={!poiTagFilter}
                  onClick={() => setPoiTagFilter(null)}
                  label="All Tags"
                />
                {poiTags.map((value) => (
                  <FilterPill
                    key={value}
                    active={poiTagFilter === value}
                    onClick={() => setPoiTagFilter(value)}
                    label={value}
                  />
                ))}
              </div>
              <CardGrid>
                {filteredPois.map((item) => (
                  <TravelCard
                    key={item._key}
                    title={item.name}
                    subtitle={getLocationText(item) ?? "Travel POI"}
                    meta={item.destination ?? "Travel"}
                    badge={normaliseLabel(item.poi_type)}
                    image={cardImage(item)}
                    footer={item.resolved_tags?.slice(0, 2).join(" · ") || "Open to edit"}
                    locationIndicator={{
                      reviewed: hasReviewedGeo(item),
                      tooltip:
                        item.geo_place_name?.trim() || (item.geo_needs_review ? "Location needs review" : "Location needs review")
                    }}
                    onClick={() => setPoiModal(item)}
                  />
                ))}
              </CardGrid>
            </>
          ) : null}

          {activeTab === "guides" ? (
            <>
              <SectionHeader
                title="Guides"
                description="Create and edit guides, then attach reusable POIs."
                ctaLabel="Create New Guide"
                onCta={() => setGuideModal({ _key: "", name: "", content_type: "guide", category: "travel" })}
              />
              <SearchRow
                value={guideSearch}
                onChange={setGuideSearch}
                placeholder="Search title or destination"
              />
              <CardGrid>
                {guideItems.map((item) => (
                  <TravelCard
                    key={item._key}
                    title={item.name}
                    subtitle={item.destination ?? "Destination pending"}
                    meta={`${item.features_poi?.length ?? 0} POIs`}
                    badge={item.curation_status ?? "draft"}
                    image={cardImage(item)}
                    footer="Open guide builder"
                    onClick={() => setGuideModal(item)}
                    badgeTone="teal"
                  />
                ))}
              </CardGrid>
            </>
          ) : null}

          {activeTab === "quotes" ? (
            <div className="tools-app-styles">
              {activeQuoteId ? (
                <QuoteGenerator
                  embeddedQuoteId={activeQuoteId}
                  onBack={() => setActiveQuoteId(null)}
                />
              ) : (
                <QuotesList
                  onSelect={(id) => setActiveQuoteId(id)}
                  onNew={() => setActiveQuoteId("new")}
                />
              )}
            </div>
          ) : null}

          {activeTab === "insurance-checker" ? (
            <div className="bb-panel-soft p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sand-900)]">
                Coming Soon
              </div>
              <h2 className="mt-3 text-4xl leading-none text-[var(--black)]">
                Insurance Checker
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sand-900)]">
                Check whether a client&apos;s travel insurance covers their holiday type.
              </p>
            </div>
          ) : null}

          {activeTab === "bookings" ? (
            <div className="tools-app-styles">
              <Bookings />
            </div>
          ) : null}
        </section>
      </div>

      {incomingModal ? (
        <ModalShell title={incomingModal.name} onClose={() => setIncomingModal(null)}>
          <PoiForm draft={incomingDraft} onChange={setIncomingDraft} />
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton
              label="Save Changes"
              onClick={submitIncomingDraft}
              busy={saveIncomingMutation.isPending}
            />
            <SecondaryButton
              label={promoteIncomingMutation.isPending ? "Promoting..." : "Promote to POI"}
              onClick={() => promoteIncomingMutation.mutate(incomingModal._key)}
            />
            <SecondaryButton
              label={rejectIncomingMutation.isPending ? "Rejecting..." : "Reject"}
              onClick={() => rejectIncomingMutation.mutate(incomingModal._key)}
              tone="danger"
            />
          </div>
        </ModalShell>
      ) : null}

      {poiModal ? (
        <ModalShell title={poiModal.name} onClose={() => setPoiModal(null)}>
          <PoiForm draft={poiDraft} onChange={setPoiDraft} />
          <div className="mt-5">
            <PrimaryButton
              label="Save POI"
              onClick={submitPoiDraft}
              busy={updatePoiMutation.isPending}
            />
          </div>
        </ModalShell>
      ) : null}

      {showManualPoiModal ? (
        <ModalShell title="Add Manual POI" onClose={() => setShowManualPoiModal(false)}>
          <PoiForm draft={manualPoiDraft} onChange={setManualPoiDraft} />
          <div className="mt-5">
            <PrimaryButton
              label="Create POI"
              onClick={submitManualPoiDraft}
              busy={createPoiMutation.isPending}
            />
          </div>
        </ModalShell>
      ) : null}

      {guideModal ? (
        <ModalShell
          title={guideModal._key ? guideModal.name : "Create New Guide"}
          onClose={() => setGuideModal(null)}
          size="xl"
        >
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <GuideForm draft={guideDraft} onChange={setGuideDraft} />
              <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryButton
                  label={guideModal._key ? "Save Guide" : "Create Guide"}
                  onClick={() => void handleGuideSave("draft")}
                  busy={createGuideMutation.isPending || updateGuideMutation.isPending}
                />
                <SecondaryButton
                  label="Send to Approval"
                  onClick={() => void handleGuideSave("pending")}
                />
              </div>

              <div className="mt-8">
                {GUIDE_SECTIONS.map((section) => (
                  <StructuredGuideSection
                    key={section.key}
                    title={section.title}
                    slots={guideSlots
                      .filter((slot) => slot.sectionKey === section.key)
                      .sort((left, right) => left.position - right.position)}
                    suggestionLabel={section.suggestionLabel}
                    onAdd={(position) => {
                      setPoiPickerSlot(position);
                      setPoiPickerSearch("");
                      setPoiPickerShowAll(false);
                    }}
                    onRemove={(position) => updateGuideSlot(position, { poi: null, note: "" })}
                    onNoteChange={(position, note) => updateGuideSlot(position, { note })}
                    onReorder={(fromPosition, toPosition) =>
                      reorderGuideSection(section.key, fromPosition, toPosition)
                    }
                  />
                ))}
              </div>
            </div>

            <aside className="bb-panel-soft p-4">
              <h3 className="text-2xl text-[var(--black)]">Guide Pattern</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--sand-900)]">
                Each guide follows a 3+3+3 structure: three stays, three eats, and three things to do.
                Empty slots are allowed while drafting.
              </p>
              <div className="mt-5 space-y-3">
                {GUIDE_SECTIONS.map((section) => (
                  <div
                    key={section.key}
                    className="bb-card px-4 py-3"
                  >
                    <div className="font-semibold text-[var(--black)]">{section.title}</div>
                    <div className="mt-1 text-sm text-[var(--sand-900)]">
                      Suggested: {section.defaultTypes.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </ModalShell>
      ) : null}

      {guideModal && activePickerSlot ? (
        <ModalShell
          title={`Add to ${activePickerSlot.sectionLabel}`}
          onClose={() => setPoiPickerSlot(null)}
          size="lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={poiPickerSearch}
              onChange={(event) => setPoiPickerSearch(event.target.value)}
              placeholder="Search name, city, or country"
              className="min-w-[280px] flex-1 border border-[var(--sand-300)] bg-[var(--white)] px-4 py-3"
            />
            <button
              type="button"
              onClick={() => setPoiPickerShowAll((current) => !current)}
              className={`border px-4 py-3 text-sm font-medium ${
                poiPickerShowAll
                  ? "border-[#0a0a0a] bg-[#0a0a0a] text-[#fafaf8]"
                  : "border-[var(--sand-300)] bg-[var(--white)] text-[var(--black)]"
              }`}
            >
              {poiPickerShowAll ? "Suggested types only" : "Show all"}
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {availablePoiOptions.map((poi) => (
              <PoiPickerCard
                key={poi._key}
                poi={poi}
                disabled={
                  selectedGuidePoiKeys.includes(poi._key) && poi._key !== activePickerSlot.poi?._key
                }
                onSelect={() => {
                  updateGuideSlot(activePickerSlot.position, { poi });
                  setPoiPickerSlot(null);
                }}
              />
            ))}
          </div>
        </ModalShell>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-5 right-5 border px-4 py-3 text-sm font-semibold ${
            toast.tone === "success"
              ? "border-[#0a0a0a] bg-[#0a0a0a] text-[#fafaf8]"
              : "border-[var(--rejected-red)] bg-[var(--rejected-bg)] text-[var(--rejected-text)]"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

function SectionHeader({
  title,
  description,
  ctaLabel,
  onCta
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl leading-none text-[var(--black)]">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--sand-900)]">{description}</p>
      </div>
      {ctaLabel && onCta ? (
        <button
          type="button"
          onClick={onCta}
          className="border border-[var(--black)] bg-[var(--black)] px-5 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)]"
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  );
}

function SearchRow({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full border border-[var(--sand-300)] bg-[var(--white)] px-4 py-3"
    />
  );
}

function FilterPill({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 border px-4 py-2 text-sm font-normal transition ${
        active
          ? "border-[#0a0a0a] bg-[#0a0a0a] text-[#fafaf8]"
          : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--black)]"
      }`}
    >
      {label}
    </button>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function TravelCard({
  title,
  subtitle,
  meta,
  badge,
  image,
  footer,
  locationIndicator,
  onClick,
  badgeTone = "default"
}: {
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  image?: string;
  footer: string;
  locationIndicator?: {
    reviewed: boolean;
    tooltip: string;
  };
  onClick: () => void;
  badgeTone?: "default" | "teal";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bb-card overflow-hidden text-left"
    >
      <div className="relative h-56 bg-[var(--sand-200)]">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold text-[var(--black)]">{title}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-[var(--sand-900)]">
              <span className="truncate">{subtitle}</span>
              {locationIndicator ? (
                <span
                  title={locationIndicator.tooltip}
                  className="inline-flex shrink-0 items-center gap-1 border border-[var(--sand-300)] bg-[var(--sand-100)] px-2 py-1 text-[11px] font-medium text-[var(--sand-900)]"
                >
                  <MapPinIcon />
                  <span
                    className={`h-2 w-2 ${
                      locationIndicator.reviewed ? "bg-[#1EA868]" : "bg-[#E7A817]"
                    }`}
                  />
                </span>
              ) : null}
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${getBadgeClasses(badge, badgeTone)}`}>
            {badge}
          </span>
        </div>
        <div className="mt-4 text-sm text-[var(--sand-900)]">{meta}</div>
        <div className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--sand-400)]">{footer}</div>
      </div>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bb-panel-soft px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--sand-900)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--black)]">{value}</div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[14px] w-[14px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  size = "lg"
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "lg" | "xl";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(10,10,10,0.4)] px-4 py-8 md:items-center">
      <div
        className={`max-h-[90vh] w-full overflow-auto border border-[var(--sand-300)] bg-[var(--white)] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.12)] md:p-6 ${
          size === "xl" ? "max-w-[1180px]" : "max-w-[820px]"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-4xl leading-none text-[var(--black)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--sand-300)] bg-[var(--white)] px-4 py-2 text-sm font-medium text-[var(--black)] hover:border-[var(--black)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PoiForm({
  draft,
  onChange
}: {
  draft: PoiDraft;
  onChange: (next: PoiDraft) => void;
}) {
  function patch<K extends keyof PoiDraft>(key: K, value: PoiDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Name">
        <input value={draft.name} onChange={(event) => patch("name", event.target.value)} />
      </Field>
      <Field label="POI Type">
        <input value={draft.poi_type} onChange={(event) => patch("poi_type", event.target.value)} />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea value={draft.description} onChange={(event) => patch("description", event.target.value)} />
      </Field>
      <Field label="Location summary">
        <input value={draft.location} onChange={(event) => patch("location", event.target.value)} />
      </Field>
      <Field label="Address">
        <input value={draft.location_address} onChange={(event) => patch("location_address", event.target.value)} />
      </Field>
      <Field label="City">
        <input value={draft.location_city} onChange={(event) => patch("location_city", event.target.value)} />
      </Field>
      <Field label="Country">
        <input value={draft.location_country} onChange={(event) => patch("location_country", event.target.value)} />
      </Field>
      {draft.geo_needs_review ? (
        <div className="md:col-span-2 border border-[var(--sand-300)] bg-[var(--sand-100)] px-4 py-3 text-sm text-[var(--sand-900)]">
          Location needs review. Add coordinates to confirm this POI on the map.
        </div>
      ) : null}
      {(draft.lat || draft.latitude) && (draft.lng || draft.longitude) ? (
        <div className="md:col-span-2 border border-[var(--sand-300)] bg-[var(--sand-100)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--black)]">
            Current coordinates: {draft.lat || draft.latitude}, {draft.lng || draft.longitude}
          </div>
          <div className="mt-1 text-xs text-[var(--sand-900)]">
            Source: {draft.geo_source || "manual"}
            {draft.geo_place_name ? ` · ${draft.geo_place_name}` : ""}
          </div>
        </div>
      ) : null}
      <div className="md:col-span-2">
        <div className="grid gap-3 md:grid-cols-[180px_180px]">
          <Field label="Lat">
            <input value={draft.lat} onChange={(event) => patch("lat", event.target.value)} />
          </Field>
          <Field label="Lng">
            <input value={draft.lng} onChange={(event) => patch("lng", event.target.value)} />
          </Field>
        </div>
        <div className="mt-2 text-xs text-[var(--sand-900)]">
          Tip: Latitude must be between -90 and 90. Longitude must be between -180 and 180.
        </div>
      </div>
      <Field label="Image URLs" className="md:col-span-2">
        <textarea value={draft.images} onChange={(event) => patch("images", event.target.value)} />
      </Field>
      <Field label="Website">
        <input value={draft.website_url} onChange={(event) => patch("website_url", event.target.value)} />
      </Field>
      <Field label="Booking URL">
        <input value={draft.booking_url} onChange={(event) => patch("booking_url", event.target.value)} />
      </Field>
      <Field label="Phone">
        <input value={draft.contact_phone} onChange={(event) => patch("contact_phone", event.target.value)} />
      </Field>
      <Field label="Email">
        <input value={draft.contact_email} onChange={(event) => patch("contact_email", event.target.value)} />
      </Field>
      <Field label="Price Indicator">
        <select
          value={draft.price_indicator}
          onChange={(event) => patch("price_indicator", event.target.value as PoiDraft["price_indicator"])}
        >
          <option value="">Not set</option>
          <option value="£">£</option>
          <option value="££">££</option>
          <option value="£££">£££</option>
          <option value="££££">££££</option>
        </select>
      </Field>
      <Field label="Tags" className="md:col-span-2">
        <input value={draft.tags} onChange={(event) => patch("tags", event.target.value)} />
      </Field>
    </div>
  );
}

function GuideForm({
  draft,
  onChange
}: {
  draft: GuideDraft;
  onChange: (next: GuideDraft) => void;
}) {
  function patch<K extends keyof GuideDraft>(key: K, value: GuideDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Title">
        <input value={draft.name} onChange={(event) => patch("name", event.target.value)} />
      </Field>
      <Field label="Destination">
        <input value={draft.destination} onChange={(event) => patch("destination", event.target.value)} />
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea value={draft.description} onChange={(event) => patch("description", event.target.value)} />
      </Field>
      <Field label="Subcategory">
        <select value={draft.subcategory} onChange={(event) => patch("subcategory", event.target.value)}>
          <option value="destinations">Destinations</option>
          <option value="hotels_and_villas">Hotels & Villas</option>
          <option value="travel_experiences">Travel Experiences</option>
          <option value="retreats_and_wellness">Retreats & Wellness</option>
        </select>
      </Field>
      <Field label="Hero image URL">
        <input value={draft.hero_image_url} onChange={(event) => patch("hero_image_url", event.target.value)} />
      </Field>
      <Field label="Hero video URL">
        <input value={draft.hero_video_url} onChange={(event) => patch("hero_video_url", event.target.value)} />
      </Field>
      <Field label="Cover images">
        <input value={draft.cover_images} onChange={(event) => patch("cover_images", event.target.value)} />
      </Field>
      <Field label="Seasonal tags">
        <input value={draft.seasonal_tags} onChange={(event) => patch("seasonal_tags", event.target.value)} />
      </Field>
      <Field label="Tags">
        <input value={draft.tags} onChange={(event) => patch("tags", event.target.value)} />
      </Field>
      <Field label="Travel assistant note" className="md:col-span-2">
        <textarea value={draft.travel_assistant_note} onChange={(event) => patch("travel_assistant_note", event.target.value)} />
      </Field>
      <Field label="Editorial body" className="md:col-span-2">
        <textarea className="min-h-[220px]" value={draft.body} onChange={(event) => patch("body", event.target.value)} />
      </Field>
    </div>
  );
}

function StructuredGuideSection({
  title,
  slots,
  suggestionLabel,
  onAdd,
  onRemove,
  onNoteChange,
  onReorder
}: {
  title: string;
  slots: GuideSlot[];
  suggestionLabel: string;
  onAdd: (position: number) => void;
  onRemove: (position: number) => void;
  onNoteChange: (position: number, note: string) => void;
  onReorder: (fromPosition: number, toPosition: number) => void;
}) {
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null);

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h3 className="text-3xl leading-none text-[var(--black)]">{title}</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((slot) => (
          <div
            key={slot.position}
            draggable={Boolean(slot.poi)}
            onDragStart={() => setDraggedPosition(slot.position)}
            onDragOver={(event) => {
              if (draggedPosition) {
                event.preventDefault();
              }
            }}
            onDrop={() => {
              if (draggedPosition && draggedPosition !== slot.position) {
                onReorder(draggedPosition, slot.position);
              }
              setDraggedPosition(null);
            }}
            onDragEnd={() => setDraggedPosition(null)}
          >
            {slot.poi ? (
              <FilledGuideSlot
                slot={slot}
                onRemove={() => onRemove(slot.position)}
                onNoteChange={(note) => onNoteChange(slot.position, note)}
              />
            ) : (
              <EmptyGuideSlot
                label={`Add ${suggestionLabel}`}
                onClick={() => onAdd(slot.position)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyGuideSlot({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[320px] w-full flex-col items-center justify-center border border-dashed border-[var(--sand-300)] bg-[var(--sand-100)] p-5 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center border border-[var(--sand-300)] bg-[var(--white)] text-3xl text-[var(--black)]">
        +
      </div>
      <div className="mt-4 text-lg font-semibold text-[var(--black)]">{label}</div>
    </button>
  );
}

function FilledGuideSlot({
  slot,
  onRemove,
  onNoteChange
}: {
  slot: GuideSlot;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
}) {
  if (!slot.poi) {
    return null;
  }

  return (
    <div className="bb-card overflow-hidden">
      <div className="relative h-40 bg-[var(--sand-200)]">
        {cardImage(slot.poi) ? (
          <img src={cardImage(slot.poi)} alt={slot.poi.name} className="h-full w-full object-cover" />
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 border border-[var(--sand-300)] bg-[var(--white)] px-3 py-2 text-sm font-medium text-[var(--black)]"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-[var(--black)]">{slot.poi.name}</div>
            <div className="mt-1 text-sm text-[var(--sand-900)]">
              {slot.poi.location_city ?? slot.poi.location_country ?? "Location pending"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="border border-[var(--black)] bg-[var(--black)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--white)]">
              {normaliseLabel(slot.poi.poi_type)}
            </span>
            {slot.poi.price_indicator ? (
              <span className="text-sm font-semibold text-[var(--sand-900)]">
                {slot.poi.price_indicator}
              </span>
            ) : null}
          </div>
        </div>
        <textarea
          value={slot.note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Add a tip for this place..."
          className="mt-4 min-h-[92px] w-full"
        />
      </div>
    </div>
  );
}

function PoiPickerCard({
  poi,
  disabled,
  onSelect
}: {
  poi: Recommendation;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`border p-3 text-left ${
        disabled
          ? "cursor-not-allowed border-[var(--sand-300)] bg-[var(--sand-100)] opacity-70"
          : "bb-card"
      }`}
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden bg-[var(--sand-200)]">
          {cardImage(poi) ? (
            <img src={cardImage(poi)} alt={poi.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-[var(--black)]">{poi.name}</div>
              <div className="mt-1 text-sm text-[var(--sand-900)]">
                {poi.location_city ?? poi.location_country ?? "Location pending"}
              </div>
            </div>
            <span className="border border-[var(--black)] bg-[var(--black)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--white)]">
              {normaliseLabel(poi.poi_type)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(poi.endorsements ?? []).slice(0, 2).map((endorsement) => (
              <span
                key={`${endorsement.source}-${endorsement.award}-${endorsement.year}`}
                className="border border-[var(--sand-300)] bg-[var(--sand-100)] px-2 py-1 text-xs font-medium text-[var(--sand-900)]"
              >
                {endorsement.award}
              </span>
            ))}
            {disabled ? (
              <span className="border border-[var(--sand-300)] bg-[var(--sand-100)] px-2 py-1 text-xs font-medium text-[var(--sand-900)]">
                Already in guide
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function GuidePoiRow({
  poi,
  canRemove = false,
  onRemove
}: {
  poi: RecommendationPoiLink;
  canRemove?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="bb-card flex items-center gap-4 p-3">
      <div className="h-16 w-16 overflow-hidden bg-[var(--sand-200)]">
        {poi.image_url ? (
          <img src={poi.image_url} alt={poi.name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--black)]">{poi.name}</div>
        <div className="mt-1 text-sm text-[var(--sand-900)]">
          {poi.poi_type ?? "POI"} · {poi.location_city ?? poi.location_country ?? "Travel"}
        </div>
      </div>
      {canRemove && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="border border-[var(--sand-300)] bg-[var(--white)] px-4 py-2 text-sm font-medium text-[var(--black)] hover:border-[var(--black)]"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm text-[var(--sand-900)] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function PrimaryButton({
  label,
  onClick,
  busy
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="border border-[var(--black)] bg-[var(--black)] px-5 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)] disabled:opacity-60"
    >
      {busy ? "Working..." : label}
    </button>
  );
}

function SecondaryButton({
  label,
  onClick,
  tone = "default"
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-5 py-3 text-sm font-medium ${
        tone === "danger"
          ? "border-[var(--sand-300)] bg-[var(--white)] text-[var(--black)] hover:border-[var(--error)] hover:text-[var(--error)]"
          : "border-[var(--sand-300)] bg-[var(--white)] text-[var(--black)] hover:border-[var(--black)]"
      }`}
    >
      {label}
    </button>
  );
}
