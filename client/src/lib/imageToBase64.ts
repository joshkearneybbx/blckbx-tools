/**
 * Convert image URLs to base64 data URIs for PDF generation
 *
 * React-PDF can render base64 data URIs without any CORS issues.
 * This utility fetches images through the N8N proxy and converts them to base64.
 */

const PROXY_BASE_URL = 'https://n8n.blckbx.co.uk/webhook/image-proxy';

/**
 * Cache for converted images to avoid refetching
 */
const imageCache = new Map<string, string>();

/**
 * Convert an image URL to a base64 data URI
 *
 * @param url - The image URL to convert
 * @returns Promise resolving to base64 data URI or null if failed
 */
export const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl === '') {
    return null;
  }

  // Check cache first
  if (imageCache.has(trimmedUrl)) {
    return imageCache.get(trimmedUrl) || null;
  }

  // Don't convert PocketBase URLs (they work directly)
  if (trimmedUrl.includes('pocketbase.blckbx.co.uk')) {
    return trimmedUrl;
  }

  // Don't convert data URLs (already base64) - but check for WebP
  if (trimmedUrl.startsWith('data:')) {
    // If it's a WebP data URI, we need to convert it since react-pdf doesn't support WebP
    if (trimmedUrl.includes('image/webp')) {
      console.warn('[ImageToBase64] WebP data URI detected, cannot convert in browser (would require fetch), returning null:', trimmedUrl.substring(0, 50));
      return 'SKIP_WEBP'; // Special marker to indicate this should be skipped
    }
    return trimmedUrl;
  }

  try {
    console.log('[ImageToBase64] Converting:', trimmedUrl.substring(0, 60));

    // Try fetching through the proxy first
    const proxyUrl = `${PROXY_BASE_URL}?url=${encodeURIComponent(trimmedUrl)}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      console.warn('[ImageToBase64] Proxy fetch failed:', response.status, trimmedUrl);

      // If proxy fails, try direct fetch (might work for CORS-friendly images)
      const directResponse = await fetch(trimmedUrl);
      if (!directResponse.ok) {
        console.warn('[ImageToBase64] Direct fetch also failed:', directResponse.status);
        return null;
      }

      return await blobToBase64(directResponse.blob(), trimmedUrl);
    }

    const base64 = await blobToBase64(response.blob(), trimmedUrl);

    // Cache the result
    if (base64) {
      imageCache.set(trimmedUrl, base64);
    }

    return base64;
  } catch (error) {
    console.warn('[ImageToBase64] Failed to convert image:', trimmedUrl, error);
    return null;
  }
};

/**
 * Convert a blob to base64 data URI
 * Handles WebP format by converting to JPEG (react-pdf doesn't support WebP)
 */
async function blobToBase64(blob: Promise<Blob>, originalUrl: string): Promise<string | null> {
  try {
    const b = await blob;
    const contentType = b.type || '';

    // Check if it's WebP - react-pdf doesn't support WebP
    if (contentType === 'image/webp' || originalUrl.toLowerCase().includes('.webp')) {
      console.warn('[ImageToBase64] WebP format detected, converting to JPEG...');
      // Convert WebP to JPEG using Canvas
      return await convertWebPToJPEG(b, originalUrl);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('[ImageToBase64] Converted successfully:', originalUrl.substring(0, 60), '→', result.substring(0, 50) + '...');
        resolve(result);
      };
      reader.onerror = () => {
        console.warn('[ImageToBase64] FileReader error');
        resolve(null);
      };
      reader.readAsDataURL(b);
    });
  } catch (error) {
    console.warn('[ImageToBase64] Blob conversion error:', error);
    return null;
  }
}

/**
 * Convert WebP image to JPEG using Canvas API
 */
async function convertWebPToJPEG(blob: Blob, originalUrl: string): Promise<string | null> {
  try {
    // Create an image element
    const img = new Image();
    const imageUrl = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('[ImageToBase64] Could not get canvas context');
            URL.revokeObjectURL(imageUrl);
            resolve(null);
            return;
          }

          // Draw image and convert to JPEG
          ctx.drawImage(img, 0, 0);

          // Convert to base64 JPEG (quality 0.9)
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);

          console.log('[ImageToBase64] WebP converted to JPEG successfully');
          URL.revokeObjectURL(imageUrl);

          resolve(jpegDataUrl);
        } catch (error) {
          console.warn('[ImageToBase64] WebP to JPEG conversion failed:', error);
          URL.revokeObjectURL(imageUrl);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.warn('[ImageToBase64] Failed to load image for WebP conversion');
        URL.revokeObjectURL(imageUrl);
        resolve(null);
      };

      img.src = imageUrl;
    });
  } catch (error) {
    console.warn('[ImageToBase64] WebP conversion error:', error);
    return null;
  }
}

/**
 * Process items and convert their primary images to base64
 *
 * @param items - Array of items with primaryImage property
 * @returns Promise resolving to processed items with base64 images
 */
export const preprocessImagesForPDF = async <T extends { primaryImage?: string; images?: string[] }>(
  items: T[]
): Promise<T[]> => {
  if (!items || items.length === 0) {
    return [];
  }

  console.log(`[ImageToBase64] Processing ${items.length} items...`);

  const processed = await Promise.all(
    items.map(async (item) => {
      const updates: Partial<T> = {};

      // Convert primary image
      if (item.primaryImage) {
        const base64 = await imageUrlToBase64(item.primaryImage);
        if (base64 === 'SKIP_WEBP') {
          // WebP data URIs are not supported by react-pdf, remove the image
          console.warn('[ImageToBase64] Removing WebP data URI from item:', item.name || 'unnamed');
          updates.primaryImage = '';
        } else if (base64 && base64 !== item.primaryImage) {
          updates.primaryImage = base64;
        }
      }

      // Also convert first image in array if it exists and primaryImage doesn't
      if (!updates.primaryImage && item.images && item.images.length > 0) {
        const base64 = await imageUrlToBase64(item.images[0]);
        if (base64 === 'SKIP_WEBP') {
          // WebP data URIs are not supported, skip this image
          updates.primaryImage = '';
        } else if (base64) {
          updates.primaryImage = base64;
        }
      }

      // Return updated item or original if no changes
      return Object.keys(updates).length > 0 ? { ...item, ...updates } : item;
    })
  );

  const successCount = processed.filter((item, i) =>
    item.primaryImage?.startsWith('data:') && items[i].primaryImage && !items[i].primaryImage.startsWith('data:')
  ).length;

  console.log(`[ImageToBase64] Processed ${items.length} items, ${successCount} converted to base64`);

  return processed;
};

/**
 * Clear the image cache (useful for testing or when images change)
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Get cache statistics
 */
export function getImageCacheStats(): { size: number; keys: string[] } {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys()),
  };
}
