/// <reference path="../pb_data/types.d.ts" />

// Generate random 4-character alphanumeric code
function randomCode(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Slugs that conflict with /itinerary/* route paths
const RESERVED_SLUGS = ['create', 'edit', 'preview', 'list', 'section-builder', 'meals'];

function isReservedSlug(slug) {
  return RESERVED_SLUGS.indexOf(slug.toLowerCase().trim()) !== -1;
}

// Generate slug from title
function generateSlug(title) {
  const words = (title || 'trip')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 2);

  const code = randomCode(4);
  return words.length > 0 ? `${words.join('-')}-${code}` : `trip-${code}`;
}

// Hook: Auto-generate slug on project creation
onRecordBeforeCreateRequest((e) => {
  const record = e.record;

  if (e.collection.name !== 'projects') return;

  const providedSlug = record.get('customUrlSlug');

  // Reject reserved slugs provided by the client
  if (providedSlug && isReservedSlug(providedSlug)) {
    record.set('customUrlSlug', providedSlug + '-trip-' + randomCode(4));
  }

  if (!record.get('customUrlSlug')) {
    const title = record.get('name') || 'trip';
    let slug = generateSlug(title);

    // If the base words form a reserved slug, add a suffix
    const baseWords = (title || 'trip')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(function(w) { return w.length > 0; })
      .slice(0, 2)
      .join('-');

    if (isReservedSlug(baseWords)) {
      slug = baseWords + '-trip-' + randomCode(4);
    }

    // Check uniqueness
    let counter = 1;
    let maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const existing = $app.dao().findFirstRecordByFilter(
        'projects',
        'customUrlSlug = {:slug}',
        { slug: slug }
      );

      if (!existing) break;

      slug = `${generateSlug(title)}-${counter}`;
      counter++;
      attempts++;
    }

    record.set('customUrlSlug', slug);
  }
}, 'projects');
