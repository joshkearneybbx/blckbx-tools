import type { IGCarouselContent } from "../types";

function stripAllFlags(text: string): string {
  return text.replace(/\[\[\?:(.*?)\]\]/g, "$1");
}

export function carouselToMarkdown(content: IGCarouselContent): string {
  if (!content.cover) {
    return "";
  }

  const lines: string[] = [];
  lines.push(`# ${stripAllFlags(content.cover.headline)}`);
  lines.push("");

  content.items.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${stripAllFlags(item.name)}`);
    lines.push("");
    lines.push(stripAllFlags(item.body));

    if (item.image_url) {
      lines.push("");
      lines.push(`![${stripAllFlags(item.name)}](${item.image_url})`);
    }

    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("**Caption:**");
  lines.push(stripAllFlags(content.caption));
  lines.push("");
  lines.push(`**Hashtags:** ${content.hashtags.map((hashtag) => `#${hashtag}`).join(" ")}`);

  return lines.join("\n");
}
