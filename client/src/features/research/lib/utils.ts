import { Recommendation } from "./types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatPrice(rec: Recommendation) {
  if (rec.price_text) return rec.price_text;
  if (typeof rec.price_pence === "number") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(rec.price_pence / 100);
  }
  return "Price TBC";
}

export function getRecommendationTags(rec: Recommendation) {
  return rec.resolved_tags?.length ? rec.resolved_tags : rec.tags ?? [];
}

export function getRecommendationSourceLabel(rec: Recommendation) {
  if (rec.source_url) {
    try {
      return titleCase(new URL(rec.source_url).hostname.replace(/^www\./, "").split(".")[0] ?? "");
    } catch {
      return rec.curated_by ?? rec.source_name ?? rec.source ?? "Curated";
    }
  }

  return rec.curated_by ?? rec.source_name ?? rec.source ?? "Curated";
}

export function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function deriveSourceName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const [root] = hostname.split(".");
    return titleCase(root);
  } catch {
    return "";
  }
}

export function deriveContentFocus(url: string) {
  const lower = url.toLowerCase();
  if (/(\/fashion|\/style|\/shopping|\/buy|\/products|\/collections)/.test(lower)) return "Shopping";
  if (/(\/restaurant|\/food|\/eat|\/dine|\/best-restaurants)/.test(lower)) return "Restaurants";
  if (/(\/hotel|\/stay|\/accommodation)/.test(lower)) return "Hotels";
  if (/(\/travel|\/destination|\/places)/.test(lower)) return "Travel";
  return "";
}

export function truncateMiddle(value: string, max = 52) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 12)}...${value.slice(-9)}`;
}

export function relativeTime(iso: string) {
  const date = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
