import { memo, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type {
  AuditLogEntry,
  CatalogueItem,
  ContentTab,
  Endorsement,
  GeoMatchType,
  GeoSource,
  GridMode,
  ListOption,
  NewTagSuggestion,
  ProductCandidate,
  RecommendationCandidate,
  TrendCandidate
} from "../lib/types";
import {
  classNames,
  formatDate,
  formatAvailability,
  formatLocation,
  formatPrice,
  getPrimaryLink
} from "../lib/utils";

const rejectionPresetOptions = [
  { value: "not_premium", label: "Not premium enough" },
  { value: "wrong_category", label: "Wrong category" },
  { value: "duplicate", label: "Duplicate" },
  { value: "insufficient_info", label: "Insufficient information" },
  { value: "out_of_stock", label: "Out of stock" }
] as const;

const listTypeOptions = ["themed", "seasonal", "occasion", "editorial"] as const;
const occasionOptions = [
  "christmas",
  "valentines",
  "mothers_day",
  "fathers_day",
  "easter",
  "birthday",
  "anniversary",
  "wedding",
  "new_baby",
  "housewarming",
  "thank_you",
  "graduation",
  "retirement"
] as const;

type EditDraft = {
  imageUrl: string;
  name: string;
  brand: string;
  description: string;
  pricePence: string;
  priceText: string;
  category: string;
  contentType: string;
  location: string;
  confidence: string;
  candidateUrl: string;
  sourceUrl: string;
  sourceName: string;
  isBlckbxApproved: boolean;
  contentScope: "unique_request" | "general";
  tags: string[];
  tagsPendingReview: string[];
  tagsSuggested: string[];
  tagsNew: NewTagSuggestion[];
  endorsements: Endorsement[];
};

type GeoCandidate = TrendCandidate | RecommendationCandidate;

type GeoState = {
  lat?: number | null;
  lng?: number | null;
  geo_source?: GeoSource | null;
  geo_place_name?: string | null;
  geo_match_type?: GeoMatchType | null;
  geo_needs_review?: boolean | null;
};

const categoryOptions = ["shopping", "going_out", "staying_in", "gifting", "travel"] as const;
const contentTypeOptions = [
  "product",
  "venue",
  "travel",
  "guide",
  "experience",
  "entertainment",
  "recipe",
  "list"
] as const;
const confidenceOptions = ["high", "medium", "low"] as const;
const fieldClasses =
  "w-full border border-[var(--sand-300)] bg-white px-3 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--sand-500)] focus:border-[var(--black)]";
const readOnlyFieldClasses =
  "w-full border border-[var(--sand-300)] bg-[var(--sand-100)] px-3 py-3 text-sm text-[var(--sand-700)] outline-none";

function uniqueTags(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function buildSuggestedTags(
  tagsSuggested: string[] = [],
  tagsNew: NewTagSuggestion[] = []
) {
  return uniqueTags([...tagsSuggested, ...tagsNew.map((tag) => tag.slug)]);
}

function createEditDraft(candidate: CatalogueItem): EditDraft {
  const sourceUrl = candidate.source_url ?? "";
  return {
    imageUrl:
      candidate.collection === "product_candidates"
        ? candidate.image_url || candidate.primary_image || candidate.hero_image_url || ""
        : candidate.hero_image_url || candidate.cover_images?.[0] || "",
    name: candidate.name,
    brand: "brand" in candidate ? candidate.brand ?? "" : "",
    description: candidate.description ?? "",
    pricePence:
      "price_pence" in candidate && candidate.price_pence != null
        ? String(candidate.price_pence)
        : "",
    priceText: "price_text" in candidate ? candidate.price_text ?? "" : "",
    category:
      candidate.collection === "product_candidates" ? candidate.category ?? "shopping" : candidate.category ?? "",
    contentType: candidate.content_type ?? "",
    location: candidate.collection !== "product_candidates" ? candidate.location ?? "" : "",
    confidence: candidate.collection !== "product_candidates" ? candidate.confidence ?? "" : "",
    candidateUrl:
      candidate.collection === "product_candidates"
        ? candidate.product_url || candidate.candidate_url || candidate.resolved_url || ""
        : sourceUrl,
    sourceUrl,
    sourceName: candidate.source_name ?? "",
    isBlckbxApproved: candidate.is_blckbx_approved ?? false,
    contentScope: candidate.content_scope ?? "general",
    tags: [...candidate.tags],
    tagsPendingReview: [...(candidate.tags_pending_review ?? [])],
    tagsSuggested: buildSuggestedTags(candidate.tags_suggested, candidate.tags_new),
    tagsNew: [...(candidate.tags_new ?? [])],
    endorsements: [...(candidate.endorsements ?? [])]
  };
}

function appendAuditLog(existing: AuditLogEntry[] | undefined) {
  return [
    ...(existing ?? []),
    {
      action: "edited",
      timestamp: new Date().toISOString(),
      note: "Manual edit via catalogue"
    }
  ];
}

function appendGeoAuditLog(
  existing: AuditLogEntry[] | undefined,
  currentUser: string,
  note: string
) {
  return [
    ...(existing ?? []),
    {
      action: "geo_corrected",
      user_name: currentUser,
      timestamp: new Date().toISOString(),
      note
    }
  ];
}

function arrayChanged(left: string[] | undefined, right: string[]) {
  return JSON.stringify(left ?? []) !== JSON.stringify(right);
}

function endorsementsChanged(left: Endorsement[] | undefined, right: Endorsement[]) {
  return JSON.stringify(left ?? []) !== JSON.stringify(right);
}

function suggestionsChanged(
  leftSuggested: string[] | undefined,
  leftNew: NewTagSuggestion[] | undefined,
  rightSuggested: string[],
  rightNew: NewTagSuggestion[]
) {
  return (
    JSON.stringify(buildSuggestedTags(leftSuggested, leftNew)) !== JSON.stringify(rightSuggested) ||
    JSON.stringify(leftNew ?? []) !== JSON.stringify(rightNew)
  );
}

function buildEditPayload(candidate: CatalogueItem, draft: EditDraft) {
  const trimmedName = draft.name.trim();
  const trimmedBrand = draft.brand.trim();
  const trimmedDescription = draft.description.trim();
  const trimmedPriceText = draft.priceText.trim();
  const trimmedCategory = draft.category.trim();
  const trimmedContentType = draft.contentType.trim();
  const trimmedLocation = draft.location.trim();
  const trimmedConfidence = draft.confidence.trim();
  const trimmedCandidateUrl = draft.candidateUrl.trim();
  const trimmedSourceUrl = draft.sourceUrl.trim();
  const trimmedSourceName = draft.sourceName.trim();
  const normalizedPricePence = draft.pricePence.trim() === "" ? null : Number(draft.pricePence);
  const normalizedTags = uniqueTags(draft.tags);
  const normalizedPending = uniqueTags(draft.tagsPendingReview);
  const normalizedSuggested = uniqueTags(draft.tagsSuggested);
  const normalizedTagsNew = draft.tagsNew.filter((tag) => normalizedSuggested.includes(tag.slug));
  const normalizedEndorsements = draft.endorsements
    .map((endorsement) => ({
      source: endorsement.source.trim(),
      award: endorsement.award.trim(),
      year: Number(endorsement.year)
    }))
    .filter(
      (endorsement) =>
        endorsement.source &&
        endorsement.award &&
        Number.isFinite(endorsement.year)
    );

  const changes: Record<string, unknown> = {};

  if (trimmedName !== candidate.name) {
    changes.name = trimmedName;
  }
  const currentBrand = "brand" in candidate ? candidate.brand ?? "" : "";

  if (trimmedBrand !== currentBrand) {
    changes.brand = trimmedBrand || null;
  }
  if (trimmedDescription !== (candidate.description ?? "")) {
    changes.description = trimmedDescription || null;
  }
  if (draft.isBlckbxApproved !== (candidate.is_blckbx_approved ?? false)) {
    changes.is_blckbx_approved = draft.isBlckbxApproved;
  }
  if (draft.contentScope !== (candidate.content_scope ?? "general")) {
    changes.content_scope = draft.contentScope;
    if (draft.contentScope === "general") {
      changes.requested_by_client = null;
    }
  }
  if ("price_pence" in candidate && normalizedPricePence !== candidate.price_pence) {
    changes.price_pence = Number.isFinite(normalizedPricePence) ? normalizedPricePence : null;
  }
  if ("price_text" in candidate && trimmedPriceText !== (candidate.price_text ?? "")) {
    changes.price_text = trimmedPriceText || null;
  }
  if (candidate.collection === "product_candidates") {
    if (draft.imageUrl.trim() !== (candidate.image_url ?? "")) {
      changes.image_url = draft.imageUrl.trim() || null;
    }
    if (trimmedCandidateUrl !== (candidate.product_url ?? "")) {
      changes.product_url = trimmedCandidateUrl || null;
    }
    if (trimmedSourceUrl !== (candidate.source_url ?? "")) {
      changes.source_url = trimmedSourceUrl || null;
    }
    if (trimmedSourceName !== candidate.source_name) {
      changes.source_name = trimmedSourceName;
    }
  } else {
    if (draft.imageUrl.trim() !== (candidate.hero_image_url ?? "")) {
      changes.hero_image_url = draft.imageUrl.trim() || null;
    }
    if (trimmedCandidateUrl !== (candidate.source_url ?? "")) {
      changes.source_url = trimmedCandidateUrl;
    }
    if (trimmedSourceName !== candidate.source_name) {
      changes.source_name = trimmedSourceName;
    }
    if (trimmedCategory !== (candidate.category ?? "")) {
      changes.category = trimmedCategory || null;
    }
    if (trimmedContentType !== candidate.content_type) {
      changes.content_type = trimmedContentType || null;
    }
    if (trimmedLocation !== (candidate.location ?? "")) {
      changes.location = trimmedLocation || null;
    }
    if (trimmedConfidence !== (candidate.confidence ?? "")) {
      changes.confidence = trimmedConfidence || null;
    }
  }

  if (arrayChanged(candidate.tags, normalizedTags)) {
    changes.tags = normalizedTags;
  }
  if (arrayChanged(candidate.tags_pending_review, normalizedPending)) {
    changes.tags_pending_review = normalizedPending;
  }
  if (suggestionsChanged(candidate.tags_suggested, candidate.tags_new, normalizedSuggested, normalizedTagsNew)) {
    changes.tags_suggested = normalizedSuggested;
    changes.tags_new = normalizedTagsNew;
  }
  if (endorsementsChanged(candidate.endorsements, normalizedEndorsements)) {
    changes.endorsements = normalizedEndorsements;
  }

  if (Object.keys(changes).length) {
    changes.audit_log = appendAuditLog(candidate.audit_log);
  }

  return changes;
}

function formatPencePreview(raw: string) {
  if (!raw.trim()) {
    return "";
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP"
  }).format(value / 100);
}

function formatEndorsementBadge(endorsement: Endorsement) {
  return `${endorsement.source} ${endorsement.award}`.toUpperCase();
}

function getGeoState(candidate: CatalogueItem): GeoState | null {
  if (candidate.collection === "product_candidates") {
    return null;
  }

  return {
    lat: candidate.lat,
    lng: candidate.lng,
    geo_source: candidate.geo_source,
    geo_place_name: candidate.geo_place_name,
    geo_match_type: candidate.geo_match_type,
    geo_needs_review: candidate.geo_needs_review
  };
}

function hasGeoFields(candidate: CatalogueItem) {
  const geo = getGeoState(candidate);
  if (!geo) {
    return false;
  }

  return (
    geo.lat !== undefined ||
    geo.lng !== undefined ||
    geo.geo_source !== undefined ||
    geo.geo_place_name !== undefined ||
    geo.geo_match_type !== undefined ||
    geo.geo_needs_review !== undefined
  );
}

function shouldShowGeoIndicator(candidate: CatalogueItem) {
  return (
    candidate.collection !== "product_candidates" &&
    (candidate.content_tab === "going_out" || candidate.content_tab === "travel") &&
    hasGeoFields(candidate)
  );
}

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string) {
  const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
  return `${Math.abs(value).toFixed(4)}°${suffix}`;
}

function BlckbxApprovedBadge() {
  return (
    <img
      src="/box.png"
      alt="BlckBx Approved"
      className="absolute left-[10px] top-[10px] z-10 h-8 w-8 "
    />
  );
}

function ReviewPriorityBadges({ candidate }: { candidate: CatalogueItem }) {
  if (
    !(candidate.priority === "fast_track" || candidate.requested_by_client_name)
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {candidate.priority === "fast_track" ? (
        <Pill tone="amber">Fast track</Pill>
      ) : null}
      {candidate.requested_by_client_name ? (
        <Pill tone="data">{candidate.requested_by_client_name}</Pill>
      ) : null}
    </div>
  );
}

function GeoStatusBadge({ candidate }: { candidate: GeoCandidate }) {
  if (!shouldShowGeoIndicator(candidate)) {
    return null;
  }

  const needsReview = candidate.geo_needs_review === true;
  const tooltip = needsReview
    ? "Location needs review"
    : candidate.geo_place_name ?? "Location confirmed";

  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1.5 border border-[var(--sand-300)] bg-white px-2.5 py-1 text-xs text-[var(--sand-900)]"
    >
      <span aria-hidden="true" className="text-[12px] leading-none">
        📍
      </span>
      <span
        aria-hidden="true"
        className={classNames(
          "h-2 w-2",
          needsReview ? "bg-[var(--black)]" : "bg-[var(--success)]"
        )}
      />
    </span>
  );
}

export function CatalogueGrid({
  candidates,
  gridMode,
  lists,
  currentUser,
  busyKey,
  exitingIds,
  selectionEnabled,
  selectedIds,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit,
  onTagsChange,
  onListsChange,
  onCreateList
}: {
  candidates: CatalogueItem[];
  gridMode: GridMode;
  lists: ListOption[];
  currentUser: string;
  busyKey?: string;
  exitingIds?: string[];
  selectionEnabled?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (candidate: CatalogueItem) => void;
  onApprove: (candidate: CatalogueItem, reason?: string) => void;
  onReject: (
    candidate: CatalogueItem,
    payload: { reason?: string; rejectionPreset: string }
  ) => void;
  onEdit: (candidate: CatalogueItem, changes: Record<string, unknown>) => Promise<unknown>;
  onTagsChange: (candidate: CatalogueItem, tags: string[]) => void;
  onListsChange: (candidate: CatalogueItem, assignedLists: string[]) => void;
  onCreateList: (
    candidate: CatalogueItem,
    payload: { name: string; list_type: string; occasion?: string; year?: string }
  ) => Promise<ListOption>;
}) {
  return (
    <div
      className={classNames(
        "grid auto-rows-fr gap-4",
        gridMode === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
        "md:grid-cols-2"
      )}
    >
      {candidates.map((candidate) => (
        <CatalogueCard
          key={`${candidate.collection}:${candidate._key}`}
          candidate={candidate}
          lists={lists}
          currentUser={currentUser}
          busy={busyKey === candidate._key}
          isExiting={exitingIds?.includes(`${candidate.collection}:${candidate._key}`)}
          selectionEnabled={selectionEnabled}
          selected={selectedIds?.includes(`${candidate.collection}:${candidate._key}`)}
          onToggleSelect={() => onToggleSelect?.(candidate)}
          onApprove={(reason) => onApprove(candidate, reason)}
          onReject={(reason) => onReject(candidate, reason)}
          onEdit={(changes) => onEdit(candidate, changes)}
          onTagsChange={(tags) => onTagsChange(candidate, tags)}
          onListsChange={(assignedLists) => onListsChange(candidate, assignedLists)}
          onCreateList={(payload) => onCreateList(candidate, payload)}
        />
      ))}
    </div>
  );
}

export function TravelLibraryGrid({
  candidates,
  gridMode,
  mode,
  currentUser = "Kath",
  busyKey,
  onDismiss,
  onSaveToggle,
  onEdit
}: {
  candidates: TrendCandidate[];
  gridMode: GridMode;
  mode: "new" | "saved" | "all";
  currentUser?: string;
  busyKey?: string;
  onDismiss: (candidate: TrendCandidate) => void;
  onSaveToggle: (candidate: TrendCandidate, nextSaved: boolean) => void;
  onEdit: (candidate: TrendCandidate, changes: Record<string, unknown>) => Promise<unknown>;
}) {
  return (
    <div
      className={classNames(
        "grid auto-rows-fr gap-4",
        gridMode === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
        "md:grid-cols-2"
      )}
    >
      {candidates.map((candidate) => (
        <TravelResearchCard
          key={`${candidate.collection}:${candidate._key}`}
          candidate={candidate}
          mode={mode}
          currentUser={currentUser}
          busy={busyKey === candidate._key}
          link={getPrimaryLink(candidate)}
          onDismiss={() => onDismiss(candidate)}
          onSaveToggle={(nextSaved) => onSaveToggle(candidate, nextSaved)}
          onEdit={(changes) => onEdit(candidate, changes)}
        />
      ))}
    </div>
  );
}

export function CompactList({
  candidates,
  lists,
  type,
  busyKey,
  onRestore
}: {
  candidates: CatalogueItem[];
  lists: ListOption[];
  type: "approved" | "rejected";
  busyKey?: string;
  onRestore: (candidate: CatalogueItem) => void;
}) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate) => {
        const assignedLists = lists.filter((list) =>
          candidate.assigned_lists.includes(list._key)
        );
        const imageUrl =
          candidate.collection === "product_candidates"
            ? candidate.image_url || candidate.primary_image || candidate.hero_image_url || null
            : candidate.hero_image_url || candidate.cover_images?.[0] || candidate.image_url || null;
        return (
          <article
            key={`${candidate.collection}:${candidate._key}`}
            className={classNames(
              "flex flex-col gap-4 border border-[var(--sand-300)] bg-white p-4 md:flex-row md:items-center",
              type === "approved"
                ? "border-l-[3px] border-l-[var(--approved-green)]"
                : "border-l-[3px] border-l-[var(--error)]"
            )}
          >
            <div className="relative h-14 w-14 overflow-hidden bg-[var(--sand-100)]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={candidate.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.16em] text-[var(--sand-700)]">
                  No image
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium text-[var(--text)]">{candidate.name}</p>
              <p className="mt-1 text-sm text-[var(--sand-900)]">
                {compactMeta(candidate)}
              </p>
              {assignedLists.length ? (
                <p className="mt-1 text-sm text-[var(--sand-700)]">
                  {assignedLists.map((list) => list.name).join(", ")}
                </p>
              ) : null}
              {candidate.curation_reason ? (
                <p
                  className={classNames(
                    "mt-2 text-sm",
                    type === "approved"
                      ? "text-[var(--sand-900)]"
                      : "italic text-[var(--error)]"
                  )}
                >
                  {candidate.curation_reason}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={busyKey === candidate._key}
              onClick={() => onRestore(candidate)}
              className="text-left text-sm font-medium text-[var(--sand-900)] underline decoration-[var(--sand-500)] underline-offset-4 transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60 md:text-right"
            >
              {type === "approved" ? "Remove" : "Restore"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function compactMeta(candidate: CatalogueItem) {
  if (candidate.content_tab === "shopping") {
    return [candidate.brand, formatPrice(candidate)].filter(Boolean).join(" • ");
  }
  return [candidate.content_type, formatLocation(candidate), candidate.source_name]
    .filter(Boolean)
    .join(" • ");
}

function EndorsementBadgeRow({ endorsements }: { endorsements?: Endorsement[] }) {
  if (!endorsements?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {endorsements.map((endorsement, index) => (
        <span
          key={`${endorsement.source}-${endorsement.award}-${endorsement.year}-${index}`}
          className="inline-flex items-center gap-[5px] py-[3px] text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--sand-900)]"
        >
          <span className="h-1 w-1 bg-[var(--black)]" />
          <span>{formatEndorsementBadge(endorsement)}</span>
        </span>
      ))}
    </div>
  );
}

function CatalogueCard({
  candidate,
  lists,
  currentUser,
  busy,
  isExiting,
  selectionEnabled,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onEdit,
  onTagsChange,
  onListsChange,
  onCreateList
}: {
  candidate: CatalogueItem;
  lists: ListOption[];
  currentUser: string;
  busy: boolean;
  isExiting?: boolean;
  selectionEnabled?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onApprove: (reason?: string) => void;
  onReject: (payload: { reason?: string; rejectionPreset: string }) => void;
  onEdit: (changes: Record<string, unknown>) => Promise<unknown>;
  onTagsChange: (tags: string[]) => void;
  onListsChange: (assignedLists: string[]) => void;
  onCreateList: (payload: {
    name: string;
    list_type: string;
    occasion?: string;
    year?: string;
  }) => Promise<ListOption>;
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectPreset, setRejectPreset] = useState<string>("");
  const [rejectError, setRejectError] = useState(false);
  const [approvePrompt, setApprovePrompt] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const selectedLists = lists.filter((list) =>
    candidate.assigned_lists.includes(list._key)
  );
  const availableLists = lists.filter(
    (list) => !candidate.assigned_lists.includes(list._key)
  );

  function commitTag() {
    const normalized = newTag.trim();
    if (!normalized) {
      setAddingTag(false);
      setNewTag("");
      return;
    }
    onTagsChange([...candidate.tags, normalized]);
    setAddingTag(false);
    setNewTag("");
  }

  function submitReject() {
    if (!rejectPreset) {
      setRejectError(true);
      return;
    }
    setRejectError(false);
    onReject({
      reason: rejectReason.trim() || undefined,
      rejectionPreset: rejectPreset
    });
  }

  const link = getPrimaryLink(candidate);
  const imageUrl =
    candidate.content_tab === "shopping"
      ? candidate.image_url || candidate.primary_image || candidate.hero_image_url || null
      : null;

  if (candidate.collection !== "product_candidates") {
      return (
        <TrendCatalogueCard
          candidate={candidate}
          currentUser={currentUser}
          busy={busy}
          isExiting={isExiting}
          selectionEnabled={selectionEnabled}
          selected={selected}
          onToggleSelect={onToggleSelect}
          link={link}
          variant="curation"
          approvePrompt={approvePrompt}
          approveReason={approveReason}
          rejectReason={rejectReason}
          rejectPreset={rejectPreset}
          rejectError={rejectError}
          isRejecting={isRejecting}
          onApproveReasonChange={setApproveReason}
          onRejectReasonChange={(value) => {
            setRejectReason(value);
            setRejectError(false);
          }}
          onRejectPresetChange={(value) => {
            setRejectPreset(value);
            setRejectError(false);
          }}
          onApprove={() => onApprove(approveReason.trim() || undefined)}
          onApproveSkip={() => onApprove(undefined)}
          onReject={submitReject}
          onEdit={(changes) => onEdit(changes)}
          onDismissReject={() => {
            setIsRejecting(false);
            setRejectReason("");
            setRejectPreset("");
            setRejectError(false);
          }}
          onShowApprove={() => setApprovePrompt(true)}
          onShowReject={() => setIsRejecting(true)}
        />
    );
  }

  return (
    <article
      className={classNames(
        "flex h-full flex-col overflow-hidden border border-[var(--sand-300)] bg-white transition hover:border-[var(--black)]",
        isExiting ? "opacity-0 duration-200" : "opacity-100"
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-[var(--sand-100)]">
        {selectionEnabled ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect?.();
            }}
            className={classNames(
              "absolute left-3 top-3 z-20 inline-flex h-4 w-4 items-center justify-center border-2 text-[10px] leading-none",
              selected
                ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)]"
                : "border-[var(--sand-300)] bg-white text-transparent"
            )}
            aria-label={selected ? "Deselect item" : "Select item"}
          >
            ✓
          </button>
        ) : null}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={candidate.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.18em] text-[var(--sand-700)]">
            No image
          </div>
        )}
        {candidate.is_blckbx_approved ? <BlckbxApprovedBadge /> : null}
        {candidate.content_tab === "shopping" && candidate.already_in_catalogue ? (
          <span className="absolute left-4 top-[52px] border border-[var(--sand-300)] bg-white px-3 py-1 text-xs font-medium text-[var(--sand-900)]">
            Already in catalogue
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--sand-700)]">
            {candidate.source_name} - {candidate.scrape_source}
          </p>
          <ReviewPriorityBadges candidate={candidate} />
          <EndorsementBadgeRow endorsements={candidate.endorsements} />
          <CardBody candidate={candidate} />
          {candidate.description ? (
            <p className="line-clamp-3 text-sm leading-6 text-[var(--sand-900)]">
              {candidate.description}
            </p>
          ) : null}
        </div>

        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-[var(--text)] underline decoration-[var(--sand-400)] underline-offset-4"
          >
            {link.label}
          </a>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {candidate.suggested_themes.map((theme) => (
            <Pill key={theme} tone="theme">
              {theme}
            </Pill>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {candidate.tags.map((tag) => (
              <Pill key={tag} tone="neutral">
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => onTagsChange(candidate.tags.filter((item) => item !== tag))}
                  className="text-[var(--sand-700)] transition hover:text-[var(--text)]"
                >
                  x
                </button>
              </Pill>
            ))}
            {addingTag ? (
              <input
                autoFocus
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onBlur={commitTag}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTag();
                  }
                  if (event.key === "Escape") {
                    setAddingTag(false);
                    setNewTag("");
                  }
                }}
                className="min-w-[120px] border border-dashed border-[var(--sand-500)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--black)]"
                placeholder="Add tag"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="border border-dashed border-[var(--sand-500)] px-3 py-2 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)]"
              >
                + add tag
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Add to list</Label>
          <ListSelector
            availableLists={availableLists}
            onAssign={(listKey) => onListsChange([...candidate.assigned_lists, listKey])}
            onCreateList={async (payload) => {
              const list = await onCreateList(payload);
              onListsChange([...candidate.assigned_lists, list._key]);
            }}
          />
          <div className="flex flex-wrap gap-2">
            {selectedLists.map((list) => (
              <Pill key={list._key} tone="list">
                <span>{list.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    onListsChange(
                      candidate.assigned_lists.filter((item) => item !== list._key)
                    )
                  }
                  className="text-[var(--list-text)] transition hover:opacity-70"
                >
                  x
                </button>
              </Pill>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          {approvePrompt ? (
            <DecisionPrompt
              tone="approve"
              value={approveReason}
              placeholder="What makes this a good pick? (helps the AI learn)"
              onChange={setApproveReason}
              onPrimary={() => onApprove(approveReason.trim() || undefined)}
              onSecondary={() => onApprove(undefined)}
              busy={busy}
            />
          ) : isRejecting ? (
            <DecisionPrompt
              tone="reject"
              value={rejectReason}
              placeholder="Additional context for this rejection (optional)"
              onChange={(value) => {
                setRejectReason(value);
                setRejectError(false);
              }}
              rejectionPreset={rejectPreset}
              onRejectionPresetChange={(value) => {
                setRejectPreset(value);
                setRejectError(false);
              }}
              onPrimary={submitReject}
              onSecondary={() => {
                setIsRejecting(false);
                setRejectReason("");
                setRejectPreset("");
                setRejectError(false);
              }}
              busy={busy}
              error={rejectError}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setIsEditing(true)}
                className="border border-[var(--sand-300)] bg-white px-4 py-3 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy || (candidate.content_tab === "shopping" && !!candidate.already_in_catalogue)}
                onClick={() => setApprovePrompt(true)}
                className="border border-[var(--black)] bg-[var(--black)] px-4 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setIsRejecting(true)}
                className="border border-[var(--sand-300)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--sand-900)] transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <EditCandidateModal
          key={`${candidate.collection}:${candidate._key}`}
          candidate={candidate}
          currentUser={currentUser}
          busy={busy}
          onClose={() => setIsEditing(false)}
          onSave={async (changes) => {
            await onEdit(changes);
            setIsEditing(false);
          }}
        />
      ) : null}
    </article>
  );
}

function CardBody({ candidate }: { candidate: ProductCandidate }) {
  return <ProductCardBody candidate={candidate} />;
}

function ProductCardBody({ candidate }: { candidate: ProductCandidate }) {
  return (
    <>
      <div>
        <h2 className="font-display text-xl font-medium leading-tight text-[var(--text)]">
          {candidate.name}
        </h2>
        {candidate.brand ? (
          <p className="mt-1 text-sm text-[var(--sand-900)]">{candidate.brand}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-lg font-medium text-[var(--text)]">{formatPrice(candidate)}</p>
        <span
          className={classNames(
            "border px-3 py-1 text-xs font-medium",
            candidate.availability === "in_stock"
              ? "border-[var(--approved-green)] bg-[var(--approved-bg)] text-[var(--approved-text)]"
              : "border-[var(--rejected-red)] bg-[var(--rejected-bg)] text-[var(--rejected-text)]"
          )}
        >
          {formatAvailability(candidate.availability)}
        </span>
        {candidate.url_status === "broken" ? (
          <span className="border border-[var(--rejected-red)] bg-[var(--rejected-bg)] px-3 py-1 text-xs font-medium text-[var(--rejected-text)]">
            URL may be broken
          </span>
        ) : null}
      </div>
    </>
  );
}

function TrendCatalogueCard({
  candidate,
  currentUser,
  busy,
  isExiting,
  selectionEnabled,
  selected,
  onToggleSelect,
  link,
  variant,
  approvePrompt,
  approveReason,
  rejectReason,
  rejectPreset,
  rejectError,
  isRejecting,
  onApproveReasonChange,
  onRejectReasonChange,
  onRejectPresetChange,
  onApprove,
  onApproveSkip,
  onReject,
  onEdit,
  onDismissReject,
  onShowApprove,
  onShowReject
}: {
  candidate: TrendCandidate | RecommendationCandidate;
  currentUser: string;
  busy: boolean;
  isExiting?: boolean;
  selectionEnabled?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  link: ReturnType<typeof getPrimaryLink>;
  variant: "curation" | "research";
  approvePrompt: boolean;
  approveReason: string;
  rejectReason: string;
  rejectPreset: string;
  rejectError: boolean;
  isRejecting: boolean;
  onApproveReasonChange: (value: string) => void;
  onRejectReasonChange: (value: string) => void;
  onRejectPresetChange: (value: string) => void;
  onApprove: () => void;
  onApproveSkip: () => void;
  onReject: () => void;
  onEdit: (changes: Record<string, unknown>) => Promise<unknown>;
  onDismissReject: () => void;
  onShowApprove: () => void;
  onShowReject: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isResearch = variant === "research";

  return (
    <article
      className={classNames(
        "flex h-full flex-col overflow-hidden border border-[var(--sand-300)] bg-white transition hover:border-[var(--black)]",
        isExiting ? "opacity-0 duration-200" : "opacity-100"
      )}
    >
      <TrendHeroImage
        candidate={candidate}
        selectionEnabled={selectionEnabled}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
      <div className="border-b border-[var(--sand-300)] bg-[linear-gradient(135deg,rgba(245,243,240,0.9),rgba(255,255,255,1))] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <ReviewPriorityBadges candidate={candidate} />
          <GeoStatusBadge candidate={candidate} />
          <Pill tone="data">{candidate.content_type}</Pill>
          {candidate.content_type === "guide" && candidate.destination ? (
            <Pill tone="data">{candidate.destination}</Pill>
          ) : null}
          {candidate.content_type === "guide" && candidate.poi_count != null ? (
            <Pill tone="data">
              {candidate.poi_count} {candidate.poi_count === 1 ? "POI" : "POIs"}
            </Pill>
          ) : null}
          {candidate.content_type !== "guide" && candidate.confidence ? (
            <Pill
              tone={
                candidate.confidence === "high"
                  ? "green"
                  : candidate.confidence === "medium"
                    ? "amber"
                    : "red"
              }
            >
              {candidate.confidence} confidence
            </Pill>
          ) : null}
          {candidate.content_type !== "guide" && candidate.location ? (
            <Pill tone="data">{candidate.location}</Pill>
          ) : null}
        </div>
        {candidate.endorsements?.length ? (
          <div className="mt-2">
            <EndorsementBadgeRow endorsements={candidate.endorsements} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--sand-700)]">
              {candidate.source_name}
            </p>
            <h2 className="mt-2 font-display text-xl font-medium leading-tight text-[var(--text)]">
              {candidate.name}
            </h2>
          </div>

          {candidate.content_type === "guide" && candidate.travel_assistant_note ? (
            <p className="line-clamp-4 text-sm leading-6 text-[var(--sand-900)]">
              {candidate.travel_assistant_note}
            </p>
          ) : candidate.description ? (
            <p
              className={classNames(
                "text-sm leading-6 text-[var(--sand-900)]",
                isResearch ? "" : "line-clamp-3"
              )}
            >
              {candidate.description}
            </p>
          ) : null}

          {candidate.signal_phrase ? (
            <p className="text-sm italic text-[var(--sand-900)]">“{candidate.signal_phrase}”</p>
          ) : null}

          {candidate.source_excerpt ? (
            <p className="line-clamp-4 text-sm leading-6 text-[var(--sand-900)]">
              {candidate.source_excerpt}
            </p>
          ) : null}

          {isResearch && candidate.scraped_at ? (
            <p className="text-sm text-[var(--sand-900)]">
              Found {formatDate(candidate.scraped_at)}
            </p>
          ) : null}
        </div>

        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className={classNames(
              "text-sm text-[var(--text)] underline decoration-[var(--sand-400)] underline-offset-4",
              isResearch ? "" : "truncate"
            )}
          >
            {isResearch ? `${candidate.source_name} • ${link.label}` : link.label}
          </a>
        ) : null}

        <div className="mt-auto">
          {isResearch ? null : approvePrompt ? (
            <DecisionPrompt
              tone="approve"
              value={approveReason}
              placeholder="What makes this a good pick? (helps the AI learn)"
              onChange={onApproveReasonChange}
              onPrimary={onApprove}
              onSecondary={onApproveSkip}
              busy={busy}
            />
          ) : isRejecting ? (
            <DecisionPrompt
              tone="reject"
              value={rejectReason}
              placeholder="Additional context for this rejection (optional)"
              onChange={onRejectReasonChange}
              rejectionPreset={rejectPreset}
              onRejectionPresetChange={onRejectPresetChange}
              onPrimary={onReject}
              onSecondary={onDismissReject}
              busy={busy}
              error={rejectError}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => setIsEditing(true)}
                className="border border-[var(--sand-300)] bg-white px-4 py-3 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onShowApprove}
                className="border border-[var(--black)] bg-[var(--black)] px-4 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onShowReject}
                className="border border-[var(--sand-300)] bg-[var(--white)] px-4 py-3 text-sm text-[var(--sand-900)] transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <EditCandidateModal
          key={`${candidate.collection}:${candidate._key}`}
          candidate={candidate}
          currentUser={currentUser}
          busy={busy}
          onClose={() => setIsEditing(false)}
          onSave={async (changes) => {
            await onEdit(changes);
            setIsEditing(false);
          }}
        />
      ) : null}
    </article>
  );
}

function TravelResearchCard({
  candidate,
  mode,
  currentUser,
  busy,
  link,
  onDismiss,
  onSaveToggle,
  onEdit
}: {
  candidate: TrendCandidate;
  mode: "new" | "saved" | "all";
  currentUser: string;
  busy: boolean;
  link: ReturnType<typeof getPrimaryLink>;
  onDismiss: () => void;
  onSaveToggle: (nextSaved: boolean) => void;
  onEdit: (changes: Record<string, unknown>) => Promise<unknown>;
}) {
  const isUnread = !candidate.is_read;
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article
      className={classNames(
        "flex h-full flex-col overflow-hidden border bg-white transition hover:border-[var(--black)]",
        mode === "all" && !isUnread
          ? "border-[var(--sand-300)] opacity-85"
          : "border-[var(--sand-300)]",
        mode === "all" && isUnread ? "border-l-[3px] border-l-[var(--black)]" : ""
      )}
    >
      <TrendHeroImage candidate={candidate} />

      <div className="border-b border-[var(--sand-300)] bg-[linear-gradient(135deg,rgba(245,243,240,0.9),rgba(255,255,255,1))] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <GeoStatusBadge candidate={candidate} />
          <Pill tone="data">{candidate.content_type}</Pill>
          {candidate.confidence ? (
            <Pill
              tone={
                candidate.confidence === "high"
                  ? "green"
                  : candidate.confidence === "medium"
                    ? "amber"
                    : "red"
              }
            >
              {candidate.confidence} confidence
            </Pill>
          ) : null}
          {candidate.location ? <Pill tone="data">{candidate.location}</Pill> : null}
        </div>
        {candidate.endorsements?.length ? (
          <div className="mt-2">
            <EndorsementBadgeRow endorsements={candidate.endorsements} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--sand-700)]">
              {candidate.source_name}
            </p>
            <h2 className="mt-2 font-display text-xl font-medium leading-tight text-[var(--text)]">
              {candidate.name}
            </h2>
          </div>

          {candidate.description ? (
            <p className="text-sm leading-6 text-[var(--sand-900)]">{candidate.description}</p>
          ) : null}

          {candidate.signal_phrase ? (
            <p className="text-sm italic text-[var(--sand-900)]">“{candidate.signal_phrase}”</p>
          ) : null}

          {candidate.source_excerpt ? (
            <p className="line-clamp-4 text-sm leading-6 text-[var(--sand-900)]">
              {candidate.source_excerpt}
            </p>
          ) : null}

          {candidate.scraped_at ? (
            <p className="text-sm text-[var(--sand-900)]">Found {formatDate(candidate.scraped_at)}</p>
          ) : null}
        </div>

        {link ? (
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--text)] underline decoration-[var(--sand-400)] underline-offset-4"
          >
            {candidate.source_name} • {link.label}
          </a>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3">
          {mode === "new" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDismiss}
              className="text-sm text-[var(--sand-900)] underline decoration-[var(--sand-500)] underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Dismiss
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setIsEditing(true)}
              className="border border-[var(--sand-300)] bg-white px-4 py-2 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSaveToggle(!candidate.is_saved)}
              className={classNames(
                "border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                candidate.is_saved
                  ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)]"
                  : "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--text)]"
              )}
            >
              {candidate.is_saved ? "Unsave" : "Save"}
            </button>
          </div>
        </div>
      </div>
      {isEditing ? (
        <EditCandidateModal
          key={`${candidate.collection}:${candidate._key}`}
          candidate={candidate}
          currentUser={currentUser}
          busy={busy}
          onClose={() => setIsEditing(false)}
          onSave={async (changes) => {
            await onEdit(changes);
            setIsEditing(false);
          }}
        />
      ) : null}
    </article>
  );
}

function TrendHeroImage({
  candidate,
  selectionEnabled,
  selected,
  onToggleSelect
}: {
  candidate: TrendCandidate | RecommendationCandidate;
  selectionEnabled?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const imageUrl = candidate.hero_image_url || candidate.cover_images?.[0] || null;
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--sand-100)]">
      {selectionEnabled ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect?.();
          }}
          className={classNames(
            "absolute left-3 top-3 z-20 inline-flex h-4 w-4 items-center justify-center border-2 text-[10px] leading-none",
            selected
              ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)]"
              : "border-[var(--sand-300)] bg-white text-transparent"
          )}
          aria-label={selected ? "Deselect item" : "Select item"}
        >
          ✓
        </button>
      ) : null}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={candidate.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[var(--sand-100)] text-[0.72rem] uppercase tracking-[0.18em] text-[var(--sand-700)]">
          No image
        </div>
      )}
      {candidate.is_blckbx_approved ? <BlckbxApprovedBadge /> : null}
    </div>
  );
}

const EditCandidateModal = memo(function EditCandidateModal({
  candidate,
  currentUser,
  busy,
  onClose,
  onSave
}: {
  candidate: CatalogueItem;
  currentUser: string;
  busy: boolean;
  onClose: () => void;
  onSave: (changes: Record<string, unknown>) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(() => createEditDraft(candidate));
  const [geoState, setGeoState] = useState(() => getGeoState(candidate));
  const [geoLatInput, setGeoLatInput] = useState(
    candidate.collection !== "product_candidates" && candidate.lat != null ? String(candidate.lat) : ""
  );
  const [geoLngInput, setGeoLngInput] = useState(
    candidate.collection !== "product_candidates" && candidate.lng != null ? String(candidate.lng) : ""
  );
  const [isEditingGeo, setIsEditingGeo] = useState(
    candidate.collection !== "product_candidates" &&
      (candidate.geo_needs_review === true || !hasGeoFields(candidate))
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [imageError, setImageError] = useState(false);
  const endorsementSourceRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pendingEndorsementFocus, setPendingEndorsementFocus] = useState<number | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        closeRef.current();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy]);

  useEffect(() => {
    setImageError(false);
  }, [draft.imageUrl]);

  useEffect(() => {
    if (pendingEndorsementFocus === null) {
      return;
    }
    const target = endorsementSourceRefs.current[pendingEndorsementFocus];
    if (target) {
      target.focus();
      setPendingEndorsementFocus(null);
    }
  }, [draft.endorsements.length, pendingEndorsementFocus]);

  const pricePreview = formatPencePreview(draft.pricePence);
  const isProduct = candidate.collection === "product_candidates";
  const isGeoCandidate = !isProduct;

  function updateDraft<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addTag() {
    const normalized = newTag.trim();
    if (!normalized) {
      setNewTag("");
      return;
    }
    updateDraft("tags", uniqueTags([...draft.tags, normalized]));
    setNewTag("");
  }

  async function handleSave() {
    const changes = buildEditPayload(candidate, draft);
    if (!Object.keys(changes).length) {
      onClose();
      return;
    }
    await onSave(changes);
  }

  async function handleGeoSave() {
    if (!isGeoCandidate) {
      return;
    }

    const latValue = Number(geoLatInput);
    const lngValue = Number(geoLngInput);

    if (!geoLatInput.trim() || !geoLngInput.trim()) {
      setGeoError("Both latitude and longitude are required.");
      return;
    }
    if (!Number.isFinite(latValue) || latValue < -90 || latValue > 90) {
      setGeoError("Latitude must be between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lngValue) || lngValue < -180 || lngValue > 180) {
      setGeoError("Longitude must be between -180 and 180.");
      return;
    }

    const hadCoordinates = geoState?.lat != null && geoState?.lng != null;
    const note = hadCoordinates ? "Coordinates manually updated" : "Coordinates manually entered";
    const changes = {
      lat: latValue,
      lng: lngValue,
      geo_source: "manual",
      geo_match_type: "manual",
      geo_needs_review: false,
      audit_log: appendGeoAuditLog(candidate.audit_log, currentUser, note)
    };

    const updated = (await onSave(changes)) as CatalogueItem | undefined;
    const nextCandidate =
      updated && updated.collection !== "product_candidates"
        ? updated
        : ({
            ...candidate,
            ...changes
          } as GeoCandidate);

    setGeoState(getGeoState(nextCandidate));
    setGeoLatInput(String(latValue));
    setGeoLngInput(String(lngValue));
    setIsEditingGeo(false);
    setGeoError(null);
  }

  const hasExistingGeo =
    isGeoCandidate &&
    (geoState?.lat !== undefined ||
      geoState?.lng !== undefined ||
      geoState?.geo_source !== undefined ||
      geoState?.geo_place_name !== undefined ||
      geoState?.geo_match_type !== undefined ||
      geoState?.geo_needs_review !== undefined);
  const showGeoEditor =
    isGeoCandidate && (isEditingGeo || geoState?.geo_needs_review === true || !hasExistingGeo);

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close modal"
        className="modal-backdrop"
        onClick={() => {
          if (!busy) {
            onClose();
          }
        }}
      />
      <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
        <div className="max-h-[90vh] overflow-hidden border border-[var(--sand-300)] bg-[var(--white)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--sand-300)] px-5 py-4">
          <p className="text-[0.72rem] uppercase tracking-[0.2em] text-[var(--sand-700)]">
            Edit candidate
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="border border-[var(--sand-300)] bg-[var(--white)] px-4 py-2.5 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSave}
              className="border border-[var(--black)] bg-[var(--black)] px-4 py-2.5 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="border border-[var(--sand-300)] px-3 py-2 text-sm text-[var(--sand-900)] transition hover:border-[var(--black)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="relative h-[240px] overflow-hidden border border-[var(--sand-300)] bg-[var(--sand-100)]">
                  {draft.imageUrl && !imageError ? (
                    <img
                      src={draft.imageUrl}
                      alt={draft.name || candidate.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.22em] text-[var(--sand-700)]">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <input
                    value={draft.imageUrl}
                    onChange={(event) => updateDraft("imageUrl", event.target.value)}
                    className={fieldClasses}
                    placeholder="https://..."
                  />
                  <p className="text-xs leading-5 text-[var(--sand-700)]">
                    Paste a direct image URL. Tip: right-click an image on the retailer&apos;s site and copy image address.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <FormField label="Name">
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    className={fieldClasses}
                  />
                </FormField>
                <FormField label="Brand">
                  <input
                    value={draft.brand}
                    onChange={(event) => updateDraft("brand", event.target.value)}
                    className={fieldClasses}
                    placeholder={isProduct ? "Brand" : "Optional"}
                  />
                </FormField>
                <FormField label="Description">
                  <textarea
                    rows={6}
                    value={draft.description}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    className={fieldClasses}
                  />
                </FormField>
              </div>
            </section>

            <section className="grid gap-3 border-t border-[var(--sand-300)] pt-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Price in pence">
                <div className="space-y-2">
                  <input
                    type="number"
                    min="0"
                    value={draft.pricePence}
                    onChange={(event) => updateDraft("pricePence", event.target.value)}
                    className={fieldClasses}
                    placeholder="5200"
                  />
                  {pricePreview ? (
                    <p className="text-xs text-[var(--sand-700)]">= {pricePreview}</p>
                  ) : null}
                </div>
              </FormField>
              <FormField label="Price text">
                <input
                  value={draft.priceText}
                  onChange={(event) => updateDraft("priceText", event.target.value)}
                  className={fieldClasses}
                  placeholder="£52.00"
                />
              </FormField>
              <FormField label="Category">
                <select
                  value={draft.category}
                  onChange={(event) => updateDraft("category", event.target.value)}
                  className={fieldClasses}
                  disabled={isProduct}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Content type">
                <select
                  value={draft.contentType}
                  onChange={(event) => updateDraft("contentType", event.target.value)}
                  className={fieldClasses}
                  disabled={isProduct}
                >
                  <option value="">Select type</option>
                  {contentTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
            </section>

            <section className="grid gap-3 border-t border-[var(--sand-300)] pt-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Location">
                <input
                  value={draft.location}
                  onChange={(event) => updateDraft("location", event.target.value)}
                  className={fieldClasses}
                  placeholder="City, Country"
                />
              </FormField>
              <FormField label="Confidence">
                <select
                  value={draft.confidence}
                  onChange={(event) => updateDraft("confidence", event.target.value)}
                  className={fieldClasses}
                >
                  <option value="">Select confidence</option>
                  {confidenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Source name">
                <input value={draft.sourceName} readOnly className={readOnlyFieldClasses} />
              </FormField>
              <FormField label="Source URL">
                <input value={draft.sourceUrl} readOnly className={readOnlyFieldClasses} />
              </FormField>
            </section>

            {isGeoCandidate ? (
              <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
                <Label>Location</Label>
                {showGeoEditor ? (
                  <div
                    className={classNames(
                      "space-y-4 border px-4 py-4",
                      hasExistingGeo
                        ? "border-[var(--black)] bg-[var(--sand-100)]"
                        : "border-[var(--sand-300)] bg-white"
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--text)]">
                        {hasExistingGeo ? "Location needs review" : "No location data"}
                      </p>
                      <p className="text-sm text-[var(--sand-700)]">
                        {hasExistingGeo
                          ? "Mapbox could not find this venue accurately."
                          : "This item was scraped before geocoding was enabled."}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                      <FormField label="Latitude">
                        <input
                          type="number"
                          step="0.000001"
                          value={geoLatInput}
                          onChange={(event) => {
                            setGeoLatInput(event.target.value);
                            setGeoError(null);
                          }}
                          className={fieldClasses}
                          placeholder="41.894300"
                        />
                      </FormField>
                      <FormField label="Longitude">
                        <input
                          type="number"
                          step="0.000001"
                          value={geoLngInput}
                          onChange={(event) => {
                            setGeoLngInput(event.target.value);
                            setGeoError(null);
                          }}
                          className={fieldClasses}
                          placeholder="12.474200"
                        />
                      </FormField>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleGeoSave}
                        className="border border-[var(--black)] bg-[var(--black)] px-4 py-3 text-sm font-medium text-[var(--white)] transition hover:bg-[var(--white)] hover:text-[var(--black)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save coordinates
                      </button>
                    </div>
                    {geoError ? (
                      <p className="text-sm text-[var(--error)]">{geoError}</p>
                    ) : null}
                    <p className="text-xs leading-5 text-[var(--sand-700)]">
                      Tip: right-click a location in Google Maps and select &quot;Copy coordinates&quot;
                    </p>
                  </div>
                ) : (
                  <div className="border border-[var(--sand-300)] bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          📍 {geoState?.geo_place_name ?? "Location confirmed"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--sand-900)]">
                          {geoState?.lat != null && geoState?.lng != null
                            ? `${formatCoordinate(geoState.lat, "N", "S")}, ${formatCoordinate(geoState.lng, "E", "W")}`
                            : "Coordinates saved"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--sand-700)]">
                          Matched: {geoState?.geo_match_type ?? "manual"} via {geoState?.geo_source ?? "manual"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setIsEditingGeo(true)}
                        className="text-sm text-[var(--sand-900)] underline decoration-[var(--sand-500)] underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
              <FormField label="Product/Candidate URL">
                <input
                  value={draft.candidateUrl}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateDraft("candidateUrl", value);
                    if (!isProduct) {
                      updateDraft("sourceUrl", value);
                    }
                  }}
                  className={fieldClasses}
                  placeholder="https://..."
                />
              </FormField>
            </section>

            <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <Pill key={tag} tone="neutral">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => updateDraft("tags", draft.tags.filter((item) => item !== tag))}
                      className="text-[var(--sand-700)] transition hover:text-[var(--text)]"
                    >
                      x
                    </button>
                  </Pill>
                ))}
                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  onBlur={addTag}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                    if (event.key === "Escape") {
                      setNewTag("");
                    }
                  }}
                  className="min-w-[120px] border border-dashed border-[var(--sand-500)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--black)]"
                  placeholder="+ add tag"
                />
              </div>
              {draft.tagsPendingReview.length ? (
                <TagBucket
                  label="Pending review"
                  items={draft.tagsPendingReview}
                  renderActions={(tag) => (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft("tags", uniqueTags([...draft.tags, tag]));
                          updateDraft(
                            "tagsPendingReview",
                            draft.tagsPendingReview.filter((item) => item !== tag)
                          );
                        }}
                        className="text-[var(--sand-900)]"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft(
                            "tagsPendingReview",
                            draft.tagsPendingReview.filter((item) => item !== tag)
                          )
                        }
                        className="text-[var(--sand-700)]"
                      >
                        Remove
                      </button>
                    </>
                  )}
                  tone="pending"
                />
              ) : null}
              {draft.tagsSuggested.length ? (
                <TagBucket
                  label="Suggested"
                  items={draft.tagsSuggested}
                  renderActions={(tag) => (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft("tags", uniqueTags([...draft.tags, tag]));
                          updateDraft(
                            "tagsSuggested",
                            draft.tagsSuggested.filter((item) => item !== tag)
                          );
                          updateDraft(
                            "tagsNew",
                            draft.tagsNew.filter((item) => item.slug !== tag)
                          );
                        }}
                        className="text-[var(--sand-900)]"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft(
                            "tagsSuggested",
                            draft.tagsSuggested.filter((item) => item !== tag)
                          );
                          updateDraft(
                            "tagsNew",
                            draft.tagsNew.filter((item) => item.slug !== tag)
                          );
                        }}
                        className="text-[var(--sand-700)]"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  tone="suggested"
                />
              ) : null}
            </section>

            {candidate.requested_by_client_name || (candidate.content_scope ?? "general") === "unique_request" ? (
              <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
                <Label>Content scope</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateDraft("contentScope", "unique_request")}
                    className={classNames(
                      "border px-4 py-4 text-left transition",
                      draft.contentScope === "unique_request"
                        ? "border-[var(--black)] bg-[var(--sand-100)]"
                        : "border-[var(--sand-300)] bg-white"
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--text)]">
                      Keep as client request
                    </p>
                    <p className="mt-1 text-sm text-[var(--sand-700)]">
                      This stays visible only for {candidate.requested_by_client_name ?? "the requesting client"} and will not sync to Meilisearch.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft("contentScope", "general")}
                    className={classNames(
                      "border px-4 py-4 text-left transition",
                      draft.contentScope === "general"
                        ? "border-[var(--black)] bg-[var(--sand-100)]"
                        : "border-[var(--sand-300)] bg-white"
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--text)]">Add to main feed</p>
                    <p className="mt-1 text-sm text-[var(--sand-700)]">
                      This clears the client-only scope and promotes it into the general catalogue.
                    </p>
                  </button>
                </div>
              </section>
            ) : null}

            <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
              <Label>BlckBx Approved</Label>
              <label
                className={classNames(
                  "block border px-4 py-4 transition",
                  draft.isBlckbxApproved
                    ? "border-[var(--black)] bg-[var(--sand-100)]"
                    : "border-[var(--sand-300)] bg-white"
                )}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={draft.isBlckbxApproved}
                    onChange={(event) =>
                      updateDraft("isBlckbxApproved", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 accent-[var(--black)]"
                  />
                  <span className="space-y-1">
                    <span
                      className={classNames(
                        "block text-sm font-medium",
                        draft.isBlckbxApproved ? "text-[var(--black)]" : "text-[var(--text)]"
                      )}
                    >
                      Mark as BlckBx Approved
                    </span>
                    <span className="block text-sm text-[var(--sand-700)]">
                      Only for items the team has personally vetted and would recommend without hesitation.
                    </span>
                  </span>
                </span>
              </label>
            </section>

            {candidate.content_type === "guide" ? (
              <>
                <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
                  <Label>Guide overview</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField label="Destination">
                      <input
                        value={candidate.destination ?? ""}
                        readOnly
                        className={readOnlyFieldClasses}
                      />
                    </FormField>
                    <FormField label="Linked POIs">
                      <input
                        value={String(candidate.poi_count ?? candidate.features_poi?.length ?? 0)}
                        readOnly
                        className={readOnlyFieldClasses}
                      />
                    </FormField>
                  </div>
                  {candidate.travel_assistant_note ? (
                    <div className="space-y-2">
                      <Label>Nicole&apos;s note</Label>
                      <div className="border border-[var(--sand-300)] bg-white px-4 py-4 text-sm leading-6 text-[var(--sand-900)]">
                        {candidate.travel_assistant_note}
                      </div>
                    </div>
                  ) : null}
                  {candidate.cover_images?.length ? (
                    <div className="space-y-2">
                      <Label>Cover images</Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {candidate.cover_images.map((imageUrl, index) => (
                          <div
                            key={`${imageUrl}-${index}`}
                            className="relative h-28 overflow-hidden border border-[var(--sand-300)] bg-[var(--sand-100)]"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={`${candidate.name} cover ${index + 1}`}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {candidate.features_poi?.length ? (
                    <div className="space-y-2">
                      <Label>Linked POIs</Label>
                      <div className="space-y-2">
                        {candidate.features_poi.map((poi, index) => (
                          <div
                            key={`${poi._key ?? poi.name}-${index}`}
                            className="border border-[var(--sand-300)] bg-white px-4 py-3"
                          >
                            <p className="text-sm font-medium text-[var(--text)]">{poi.name}</p>
                            <p className="mt-1 text-sm text-[var(--sand-700)]">
                              {[poi.poi_type, poi.section_label].filter(Boolean).join(" • ")}
                            </p>
                            {poi.note ? (
                              <p className="mt-2 text-sm leading-6 text-[var(--sand-900)]">
                                {poi.note}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                {candidate.body ? (
                  <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
                    <Label>Editorial body</Label>
                    <div
                      className="prose prose-sm max-w-none border border-[var(--sand-300)] bg-white px-4 py-4 text-[var(--sand-900)]"
                      dangerouslySetInnerHTML={{ __html: candidate.body }}
                    />
                  </section>
                ) : null}
              </>
            ) : null}

            <section className="space-y-3 border-t border-[var(--sand-300)] pt-4">
              <Label>Endorsements</Label>
              <div className="space-y-2">
                {draft.endorsements.map((endorsement, index) => (
                  <div key={`${index}-${endorsement.source}-${endorsement.award}`} className="flex items-start gap-2">
                    <input
                      ref={(element) => {
                        endorsementSourceRefs.current[index] = element;
                      }}
                      value={endorsement.source}
                      onChange={(event) =>
                        updateDraft(
                          "endorsements",
                          draft.endorsements.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, source: event.target.value }
                              : item
                          )
                        )
                      }
                      className={classNames(fieldClasses, "flex-[2]")}
                      placeholder="Source"
                    />
                    <input
                      value={endorsement.award}
                      onChange={(event) =>
                        updateDraft(
                          "endorsements",
                          draft.endorsements.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, award: event.target.value }
                              : item
                          )
                        )
                      }
                      className={classNames(fieldClasses, "flex-[2]")}
                      placeholder="Award"
                    />
                    <input
                      type="number"
                      min="1900"
                      max="9999"
                      value={endorsement.year}
                      onChange={(event) =>
                        updateDraft(
                          "endorsements",
                          draft.endorsements.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  year: Number(event.target.value) || new Date().getFullYear()
                                }
                              : item
                          )
                        )
                      }
                      className={classNames(fieldClasses, "w-[70px] shrink-0")}
                      placeholder="Year"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft(
                          "endorsements",
                          draft.endorsements.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="mt-3 text-sm text-[var(--sand-700)] transition hover:text-[var(--text)]"
                      aria-label={`Remove endorsement ${index + 1}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateDraft("endorsements", [
                    ...draft.endorsements,
                    {
                      source: "",
                      award: "",
                      year: new Date().getFullYear()
                    }
                  ]);
                  setPendingEndorsementFocus(draft.endorsements.length);
                }}
                className="text-sm text-[var(--sand-700)] underline decoration-[var(--sand-500)] underline-offset-4 transition hover:text-[var(--text)]"
              >
                + Add endorsement
              </button>
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

function ListSelector({
  availableLists,
  onAssign,
  onCreateList
}: {
  availableLists: ListOption[];
  onAssign: (listKey: string) => void;
  onCreateList: (payload: {
    name: string;
    list_type: string;
    occasion?: string;
    year?: string;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [listType, setListType] = useState<string>("themed");
  const [occasion, setOccasion] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="w-full border border-[var(--sand-300)] bg-[var(--white)] px-3 py-3 text-left text-sm text-[var(--text)] outline-none transition hover:border-[var(--black)]"
      >
        Add to list...
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 border border-[var(--sand-300)] bg-white">
          {availableLists.map((list) => (
            <button
              key={list._key}
              type="button"
              onClick={() => {
                onAssign(list._key);
                setOpen(false);
              }}
              className="block w-full border-b border-[var(--sand-200)] px-3 py-3 text-left text-sm transition hover:bg-[var(--sand-100)] last:border-b-0"
            >
              {list.name}
            </button>
          ))}
          <div className="border-t border-[var(--sand-200)]">
            <button
              type="button"
              onClick={() => setShowCreate((current) => !current)}
              className="block w-full px-3 py-3 text-left text-sm transition hover:bg-[var(--sand-100)]"
            >
              + Create new list
            </button>
            {showCreate ? (
              <div className="space-y-3 border-t border-[var(--sand-200)] px-3 py-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Summer Edit 2026"
                  className={fieldClasses}
                />
                <select
                  value={listType}
                  onChange={(event) => setListType(event.target.value)}
                  className={fieldClasses}
                >
                  {listTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {(listType === "occasion" || listType === "seasonal") ? (
                  <select
                    value={occasion}
                    onChange={(event) => setOccasion(event.target.value)}
                    className={fieldClasses}
                  >
                    <option value="">Occasion (optional)</option>
                    {occasionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className={fieldClasses}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setError("");
                    }}
                    className="border border-[var(--sand-300)] px-3 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={creating || !name.trim()}
                    onClick={async () => {
                      setCreating(true);
                      setError("");
                      try {
                        await onCreateList({
                          name: name.trim(),
                          list_type: listType,
                          occasion: occasion || undefined,
                          year: year.trim() || undefined
                        });
                        setOpen(false);
                        setShowCreate(false);
                        setName("");
                        setOccasion("");
                        setYear(String(new Date().getFullYear()));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to create list");
                      } finally {
                        setCreating(false);
                      }
                    }}
                    className="border border-[var(--black)] bg-[var(--black)] px-3 py-2 text-sm font-medium text-[var(--white)] disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
                {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function TagBucket({
  label,
  items,
  renderActions,
  tone
}: {
  label: string;
  items: string[];
  renderActions: (tag: string) => ReactNode;
  tone: "pending" | "suggested";
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--sand-700)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((tag) => (
          <span
            key={tag}
            className={classNames(
              "inline-flex items-center gap-2 border px-3 py-2 text-sm",
              tone === "pending"
                ? "border border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]"
                : "border border-dashed border-[var(--sand-500)] bg-white text-[var(--sand-900)]"
            )}
          >
            <span>{tone === "pending" ? `? ${tag}` : tag}</span>
            <span className="flex items-center gap-2 text-xs">{renderActions(tag)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DecisionPrompt({
  tone,
  value,
  placeholder,
  onChange,
  rejectionPreset,
  onRejectionPresetChange,
  onPrimary,
  onSecondary,
  busy,
  error = false
}: {
  tone: "approve" | "reject";
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  rejectionPreset?: string;
  onRejectionPresetChange?: (value: string) => void;
  onPrimary: () => void;
  onSecondary: () => void;
  busy: boolean;
  error?: boolean;
}) {
  const rejectionGroupName = useId();

  return (
    <div
      className={classNames(
        "p-4",
        tone === "approve"
          ? "border border-[var(--sand-300)] bg-[var(--sand-100)]"
          : "border border-[var(--error)] bg-[var(--error-light)]"
      )}
    >
      {tone === "reject" ? (
        <div className="mb-3 space-y-2">
          {rejectionPresetOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 border border-[var(--sand-300)] bg-white px-3 py-2 text-sm text-[var(--text)]"
            >
              <input
                type="radio"
                name={rejectionGroupName}
                value={option.value}
                checked={rejectionPreset === option.value}
                onChange={(event) => onRejectionPresetChange?.(event.target.value)}
                className="h-4 w-4 accent-[var(--error)]"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={classNames(
          "w-full border bg-white px-3 py-3 text-sm outline-none",
          error ? "border-[var(--error)]" : "border-[var(--sand-300)]"
        )}
        placeholder={placeholder}
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onPrimary}
          className={classNames(
            "flex-1 border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
            tone === "approve"
              ? "border-[var(--black)] bg-[var(--black)] text-[var(--white)] hover:bg-[var(--white)] hover:text-[var(--black)]"
              : "border-[var(--error)] bg-[var(--white)] text-[var(--error)] hover:bg-[var(--error-light)]"
          )}
        >
          {tone === "approve" ? "Save reason" : "Confirm rejection"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSecondary}
          className={classNames(
            "border px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
            tone === "approve"
              ? "border-[var(--sand-300)] text-[var(--sand-900)]"
              : "border-[var(--error)] text-[var(--error)]"
          )}
        >
          {tone === "approve" ? "Skip" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

export function EmptyState({
  contentTab,
  status
}: {
  contentTab: ContentTab;
  status: "pending" | "approved" | "rejected";
}) {
  const content = {
    requests: {
      title: "No client requests found",
      description: "Fast-track requests from Research Hub will appear here."
    },
    shopping: {
      title: `No ${status} candidates for Shopping`,
      description: "Run the catalogue pipeline to scrape new products."
    },
    going_out: {
      title: `No ${status} candidates for Going out`,
      description: "Run the Trend Radar pipeline to populate."
    },
    travel: {
      title: "No travel content found",
      description: "Run the Trend Radar against travel sources to populate."
    },
    staying_in: {
      title: `No ${status} candidates for Staying in`,
      description: "Run the Trend Radar pipeline to populate."
    }
  }[contentTab];

  return (
    <div className="border border-dashed border-[var(--sand-300)] bg-[var(--sand-100)] px-6 py-10 text-center">
      <p className="font-display text-2xl text-[var(--text)]">{content.title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--sand-900)]">
        {content.description}
      </p>
    </div>
  );
}

export function Pill({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "theme" | "neutral" | "list" | "data" | "amber" | "green" | "red";
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-2 border px-3 py-1.5 text-sm",
        tone === "theme" &&
          "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--text)]",
        tone === "neutral" &&
          "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]",
        tone === "list" &&
          "border-[var(--list-border)] bg-[var(--list-background)] text-[var(--list-text)]",
        tone === "data" &&
          "border-[var(--sand-300)] bg-[var(--sand-100)] text-[var(--sand-900)]",
        tone === "amber" && "border-[var(--black)] bg-[var(--sand-100)] text-[var(--text)]",
        tone === "green" && "border-[var(--approved-green)] bg-[var(--approved-bg)] text-[var(--approved-text)]",
        tone === "red" && "border-[var(--rejected-red)] bg-[var(--rejected-bg)] text-[var(--rejected-text)]"
      )}
    >
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.16em] text-[var(--sand-700)]">
      {children}
    </p>
  );
}
