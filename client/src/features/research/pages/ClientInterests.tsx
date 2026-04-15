import { useEffect, useMemo, useState } from "react";
import type { ClientAccount, ClientProfile } from "../lib/types";
import { fetchClientInterestProfiles, searchInterestClientAccounts } from "../lib/api";
import { ClientSelector } from "../components/client-interests/ClientSelector";
import { InterestProfile } from "../components/client-interests/InterestProfile";
import { ProfileList } from "../components/client-interests/ProfileList";

export default function ClientInterests() {
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientAccount[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientAccount | null>(null);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null);

  useEffect(() => {
    if (selectedClient || !clientQuery.trim()) {
      setClientResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        setClientResults(await searchInterestClientAccounts(clientQuery, 20));
      } catch {
        setClientResults([]);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [clientQuery, selectedClient]);

  useEffect(() => {
    if (!selectedClient?._key) {
      setProfiles([]);
      setSelectedProfileKey(null);
      return;
    }

    let cancelled = false;
    const loadProfiles = async () => {
      setIsLoadingProfiles(true);
      try {
        const nextProfiles = await fetchClientInterestProfiles(selectedClient._key);
        if (cancelled) return;
        setProfiles(nextProfiles);
        setSelectedProfileKey((current) =>
          nextProfiles.some((profile) => profile._key === current)
            ? current
            : nextProfiles[0]?._key || null
        );
      } catch {
        if (!cancelled) {
          setProfiles([]);
          setSelectedProfileKey(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfiles(false);
        }
      }
    };

    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [selectedClient?._key]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile._key === selectedProfileKey) || null,
    [profiles, selectedProfileKey]
  );

  return (
    <div className="space-y-6">
      <div className="panel px-6 py-5">
        <div className="label">Research Hub</div>
        <h1 className="mt-2 text-[32px] font-semibold text-[var(--text)]">Client Interests</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Capture manual taste signals, brand affinities, and client preference notes directly against client profiles.
        </p>
      </div>

      <div className="grid min-h-[720px] grid-cols-1 border border-[var(--border)] bg-white xl:grid-cols-[380px_1fr]">
        <div className="border-r border-[var(--sand-200)] p-5">
          <ClientSelector
            query={clientQuery}
            onQueryChange={(value) => {
              setClientQuery(value);
              setSelectedClient(null);
              setProfiles([]);
              setSelectedProfileKey(null);
            }}
            results={clientResults}
            isLoading={isSearchingClients}
            selectedClient={selectedClient}
            showDropdown={!selectedClient && (clientQuery.trim().length > 0 || isSearchingClients)}
            onSelect={(client) => {
              setSelectedClient(client);
              setClientQuery(client.account_name);
            }}
            onClear={() => {
              setClientQuery("");
              setSelectedClient(null);
              setProfiles([]);
              setSelectedProfileKey(null);
            }}
          />

          <div className="mt-6">
            <div className="label mb-3 block">Profiles</div>
            <ProfileList
              profiles={profiles}
              selectedProfileKey={selectedProfileKey}
              isLoading={isLoadingProfiles}
              onSelect={(profile) => setSelectedProfileKey(profile._key)}
            />
          </div>
        </div>

        <div className="min-w-0">
          <InterestProfile
            client={selectedClient}
            profile={selectedProfile}
            onProfileUpdated={(profileKey, patch) => {
              setProfiles((current) =>
                current.map((profile) => (profile._key === profileKey ? { ...profile, ...patch } : profile))
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
