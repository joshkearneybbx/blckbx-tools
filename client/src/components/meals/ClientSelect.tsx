import { Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MealCraftClient } from "@/lib/meals/api";
import { useClients } from "@/hooks/meals/useClients";
import { ClientCard } from "./ClientCard";
import { PastPlansModal } from "./PastPlansModal";
import { NewClientModal } from "./NewClientModal";

interface ClientSelectProps {
  selectedClient: MealCraftClient | null;
  onSelectClient: (client: MealCraftClient) => void;
  onContinue: () => void;
  onLoadPlan: (planId: string, client: MealCraftClient) => Promise<void>;
  isLoadingPlan?: boolean;
}

export function ClientSelect({
  selectedClient,
  onSelectClient,
  onContinue,
  onLoadPlan,
  isLoadingPlan = false,
}: ClientSelectProps) {
  const [search, setSearch] = useState("");
  const [pastPlansClient, setPastPlansClient] = useState<MealCraftClient | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const { data: clients = [], isLoading } = useClients(search);

  return (
    <div className="rounded-[14px] border border-[#E6E5E0] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#E6E5E0] px-5 py-4">
        <h3 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Select Client</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#E6E5E0] text-[#424242] hover:border-[#D0D6D0]"
          onClick={() => setNewClientOpen(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          New Client
        </Button>
      </div>

      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B9797]" />
          <Input
            placeholder="Search by name, dietary needs, dislikes, or notes"
            className="h-10 border-[#E6E5E0] bg-white pl-9 text-sm [font-family:Inter,sans-serif]"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.5px] text-[#6B6B68] [font-family:Inter,sans-serif]">
            Recent Clients
          </p>
          {isLoading ? (
            <p className="text-sm text-[#6B6B68] [font-family:Inter,sans-serif]">Loading clients...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-[#6B6B68] [font-family:Inter,sans-serif]">No clients found.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  selected={selectedClient?.id === client.id}
                  onSelect={() => onSelectClient(client)}
                  onOpenPastPlans={() => setPastPlansClient(client)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onContinue}
            disabled={!selectedClient}
            className="h-9 rounded-md bg-[#E7C51C] px-5 text-sm font-semibold text-black hover:bg-[#d4b419]"
          >
            Continue
          </Button>
        </div>
      </div>

      <PastPlansModal
        open={!!pastPlansClient}
        onOpenChange={(open) => {
          if (!open) setPastPlansClient(null);
        }}
        clientId={pastPlansClient?.id ?? null}
        clientName={pastPlansClient?.name ?? "Client"}
        isLoadingPlan={isLoadingPlan}
        onLoadPlan={async (planId) => {
          if (!pastPlansClient) return;
          await onLoadPlan(planId, pastPlansClient);
          setPastPlansClient(null);
        }}
      />

      <NewClientModal
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreated={(client) => {
          onSelectClient(client);
          setNewClientOpen(false);
        }}
      />
    </div>
  );
}
