import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string | null;
  status: "active" | "coming-soon" | "placeholder";
  badge?: string;
}

interface ToolCardProps {
  tool: Tool;
  featured?: boolean;
  animationDelay?: number;
  onClick?: () => void;
}

export function ToolCard({
  tool,
  featured = false,
  animationDelay = 0,
  onClick,
}: ToolCardProps) {
  const isActive = tool.status === "active";
  const isComingSoon = tool.status === "coming-soon";
  const isPlaceholder = tool.status === "placeholder";
  const isNavigable = Boolean(tool.href && !isPlaceholder);
  const isDisabled = !isNavigable || isComingSoon;

  const cardClassName = [
    "group relative overflow-hidden border p-8 text-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]",
    "flex min-h-[190px] flex-col items-center justify-center gap-5 rounded-none",
    featured
      ? "border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] md:col-span-2"
      : "border-[rgba(0,0,0,0.08)] bg-[#FAFAF8] text-[#0A0A0A]",
    isDisabled
      ? "cursor-default opacity-50"
      : "cursor-pointer hover:-translate-y-[3px] hover:border-[rgba(0,0,0,0.18)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
    featured && !isDisabled ? "hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]" : "",
  ].join(" ");

  const badgeClasses = tool.badge
    ? "bg-[#0A0A0A] text-[#FAFAF8]"
    : featured
      ? "bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.7)]"
      : "bg-[#E8E2D6] text-[rgba(0,0,0,0.45)]";

  const content = (
    <>
      {featured ? (
        <span className="absolute left-5 top-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)]">
          Most used
        </span>
      ) : null}

      {(tool.badge || isComingSoon) ? (
        <span
          className={`absolute right-4 top-4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] rounded-none ${badgeClasses}`}
        >
          {tool.badge}
          {!tool.badge && isComingSoon ? "Coming Soon" : null}
        </span>
      ) : (
        <span
          className={`absolute right-4 top-4 transition-all duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)] ${
            isDisabled
              ? "opacity-0"
              : featured
                ? "text-[rgba(255,255,255,0.5)] opacity-0 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                : "translate-x-[-4px] translate-y-[4px] text-[rgba(0,0,0,0.45)] opacity-0 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
      )}

      <div
        className={[
          "flex h-12 w-12 items-center justify-center border-[1.5px] rounded-none transition-all duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)]",
          featured
            ? "border-[rgba(255,255,255,0.3)] text-[#FAFAF8]"
            : "border-[#0A0A0A] text-[#0A0A0A]",
          !isDisabled && featured
            ? "group-hover:border-[#FAFAF8] group-hover:bg-[#FAFAF8] group-hover:text-[#0A0A0A]"
            : "",
          !isDisabled && !featured
            ? "group-hover:border-[#0A0A0A] group-hover:bg-[#0A0A0A] group-hover:text-[#FAFAF8]"
            : "",
        ].join(" ")}
      >
        <tool.icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
      </div>

      <h2
        className={`font-serif text-[17px] font-medium tracking-[-0.2px] ${isPlaceholder ? "text-gray-400" : ""}`}
      >
        {tool.name}
      </h2>

      <span
        className={`absolute bottom-0 left-0 h-[3px] w-full origin-left scale-x-0 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)] ${
          featured ? "bg-[#FAFAF8]" : "bg-[#0A0A0A]"
        } ${isDisabled ? "" : "group-hover:scale-x-100"}`}
      />
    </>
  );

  const style = {
    animation: `fadeUp 0.45s ease-out both`,
    animationDelay: `${animationDelay}s`,
  } as const;

  if (isDisabled) {
    return (
      <div className={cardClassName} style={style}>
        {content}
      </div>
    );
  }

  if (tool.href && /^https?:\/\//.test(tool.href)) {
    return (
      <a href={tool.href} className={cardClassName} style={style} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={cardClassName} style={style} onClick={onClick}>
      {content}
    </button>
  );
}
