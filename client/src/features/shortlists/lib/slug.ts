export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function ensureUniqueSlug(
  baseSlug: string,
  excludeId: string | null,
  checkFn: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;
  while (await checkFn(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
  return slug;
}
