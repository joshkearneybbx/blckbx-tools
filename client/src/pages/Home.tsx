import {
  Plane,
  UtensilsCrossed,
  ClipboardList,
  ReceiptPoundSterling,
  LayoutDashboard,
  ClipboardCheck,
  Search,
  Map,
} from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import type { ToolSlug } from "@/lib/tool-access";
import { useLocation } from "wouter";

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
    icon: Map,
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
    icon: ReceiptPoundSterling,
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

export default function Home() {
  const { logout, hasAccess } = useAuth();
  const [, setLocation] = useLocation();
  const visibleTools = tools.filter((tool) => hasAccess(tool.slug));

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#E8E5E0]">
      <header className="p-8">
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center">
            <img
              src={logoUrl}
              alt="BlckBx"
              className="h-16 w-auto mx-auto mb-2"
            />
            <h1 className="text-2xl font-semibold text-[#1a1a1a] mt-4">Tools</h1>
            <p className="text-gray-600 mt-2">Select a tool to get started</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="absolute top-0 right-0 border border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] text-sm font-medium px-4 py-2 transition-colors hover:bg-[#FAFAF8] hover:text-[#0A0A0A]"
            data-testid="button-home-signout"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-12">
        {visibleTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl border border-[#D4D0CB] bg-[#FAFAF8] p-8 text-center">
            <h2 className="font-serif text-2xl font-semibold text-[#1a1a1a]">
              No tools assigned
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Contact your admin to get access to the tools you need.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
