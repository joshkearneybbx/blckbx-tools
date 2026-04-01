import { Map, FileOutput } from "lucide-react";
import { ToolCard, type Tool } from "@/components/ToolCard";

const travelTools: Tool[] = [
  {
    id: "travel-itinerary-maker",
    name: "Itinerary Maker",
    description: "Create professional travel itineraries and polished PDF documents",
    icon: Map,
    href: "/itinerary",
    status: "active",
  },
  {
    id: "travel-quote-generator",
    name: "Quotes",
    description: "Manage saved BLCK BX quotes or start a new quote from your library",
    icon: FileOutput,
    href: "/travel/quotes",
    status: "active",
  },
];

export default function Travel() {
  return (
    <div className="min-h-screen bg-[#E8E4DE] px-6 py-10 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6B6B68]">
            Travel
          </p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A]">Travel Tools</h1>
          <p className="max-w-2xl text-sm text-[#6B6B68]">
            Choose a travel workflow to create itineraries or turn PTS quote PDFs
            into branded BLCK BX documents.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {travelTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
