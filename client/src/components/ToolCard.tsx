import { Link } from "wouter";
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
}

export function ToolCard({ tool }: ToolCardProps) {
  const isActive = tool.status === "active";
  const isComingSoon = tool.status === "coming-soon";
  const isPlaceholder = tool.status === "placeholder";
  const isExternal = Boolean(tool.href && /^https?:\/\//.test(tool.href));
  const isNavigable = Boolean(tool.href && !isPlaceholder);

  const cardClassName = `
    relative bg-[#FAFAF8] rounded-none p-8 text-center
    border border-[#D4D0CB] shadow-none transition-colors duration-200
    ${isNavigable ? "hover:border-[#0A0A0A] cursor-pointer" : ""}
    ${isPlaceholder ? "opacity-50" : ""}
  `;

  const content = (
    <>
      {tool.badge ? (
        <span className="absolute top-4 right-4 bg-[#0A0A0A] text-[#FAFAF8] text-xs font-medium px-2 py-0.5 rounded-none">
          {tool.badge}
        </span>
      ) : null}

      {isComingSoon && !tool.badge && (
        <span className="absolute top-4 right-4 bg-[#0A0A0A] text-[#FAFAF8] text-xs font-medium px-2 py-0.5 rounded-none">
          Coming Soon
        </span>
      )}

      <div
        className={`
          w-16 h-16 mx-auto mb-4 rounded-none flex items-center justify-center
          ${isActive ? "bg-[#1a1a1a] text-white" : "bg-gray-100 text-gray-400"}
        `}
      >
        <tool.icon className="w-8 h-8" />
      </div>

      <h2
        className={`text-lg font-semibold mb-2 ${isPlaceholder ? "text-gray-400" : "text-[#1a1a1a]"}`}
      >
        {tool.name}
      </h2>
    </>
  );

  if (isNavigable && tool.href && isExternal) {
    return (
      <a href={tool.href} className={cardClassName}>
        {content}
      </a>
    );
  }

  if (isNavigable && tool.href) {
    return (
      <Link href={tool.href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
