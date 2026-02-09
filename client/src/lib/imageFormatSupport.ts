const unsupportedImageFormats = [".avif", ".webp", ".svg", ".gif"];

export const isImageFormatSupportedForPdf = (url: string): boolean => {
  if (!url) return true;
  const lower = url.toLowerCase();
  return !unsupportedImageFormats.some(
    (fmt) =>
      lower.endsWith(fmt) ||
      lower.includes(`${fmt}?`) ||
      lower.includes(`${fmt}#`)
  );
};

export const getImageFormatFromUrl = (url: string): string | null => {
  if (!url) return null;
  const lower = url.toLowerCase();
  const match = lower.match(/\.(avif|webp|svg|gif|jpe?g|png)(\?|#|$)/);
  return match ? match[1].toUpperCase() : null;
};
