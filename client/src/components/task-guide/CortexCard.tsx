import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { TaskGuideCortexItem } from "@/hooks/task-guide/useTaskGuide";

interface CortexCardProps {
  item: TaskGuideCortexItem;
}

function extractImageUrl(images: unknown): string | null {
  if (!images) return null;
  if (typeof images === "string") return images || null;

  if (Array.isArray(images) && images.length > 0) {
    const first = images[0] as any;
    if (typeof first === "string") return first || null;
    if (first && typeof first.url === "string") return first.url;
  }

  return null;
}

function truncateDescription(value?: string): string {
  if (!value) return "";
  if (value.length <= 200) return value;
  return `${value.slice(0, 197).trim()}...`;
}

export function CortexCard({ item }: CortexCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = useMemo(() => extractImageUrl(item.images), [item.images]);

  const tags = [
    item.entity_type
      ? { label: item.entity_type, className: "bg-[#EEF2FF] text-[#4F46E5]" }
      : null,
    item.cuisine
      ? { label: item.cuisine, className: "bg-[#FAF9F8] text-[#6B6B68]" }
      : null,
    item.city
      ? { label: item.city, className: "bg-[#FEF3C7] text-[#92400E]" }
      : null,
    item.price_range
      ? { label: item.price_range, className: "bg-[#F0FDF4] text-[#065F46]" }
      : null,
  ].filter(Boolean) as Array<{ label: string; className: string }>;

  return (
    <article className="mb-2 overflow-hidden rounded-[8px] border border-[#E6E5E0] transition-colors last:mb-0 hover:border-[#AAA9A8] hover:bg-[#FAF9F8]">
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={item.name}
          onError={() => setImageError(true)}
          className="h-[120px] w-full object-cover"
          loading="lazy"
        />
      ) : null}

      <div className="p-3">
        <h3 className="mb-1 text-[13px] font-semibold text-[#1D1C1B]">{item.name}</h3>

        {tags.length > 0 ? (
          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <span key={`${item.name}-${tag.label}`} className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium ${tag.className}`}>
                {tag.label}
              </span>
            ))}
          </div>
        ) : null}

        {item.description ? (
          <p className="text-[12px] leading-[1.5] text-[#6B6B68]">{truncateDescription(item.description)}</p>
        ) : null}

        {item.website ? (
          <a
            href={item.website}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1D1C1B] hover:text-[#6B6B68]"
          >
            Visit website
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
