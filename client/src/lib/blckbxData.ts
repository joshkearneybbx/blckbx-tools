import { z } from "zod";

/**
 * BlckBx structured-data schema (blckbx-data).
 *
 * SINGLE SOURCE OF TRUTH for the JSON blob embedded in guide HTML as
 * <script type="application/json" id="blckbx-data"> and stored in Links'
 * files.data_json column.
 *
 * Design:
 *  - A THIN shared base (the envelope every template carries).
 *  - A discriminated union on `type`, one branch per STRUCTURAL template.
 *  - `subtype` is a free string WITHIN a type (gym-guide vs restaurant-guide
 *    are the same shape, different content — not separate branches).
 *
 * Adding a template later is ADDITIVE: write its branch, add it to the union.
 * Nothing about existing branches or the base changes. Do not widen the base
 * until a second real template proves a field is genuinely shared.
 */

/* ------------------------------------------------------------------ */
/* Shared base — deliberately minimal. Only fields believed universal. */
/* ------------------------------------------------------------------ */

/**
 * meta: the base guarantees only what ANY BlckBx document would carry.
 * Template-specific meta fields (location, sourceNote, preHeading, intro,
 * compiledBy…) live here as OPTIONAL for now — they're present on area-guide
 * but not asserted for future templates. When a second template settles,
 * promote the ones that are truly common to required, or move template-only
 * ones into that template's own meta extension.
 */
export const BaseMeta = z.object({
  title: z.string(),
  documentTitle: z.string().optional(),
  preparedFor: z.string().nullable().optional(),
  // present on area-guide; not yet asserted universal:
  preHeading: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  compiledBy: z.string().nullable().optional(),
  sourceNote: z.string().nullable().optional(),
  intro: z.string().nullable().optional(),
});

/** Fields on the envelope of every blob, regardless of type. */
const baseEnvelope = {
  blckbxDataVersion: z.literal(1),
  subtype: z.string().min(1),
  meta: BaseMeta,
};

/* ------------------------------------------------------------------ */
/* area-guide branch — authored against the live production blob.      */
/* ------------------------------------------------------------------ */

const Reason = z.object({
  headline: z.string(),
  detail: z.string(),
});

const Alternative = z.object({
  forWhat: z.string(),
  suggestion: z.string(),
});

/** A listed venue — used both inside sections and (extended) as the pick. */
const AreaGuideEntry = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().int().nullable().optional(),
  address: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  mapsUrl: z.string().url().nullable().optional(),
  website: z.string().url().nullable().optional(),
});

/** The "Our pick" callout: an entry plus reasons/alternatives. */
const AreaGuidePick = AreaGuideEntry.extend({
  reasons: z.array(Reason).default([]),
  alternatives: z.array(Alternative).default([]),
});

const AreaGuideSection = z.object({
  id: z.string(),
  label: z.string(),
  title: z.string(),
  entries: z.array(AreaGuideEntry),
});

const FooterCta = z.object({
  eyebrow: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  footline: z.string().optional(),
});

export const AreaGuideData = z.object({
  ...baseEnvelope,
  type: z.literal("area-guide"),
  pick: AreaGuidePick.nullable().optional(),
  sections: z.array(AreaGuideSection),
  footerCta: FooterCta.nullable().optional(),
});

/* ------------------------------------------------------------------ */
/* comparison branch — authored against the live production blob         */
/* (water-filter-comparison). Modelled as a provider × attribute MATRIX,  */
/* which is how the generator emits it and how the compare table renders. */
/* ------------------------------------------------------------------ */

/**
 * One column of the comparison: a provider/product being compared.
 * `isPick` is the SOURCE OF TRUTH for the recommendation (see pickIndex note).
 */
const ComparisonProvider = z.object({
  name: z.string(),
  isPick: z.boolean().default(false),
  website: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  mapsUrl: z.string().url().nullable().optional(),
});

/**
 * One row of the comparison: a labelled attribute whose `values` are
 * positionally aligned to `providers` (values[i] belongs to providers[i]).
 * The generator guarantees values.length === providers.length; we do NOT
 * assert it here so a slightly-ragged real blob still validates rather than
 * fail-open-rejecting — the renderer tolerates missing cells.
 */
const ComparisonAttribute = z.object({
  label: z.string(),
  values: z.array(z.string()),
});

/**
 * The pick callout. `providerIndex`/`pickIndex` are ADVISORY and NOT
 * asserted as valid array indices — the live blob carries pickIndex: 2 with
 * only 2 providers (1-based / legacy), so bounding it would reject real data.
 * Resolve the picked provider via providers[].isPick, not this number.
 */
const ComparisonPick = z.object({
  providerIndex: z.number().nullable().optional(),
  providerName: z.string().nullable().optional(),
  reasons: z.array(Reason).default([]),          // {headline, detail} — reused from area-guide
});

export const ComparisonData = z.object({
  ...baseEnvelope,
  type: z.literal("comparison"),
  pickIndex: z.number().nullable().optional(),   // advisory; see ComparisonPick note
  providers: z.array(ComparisonProvider),
  attributes: z.array(ComparisonAttribute),
  pick: ComparisonPick.nullable().optional(),
  footerCta: FooterCta.nullable().optional(),    // reused from area-guide
});

/* ------------------------------------------------------------------ */
/* shortlist branch — authored against the live production blob          */
/* (events-shortlist). A flat list of options with one designated pick.   */
/* ------------------------------------------------------------------ */

/**
 * One shortlisted option. Fields beyond id/name are all nullable-optional:
 * the generator emits the full key set per option but nulls what a given
 * subtype doesn't use (an events shortlist fills date/venue/ticketUrl;
 * another subtype might fill different ones). Keeping them optional lets one
 * shortlist branch serve every subtype without a shape change.
 */
const ShortlistOption = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  ticketUrl: z.string().url().nullable().optional(),
  mapsUrl: z.string().url().nullable().optional(),
  isPick: z.boolean().default(false),
});

const ShortlistPick = z.object({
  optionId: z.string(),
  optionName: z.string().nullable().optional(),
  reasons: z.array(Reason).default([]),          // {headline, detail} — reused from area-guide
});

export const ShortlistData = z.object({
  ...baseEnvelope,
  type: z.literal("shortlist"),
  options: z.array(ShortlistOption),
  pick: ShortlistPick.nullable().optional(),
  footerCta: FooterCta.nullable().optional(),    // reused from area-guide
});

/* ------------------------------------------------------------------ */
/* Future templates — stub each branch as it settles, then add to union.
 *
 *   export const ItineraryData = z.object({
 *     ...baseEnvelope,
 *     type: z.literal("itinerary"),
 *     // ...itinerary-specific body, authored against a finished blob...
 *   });
 *
 * Then add ItineraryData to the discriminatedUnion list below.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* The union + inferred types.                                         */
/* ------------------------------------------------------------------ */

export const BlckbxData = z.discriminatedUnion("type", [
  AreaGuideData,
  ComparisonData,
  ShortlistData,
  // ItineraryData,
]);

export type BlckbxData = z.infer<typeof BlckbxData>;
export type AreaGuideData = z.infer<typeof AreaGuideData>;
export type ComparisonData = z.infer<typeof ComparisonData>;
export type ShortlistData = z.infer<typeof ShortlistData>;

/* ------------------------------------------------------------------ */
/* Fail-open parse for the extractor — see note below on why.          */
/* ------------------------------------------------------------------ */

/**
 * Base-envelope-only check, used when `type` isn't a known union branch yet
 * (expected DURING template build-out). Lets a new template's blob still be
 * stored, validated at the envelope level, without a strict branch existing.
 */
const BaseEnvelopeOnly = z.object({
  ...baseEnvelope,
  type: z.string().min(1),
});

export type BlckbxParseResult =
  | { status: "valid"; type: string; data: BlckbxData }
  | { status: "envelope-only"; type: string; data: unknown } // known-shaped envelope, unknown type
  | { status: "invalid"; error: string };

/**
 * Validate a parsed blob WITHOUT throwing. The Links extractor must stay
 * fail-open: a bad blob is logged and stored-or-nulled, never a reason to
 * reject the HTML upload or break the client link.
 */
export function validateBlckbxData(input: unknown): BlckbxParseResult {
  const full = BlckbxData.safeParse(input);
  if (full.success) {
    return { status: "valid", type: full.data.type, data: full.data };
  }
  // Not a known/strict branch. Is it at least a well-formed envelope with a
  // type we don't have a branch for yet? (Normal mid-build.)
  const env = BaseEnvelopeOnly.safeParse(input);
  if (env.success) {
    return { status: "envelope-only", type: env.data.type, data: input };
  }
  return { status: "invalid", error: full.error.message };
}
