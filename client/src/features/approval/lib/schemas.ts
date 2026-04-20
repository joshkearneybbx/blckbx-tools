import { z } from "zod";

import { catalogueStatuses, contentTabs } from "./types";

export const candidateSchema = z.object({
  _key: z.string(),
  collection: z.enum(["product_candidates", "trend_candidates"]),
  content_tab: z.enum(contentTabs),
  content_type: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  source_name: z.string(),
  scrape_source: z.string(),
  tags: z.array(z.string()),
  suggested_themes: z.array(z.string()),
  status: z.enum(catalogueStatuses),
  curation_reason: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  assigned_lists: z.array(z.string()),
  created_at: z.string(),
  url_status: z.enum(["ok", "broken", "unknown"]).optional(),
  brand: z.string().nullable().optional(),
  price_text: z.string().nullable().optional(),
  price_pence: z.number().nullable().optional(),
  product_url: z.string().optional(),
  availability: z.enum(["in_stock", "out_of_stock"]).optional(),
  currency: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  gender_focus: z.string().nullable().optional(),
  age_suitability: z.string().nullable().optional(),
  already_in_catalogue: z.boolean().optional(),
  location: z.string().nullable().optional(),
  confidence: z.enum(["low", "medium", "high"]).nullable().optional(),
  signal_phrase: z.string().nullable().optional(),
  source_excerpt: z.string().nullable().optional(),
  source_url: z.string().optional()
});

export const catalogueResponseSchema = z.object({
  items: z.array(candidateSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number()
});

export const sidebarCountsSchema = z.object({
  shopping: z.number(),
  going_out: z.number(),
  travel: z.number(),
  staying_in: z.number()
});

export const listOptionSchema = z.object({
  _key: z.string(),
  name: z.string(),
  list_type: z.string()
});

export const listsResponseSchema = z.object({
  items: z.array(listOptionSchema)
});
