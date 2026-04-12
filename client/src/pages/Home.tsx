import {
  Plane,
  UtensilsCrossed,
  ClipboardList,
  ShoppingBag,
  LayoutDashboard,
  ClipboardCheck,
  Search,
} from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import type { ToolSlug } from "@/lib/tool-access";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";

type LauncherTool = Tool & {
  slug: ToolSlug;
};

const tools: LauncherTool[] = [
  {
    slug: "foh",
    id: "foh-dashboard",
    name: "FOH Dashboard",
    description: "Front of House dashboard for monitoring client activity",
    icon: LayoutDashboard,
    href: "/foh",
    status: "coming-soon",
  },
  {
    slug: "approval",
    id: "approval-catalogue",
    name: "Approval Catalogue",
    description: "Review and approve catalogue items for client-facing workflows",
    icon: ClipboardCheck,
    href: "/approval",
    status: "active",
  },
  {
    slug: "research",
    id: "research-hub",
    name: "Research Hub",
    description: "Centralised research workflows and discovery tools",
    icon: Search,
    href: "/research",
    status: "active",
  },
  {
    slug: "travel-hub",
    id: "travel-hub",
    name: "Travel Hub",
    description: "A consolidated workspace for the next phase of travel tools",
    icon: Plane,
    href: "/travel-hub",
    status: "active",
  },
  {
    slug: "itinerary",
    id: "travel-itineraries",
    name: "Itineraries",
    description: "Create and manage branded itineraries and travel lists",
    icon: Plane,
    href: "/itinerary",
    status: "active",
  },
  {
    slug: "task-guide",
    id: "task-guide",
    name: "Task Guide",
    description: "Not sure how to complete a task? Ask the Task Guide to help you",
    icon: ClipboardList,
    href: "/task-guide",
    status: "active",
    badge: "Testing",
  },
  {
    slug: "big-purchases",
    id: "big-purchases",
    name: "Big Purchases",
    description: "Flag a big client purchase for the partnerships team",
    icon: ShoppingBag,
    href: "/big-purchases",
    status: "active",
  },
  {
    slug: "meals",
    id: "meals",
    name: "Meals",
    description: "AI-powered meal planning with smart shopping lists",
    icon: UtensilsCrossed,
    href: "/meals",
    status: "active",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { logout, hasAccess } = useAuth();
  const [, setLocation] = useLocation();
  const [featuredSlug, setFeaturedSlug] = useState<ToolSlug | null>(null);
  const [isUsageLoaded, setIsUsageLoaded] = useState(false);
  const greeting = useMemo(() => getGreeting(), []);
  const visibleTools = useMemo(() => tools.filter((tool) => hasAccess(tool.slug)), [hasAccess]);

  useEffect(() => {
    let cancelled = false;
    const userId = pb.authStore.model?.id;

    if (!userId) {
      setIsUsageLoaded(true);
      return;
    }

    void pb
      .collection("tool_usage")
      .getFullList({
        filter: `user = "${userId}"`,
        fields: "tool_slug",
        requestKey: null,
      })
      .then((records) => {
        if (cancelled) return;

        const counts = new Map<ToolSlug, number>();
        for (const record of records as Array<{ tool_slug?: string }>) {
          const slug = record.tool_slug as ToolSlug | undefined;
          if (!slug) continue;
          counts.set(slug, (counts.get(slug) ?? 0) + 1);
        }

        if (!counts.size) {
          setFeaturedSlug(null);
          return;
        }

        let nextFeatured: ToolSlug | null = null;
        let bestCount = -1;

        for (const tool of tools) {
          const count = counts.get(tool.slug) ?? 0;
          if (count > bestCount) {
            bestCount = count;
            nextFeatured = count > 0 ? tool.slug : nextFeatured;
          }
        }

        setFeaturedSlug(nextFeatured);
      })
      .catch(() => {
        if (!cancelled) {
          setFeaturedSlug(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsUsageLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredTool =
    featuredSlug && visibleTools.some((tool) => tool.slug === featuredSlug)
      ? visibleTools.find((tool) => tool.slug === featuredSlug) ?? null
      : null;
  const orderedTools = featuredTool
    ? [featuredTool, ...visibleTools.filter((tool) => tool.slug !== featuredTool.slug)]
    : visibleTools;

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  const handleToolClick = (tool: LauncherTool) => {
    if (tool.status !== "active" || !tool.href) {
      return;
    }

    void pb
      .collection("tool_usage")
      .create({
        user: pb.authStore.model?.id,
        tool_slug: tool.slug,
      })
      .catch(() => {});

    setLocation(tool.href);
  };

  return (
    <div className="min-h-screen bg-[#E8E5E0] text-[#0A0A0A] [font-family:'DM_Sans',var(--font-sans)]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <header className="border-b border-[rgba(0,0,0,0.08)] px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="BlckBx"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[13px] text-[rgba(0,0,0,0.45)]">{greeting}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="border border-[rgba(0,0,0,0.08)] bg-transparent px-5 py-2 text-[13px] font-medium text-[#0A0A0A] transition-all duration-300 [transition-timing-function:cubic-bezier(0.25,0.1,0.25,1)] hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-[#FAFAF8]"
              data-testid="button-home-signout"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-14 md:px-10">
        <section className="mb-10">
          <h1 className="font-serif text-[42px] font-medium leading-[1.1] tracking-[-0.5px] [font-family:'Noto_Serif',serif]">
            Tools
          </h1>
          <p className="mt-3 max-w-[440px] text-[15px] leading-[1.5] text-[rgba(0,0,0,0.45)]">
            Select a tool to get started
          </p>
        </section>

        {visibleTools.length > 0 ? (
          <>
            <div className="mb-5 pl-[2px] text-[11px] font-semibold uppercase tracking-[0.25em] text-[rgba(0,0,0,0.45)]">
              All Tools
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {orderedTools.map((tool, index) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  featured={Boolean(featuredTool && tool.slug === featuredTool.slug && isUsageLoaded)}
                  animationDelay={0.05 * (index + 1)}
                  onClick={() => handleToolClick(tool)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-xl border border-[#D4D0CB] bg-[#FAFAF8] p-8 text-center">
            <h2 className="font-serif text-2xl font-semibold text-[#1a1a1a] [font-family:'Noto_Serif',serif]">
              No tools assigned
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Contact your admin to get access to the tools you need.
            </p>
          </div>
        )}

        <footer className="mt-14 flex items-center justify-between border-t border-[rgba(0,0,0,0.08)] pt-5 text-xs text-[rgba(0,0,0,0.45)]">
          <span>© 2026 BlckBx</span>
          <span>v2.4</span>
        </footer>
      </main>
    </div>
  );
}
