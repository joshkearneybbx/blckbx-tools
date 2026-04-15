import type { ClientProfile } from "../../lib/types";

function buildName(profile: ClientProfile) {
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unnamed profile";
}

export function ProfileList({
  profiles,
  selectedProfileKey,
  isLoading,
  onSelect,
}: {
  profiles: ClientProfile[];
  selectedProfileKey: string | null;
  isLoading: boolean;
  onSelect: (profile: ClientProfile) => void;
}) {
  if (isLoading) {
    return <div className="panel p-4 text-sm text-[var(--muted)]">Loading profiles...</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="empty-state px-4 py-6 text-center text-sm">
        No profiles found for this account
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => {
        const selected = profile._key === selectedProfileKey;
        return (
          <button
            key={profile._key}
            type="button"
            onClick={() => onSelect(profile)}
            className={`w-full border border-[var(--border)] bg-[var(--sand-100)] px-4 py-4 text-left transition-colors ${
              selected ? "border-l-[3px] border-l-[var(--black)] bg-white" : "hover:border-[var(--black)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">{buildName(profile)}</div>
                {profile.is_primary ? (
                  <div className="mt-2 inline-flex items-center bg-[#3ECFB2] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#0A0A0A]">
                    Primary
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <span className="bg-white px-2 py-1">{profile.interests_count || 0} interests</span>
                <span className="bg-white px-2 py-1">{profile.affinities_count || 0} brands</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
