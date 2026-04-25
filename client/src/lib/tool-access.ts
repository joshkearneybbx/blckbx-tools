export type ToolSlug =
  | "foh"
  | "approval"
  | "research"
  | "content-hub"
  | "travel-hub"
  | "itinerary"
  | "shortlists"
  | "task-guide"
  | "big-purchases"
  | "meals";

export const TOOL_SLUGS: ToolSlug[] = [
  "foh",
  "approval",
  "research",
  "content-hub",
  "travel-hub",
  "itinerary",
  "shortlists",
  "task-guide",
  "big-purchases",
  "meals",
];

export function isToolSlug(value: string): value is ToolSlug {
  return TOOL_SLUGS.includes(value as ToolSlug);
}
