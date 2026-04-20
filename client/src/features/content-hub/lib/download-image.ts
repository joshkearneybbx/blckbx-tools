/**
 * Downloads a cross-origin image as a file. Cannot use native `<a download>`
 * attribute because it's ignored for cross-origin URLs in most browsers.
 * Fetches the image as a blob, creates an object URL, triggers a synthetic click.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the blob URL after the click has been processed
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
}

/**
 * Derives a filename-safe slug from the carousel headline and a tile label.
 * e.g. ("5 Unmissable Stays For Summer", "cover")
 *      → "5-unmissable-stays-for-summer-cover"
 */
export function buildImageFilename(carouselHeadline: string, tileLabel: string, extension = "jpg"): string {
  const slug = carouselHeadline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60); // keep filenames reasonable
  return `${slug || "carousel"}-${tileLabel}.${extension}`;
}

/**
 * Best-effort: infer the file extension from the URL. Defaults to 'jpg'.
 */
export function inferImageExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(jpg|jpeg|png|webp|gif|avif)(?:$|\?)/);
    return match ? (match[1] === "jpeg" ? "jpg" : match[1]) : "jpg";
  } catch {
    return "jpg";
  }
}
