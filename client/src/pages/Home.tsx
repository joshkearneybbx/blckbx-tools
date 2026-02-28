import {
  Map,
  UtensilsCrossed,
  ClipboardList,
  ReceiptPoundSterling,
  LayoutDashboard,
  ShoppingBag,
} from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";
import logoUrl from "@assets/blckbx-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const tools: Tool[] = [
  {
    id: "foh-dashboard",
    name: "FOH Dashboard",
    description: "Front of House dashboard for monitoring client activity",
    icon: LayoutDashboard,
    href: null,
    status: "coming-soon",
  },
  {
    id: "task-guide",
    name: "Task Guide",
    description: "Not sure how to complete a task? Ask the Task Guide to help you",
    icon: ClipboardList,
    href: "/task-guide",
    status: "active",
    badge: "Testing",
  },
  {
    id: "itinerary",
    name: "Itinerary Maker",
    description: "Create professional travel itineraries & PDF documents",
    icon: Map,
    href: "/itinerary",
    status: "active",
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
    id: "purchase-logger",
    name: "Purchase Logger",
    description: "Log recipient purchases and track gifting signals",
    icon: ShoppingBag,
    href: "https://bxgig.blckbx.co.uk/purchase-logger",
    status: "active",
    badge: "New",
  },
  {
    id: "meals",
    name: "Meal Planner",
    description: "AI-powered meal planning with smart shopping lists",
    icon: UtensilsCrossed,
    href: "/meals",
    status: "active",
    badge: "Testing",
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
            className="absolute top-0 right-0 rounded-full bg-[#E7C51C] text-[#232220] text-sm font-medium px-4 py-2 hover:bg-[#d8b614] transition-colors"
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
