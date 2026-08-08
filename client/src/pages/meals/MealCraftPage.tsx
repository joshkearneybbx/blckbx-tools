import { useLocation } from "wouter";
import type { MealCraftClient } from "@/lib/meals/api";
import { HouseholdDashboard } from "@/components/meals/HouseholdDashboard";

export default function MealCraftPage() {
  const [, navigate] = useLocation();
  const openWorkspace = (client: MealCraftClient) => {
    setSelectedClient(client);
    navigate(`/meals/household/${client.id}`);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        <div className="mb-6 border-b border-[#E4E2DD] bg-white px-5 py-4">
          <h1 className="bb-type-card">MealCraft</h1>
        </div>
        <HouseholdDashboard onOpenWorkspace={openWorkspace} />
      </div>
    </div>
  );
}
