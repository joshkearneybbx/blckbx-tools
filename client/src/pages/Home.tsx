import { Map, UtensilsCrossed, ClipboardList, Plus } from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";
import logoUrl from "@assets/blckbx-logo.png";

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
  return (
    <div className="min-h-screen bg-[#E8E4DE]">
      <header className="p-8 text-center">
        <img
          src={logoUrl}
          alt="BlckBx"
          className="h-16 w-auto mx-auto mb-2"
        />
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mt-4">Tools</h1>
        <p className="text-gray-600 mt-2">Select a tool to get started</p>
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
