/**
 * Image Proxy Utility for PDF Generation
 *
 * NOTE: This is primarily used when images haven't been pre-converted to base64.
 * For best results, use the imageToBase64 utility to convert images before rendering.
 *
 * The proxy is hosted at: https://n8n.blckbx.co.uk/webhook/image-proxy
 */

const PROXY_BASE_URL = 'https://n8n.blckbx.co.uk/webhook/image-proxy';

/**
 * Check if a URL is from PocketBase (local, CORS-friendly)
 */
function isPocketBaseUrl(url: string): boolean {
  return url.includes('pocketbase.blckbx.co.uk');
}

/**
 * Check if a URL is a data URI (already encoded as base64)
 */
function isDataUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

/**
 * Check if a URL is a local asset (starts with /)
 */
function isLocalAsset(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Returns a URL for image rendering in PDFs.
 *
 * - Data URIs (base64) are returned as-is EXCEPT WebP (not supported)
 * - PocketBase images are returned as-is (CORS-friendly)
 * - External images are proxied through n8n
 *
 * @param originalUrl - The original image URL or base64 data URI
 * @returns Either the original URL/data URI or a proxied URL
 */
export function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl || typeof originalUrl !== 'string') {
    return '';
  }

  let url = originalUrl.trim();

  if (url === '') {
    return '';
  }

  // Base64 data URIs - check for WebP which is not supported by react-pdf
  if (isDataUrl(url)) {
    // Reject WebP data URIs - react-pdf doesn't support them
    if (url.includes('image/webp') || url.includes('webp')) {
      console.warn('[ImageProxy] WebP data URI rejected (not supported by react-pdf):', url.substring(0, 50));
      return '';
    }
    return url;
  }

  // PocketBase images work directly (CORS-friendly)
  if (isPocketBaseUrl(url)) {
    return url;
  }

  // Local assets - convert to absolute in browser, return as-is for PDF
  if (isLocalAsset(url)) {
    if (typeof window !== 'undefined') {
      return window.location.origin + url;
    }
    return url;
  }

  // Protocol-relative URLs - convert to https
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }

  // External images - use proxy
  return `${PROXY_BASE_URL}?url=${encodeURIComponent(url)}`;
}

/**
 * Batch process multiple image URLs through the proxy.
 *
 * @param urls - Array of image URLs
 * @returns Array of proxied URLs
 */
export function getProxiedImageUrls(urls: string[]): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map(getProxiedImageUrl);
}
