import { Search, X } from "lucide-react";
import type { ClientAccount } from "../../lib/types";

function getTierClass(tier?: string | null) {
  switch (tier) {
    case "premium":
      return "bg-[#0A0A0A] text-[#FAFAF8]";
    case "luxury":
      return "border border-[#3ECFB2] bg-[#0A0A0A] text-[#FAFAF8]";
    case "ultra":
      return "bg-[#0A0A0A] text-[#3ECFB2]";
    default:
      return "bg-[#E8E5E0] text-[#0A0A0A]";
  }
}

export function ClientSelector({
  query,
  onQueryChange,
  results,
  isLoading,
  selectedClient,
  showDropdown,
  onSelect,
  onClear,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: ClientAccount[];
  isLoading: boolean;
  selectedClient: ClientAccount | null;
  showDropdown: boolean;
  onSelect: (client: ClientAccount) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <label className="label mb-2 block">Client</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={selectedClient ? selectedClient.account_name : query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search clients..."
          className="field search-field h-12 pr-12"
        />
        {(selectedClient || query) ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center border border-[var(--border)] bg-white text-[var(--muted)] transition-colors hover:border-[var(--black)] hover:text-[var(--black)]"
            aria-label="Clear client"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="menu-panel absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching clients...</div>
          ) : results.length > 0 ? (
            results.map((client) => (
              <button
                key={client._key}
                type="button"
                onClick={() => onSelect(client)}
                className="flex w-full items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--sand-100)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text)]">
                    {client.account_name}
                  </div>
                  <div className="mt-1 truncate text-xs text-[#666]">
                    {client.primary_contact_name || client.primary_contact || "No primary contact"}
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${getTierClass(
                    client.membership_tier
                  )}`}
                >
                  {client.membership_tier || "standard"}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-[var(--muted)]">No clients found</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
