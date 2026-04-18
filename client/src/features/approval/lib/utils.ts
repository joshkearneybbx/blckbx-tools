import type {
  CatalogueItem,
  CatalogueStatus,
  ContentTab,
  ProductCandidate
} from "./types";

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function statusLabel(status: CatalogueStatus) {
  if (status === "approved") {
    return "Review";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function contentTabLabel(contentTab: ContentTab) {
  return {
    requests: "Requests",
    shopping: "Shopping",
    going_out: "Going out",
    travel: "Travel",
    staying_in: "Staying in"
  }[contentTab];
}

export function truncateUrl(url: string) {
  if (!url) {
    return "";
  }
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function formatPrice(candidate: ProductCandidate) {
  if (candidate.price_text) {
    return candidate.price_text;
  }

  const pricePence = typeof candidate.price_pence === "number" ? candidate.price_pence : null;
  if (pricePence !== null && pricePence > 0) {
    return `£${(pricePence / 100).toFixed(2)}`;
  }

  return "Price TBC";
}

export function formatAvailability(availability: ProductCandidate["availability"]) {
  return availability === "in_stock" ? "In stock" : "Out of stock";
}

export function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatLocation(item: CatalogueItem) {
  if (item.collection !== "trend_candidates") {
    return "";
  }
  return item.location ?? "";
}

export function getPrimaryLink(item: CatalogueItem) {
  if (item.content_tab === "shopping") {
    const href = item.product_url || item.resolved_url || item.candidate_url || undefined;
    return href ? { href, label: truncateUrl(href) } : null;
  }
  return item.source_url ? { href: item.source_url, label: truncateUrl(item.source_url) } : null;
}

export function getEmptyStateCopy(contentTab: ContentTab) {
  return {
    requests: {
      title: "No requests to review",
      description: "Fast-track client requests will appear here as they are submitted."
    },
    shopping: {
      title: "No products to review",
      description: "Run the catalogue pipeline to scrape new products."
    },
    going_out: {
      title: "No venues to review",
      description: "The Trend Radar will surface new openings and recommendations."
    },
    travel: {
      title: "No travel content to review",
      description: "Editorial scrapes will populate this tab."
    },
    staying_in: {
      title: "No recipes or entertainment to review",
      description: "Content will appear as sources are scraped."
    }
  }[contentTab];
}
