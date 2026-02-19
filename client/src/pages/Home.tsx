import { Map, UtensilsCrossed, ClipboardList, Plus, ReceiptPoundSterling } from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const tools: Tool[] = [
  {
    id: "itinerary",
    name: "Itinerary Maker",
    description: "Create professional travel itineraries & PDF documents",
    icon: Map,
    href: "/itinerary",
    status: "active",
  },
  {
    id: "meals",
    name: "Meal Planner",
    description: "AI-powered meal planning with smart shopping lists",
    icon: UtensilsCrossed,
    href: "/meals",
    status: "coming-soon",
  },
  {
    id: "task-guide",
    name: "Task Guide",
    description: "Not sure how to complete a task? Ask the Task Guide to help you",
    icon: ClipboardList,
    href: null,
    status: "coming-soon",
  },
  {
    id: "big-purchases",
    name: "Big Purchases",
    description: "Flag a big client purchase for the partnerships team",
    icon: ReceiptPoundSterling,
    href: "/big-purchases",
    status: "active",
  },
  {
    id: "tool-4",
    name: "Coming Soon",
    description: "More tools on the way",
    icon: Plus,
    href: null,
    status: "placeholder",
  },
  {
    id: "tool-5",
    name: "Coming Soon",
    description: "More tools on the way",
    icon: Plus,
    href: null,
    status: "placeholder",
  },
  {
    id: "tool-6",
    name: "Coming Soon",
    description: "More tools on the way",
    icon: Plus,
    href: null,
    status: "placeholder",
  },
];

export default function Home() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#E8E4DE]">
      <header className="p-8">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div className="text-center flex-1">
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
            className="rounded-full bg-[#E7C51C] text-[#232220] text-sm font-medium px-4 py-2 hover:bg-[#d8b614] transition-colors"
            data-testid="button-home-signout"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </main>
    </div>
  );
}
