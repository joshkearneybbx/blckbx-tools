/**
 * Slugs that conflict with /itinerary/* route paths.
 * These cannot be used as custom URL slugs for itineraries.
 */
export const RESERVED_SLUGS = [
  'create',
  'edit',
  'preview',
  'list',
  'section-builder',
  'meals',
] as const;

/**
 * Check whether a slug exactly matches a reserved slug (case-insensitive).
 */
export function isReservedSlug(slug: string): boolean {
  const normalized = slug.toLowerCase().trim();
  return RESERVED_SLUGS.some((reserved) => normalized === reserved);
}
