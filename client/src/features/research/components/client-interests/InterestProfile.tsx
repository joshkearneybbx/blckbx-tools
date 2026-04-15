import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Save, Trash2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import {
  createProfileAffinity,
  createProfileInterest,
  deleteProfileAffinity,
  deleteProfileInterest,
  fetchProfileAffinities,
  fetchProfileInterests,
  updateProfileAffinity,
  updateProfileInterest,
  updateProfileNotes,
} from "../../lib/api";
import type { BrandOption, ClientAccount, ClientProfile, ProfileAffinity, ProfileInterest } from "../../lib/types";
import { AddAffinityForm } from "./AddAffinityForm";
import { AddInterestForm } from "./AddInterestForm";
import { AffinityPills } from "./AffinityPills";
import { InterestPills } from "./InterestPills";

function formatRelativeDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) < 7) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(diffDays, "day");
  }
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function fullName(profile: ClientProfile) {
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unnamed profile";
}

export function InterestProfile({
  client,
  profile,
  onProfileUpdated,
}: {
  client: ClientAccount | null;
  profile: ClientProfile | null;
  onProfileUpdated: (profileKey: string, patch: Partial<ClientProfile>) => void;
}) {
  const [interests, setInterests] = useState<ProfileInterest[]>([]);
  const [affinities, setAffinities] = useState<ProfileAffinity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [interestDuplicateMessage, setInterestDuplicateMessage] = useState<string | null>(null);
  const [affinityDuplicateMessage, setAffinityDuplicateMessage] = useState<string | null>(null);
  const [highlightedInterestEdgeKey, setHighlightedInterestEdgeKey] = useState<string | null>(null);
  const [highlightedAffinityEdgeKey, setHighlightedAffinityEdgeKey] = useState<string | null>(null);
  const [editingInterest, setEditingInterest] = useState<ProfileInterest | null>(null);
  const [editingAffinity, setEditingAffinity] = useState<ProfileAffinity | null>(null);
  const [editInterestStrength, setEditInterestStrength] = useState(0.75);
  const [editInterestNote, setEditInterestNote] = useState("");
  const [editAffinityNote, setEditAffinityNote] = useState("");
  const [notes, setNotes] = useState("");
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const initialNotesRef = useRef(true);

  const currentUserEmail = pb.authStore.record?.email || pb.authStore.model?.email || "";

  const loadProfileData = async () => {
    if (!profile?._key) return;
    setIsLoading(true);
    try {
      const [nextInterests, nextAffinities] = await Promise.all([
        fetchProfileInterests(profile._key),
        fetchProfileAffinities(profile._key),
      ]);
      setInterests(nextInterests);
      setAffinities(nextAffinities);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setEditingInterest(null);
    setEditingAffinity(null);
    setInterestDuplicateMessage(null);
    setAffinityDuplicateMessage(null);
    setHighlightedInterestEdgeKey(null);
    setHighlightedAffinityEdgeKey(null);
    setInterests([]);
    setAffinities([]);
    setNotes(profile?.notes || "");
    initialNotesRef.current = true;
    if (profile?._key) {
      void loadProfileData();
    }
  }, [profile?._key]);

  const saveNotes = async (value: string) => {
    if (!profile?._key) return;
    setNotesStatus("saving");
    try {
      await updateProfileNotes(profile._key, value);
      setNotesStatus("saved");
      onProfileUpdated(profile._key, { notes: value });
      window.setTimeout(() => setNotesStatus("idle"), 1500);
    } catch {
      setNotesStatus("error");
    }
  };

  useEffect(() => {
    if (!profile?._key) return;
    if (initialNotesRef.current) {
      initialNotesRef.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      if (notes !== (profile.notes || "")) {
        void saveNotes(notes);
      }
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [notes, profile?._key, profile?.notes]);

  const interestCountLabel = useMemo(() => `${interests.length}`, [interests.length]);
  const affinityCountLabel = useMemo(() => `${affinities.length}`, [affinities.length]);

  if (!profile || !client) {
    return (
      <div className="flex min-h-[520px] items-center justify-center border border-[var(--border)] bg-white px-8 text-center text-sm text-[var(--muted)]">
        Select a client and profile to view their interests
      </div>
    );
  }

  const handleAddInterest = async ({ tag, strength, note }: { tag: { _key: string; label: string }; strength: number; note: string }) => {
    if (!profile._key) return;
    setInterestDuplicateMessage(null);
    try {
      await createProfileInterest(profile._key, {
        tag_key: tag._key,
        strength,
        note,
        added_by: String(currentUserEmail || ""),
      });
      await loadProfileData();
      onProfileUpdated(profile._key, { interests_count: interests.length + 1 });
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 409) {
        const duplicate = interests.find(
          (interest) => interest.tag_key === tag._key || interest.label.toLowerCase() === tag.label.toLowerCase()
        );
        if (duplicate) {
          setHighlightedInterestEdgeKey(duplicate.edge_key);
        }
        setInterestDuplicateMessage("This interest already exists");
        return;
      }
      throw error;
    }
  };

  const handleAddAffinity = async ({ brand, note }: { brand: BrandOption; note: string }) => {
    if (!profile._key) return;
    setAffinityDuplicateMessage(null);
    try {
      await createProfileAffinity(profile._key, {
        brand_key: brand._key,
        note,
        added_by: String(currentUserEmail || ""),
      });
      await loadProfileData();
      onProfileUpdated(profile._key, { affinities_count: affinities.length + 1 });
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 409) {
        const duplicate = affinities.find((affinity) => affinity.brand_key === brand._key);
        if (duplicate) {
          setHighlightedAffinityEdgeKey(duplicate.edge_key);
        }
        setAffinityDuplicateMessage("This brand affinity already exists");
        return;
      }
      throw error;
    }
  };

  const handleDeleteInterest = async (interest: ProfileInterest) => {
    if (!profile._key || !window.confirm(`Delete interest "${interest.label}"?`)) return;
    await deleteProfileInterest(profile._key, interest.edge_key);
    await loadProfileData();
  };

  const handleDeleteAffinity = async (affinity: ProfileAffinity) => {
    if (!profile._key || !window.confirm(`Delete brand affinity "${affinity.name}"?`)) return;
    await deleteProfileAffinity(profile._key, affinity.edge_key);
    await loadProfileData();
  };

  return (
    <div className="flex min-h-[720px] flex-col bg-white">
      <div className="border-b border-[var(--border)] px-8 py-6">
        <h2 className="text-[28px] font-semibold text-[var(--text)]">{fullName(profile)}</h2>
        <div className="mt-1 text-sm text-[var(--muted)]">{client.account_name}</div>
      </div>

      <div className="flex-1 space-y-8 px-8 py-6">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
              Interests
            </h3>
            <span className="border border-[var(--border)] bg-[var(--sand-100)] px-2 py-1 text-xs">
              {interestCountLabel}
            </span>
          </div>
          {isLoading ? (
            <div className="panel p-4 text-sm text-[var(--muted)]">Loading interests...</div>
          ) : (
            <InterestPills
              interests={interests}
              highlightedEdgeKey={highlightedInterestEdgeKey}
              onEdit={(interest) => {
                setEditingInterest(interest);
                setEditInterestStrength(interest.strength);
                setEditInterestNote(interest.note || "");
              }}
              onDelete={handleDeleteInterest}
            />
          )}

          {editingInterest ? (
            <div className="panel space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">
                  Edit interest: {editingInterest.label}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInterest(null)}
                  className="button-secondary px-3 py-2"
                >
                  Cancel
                </button>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">Strength</span>
                  <span>{editInterestStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={editInterestStrength}
                  onChange={(event) => setEditInterestStrength(Number(event.target.value))}
                  className="w-full"
                  style={{ accentColor: "#3ECFB2" }}
                />
              </div>
              <textarea
                value={editInterestNote}
                onChange={(event) => setEditInterestNote(event.target.value)}
                rows={3}
                className="field min-h-24"
              />
              <button
                type="button"
                onClick={async () => {
                  await updateProfileInterest(profile._key, editingInterest.edge_key, {
                    strength: editInterestStrength,
                    note: editInterestNote,
                  });
                  setEditingInterest(null);
                  await loadProfileData();
                }}
                className="button-secondary"
              >
                <Save className="h-4 w-4" />
                Save Interest
              </button>
            </div>
          ) : null}

          <AddInterestForm duplicateMessage={interestDuplicateMessage} onSubmit={handleAddInterest} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
              Brand Affinities
            </h3>
            <span className="border border-[var(--border)] bg-[var(--sand-100)] px-2 py-1 text-xs">
              {affinityCountLabel}
            </span>
          </div>
          {isLoading ? (
            <div className="panel p-4 text-sm text-[var(--muted)]">Loading affinities...</div>
          ) : (
            <AffinityPills
              affinities={affinities}
              highlightedEdgeKey={highlightedAffinityEdgeKey}
              onEdit={(affinity) => {
                setEditingAffinity(affinity);
                setEditAffinityNote(affinity.note || "");
              }}
              onDelete={handleDeleteAffinity}
            />
          )}

          {editingAffinity ? (
            <div className="panel space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">
                  Edit brand affinity: {editingAffinity.name}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAffinity(null)}
                  className="button-secondary px-3 py-2"
                >
                  Cancel
                </button>
              </div>
              <textarea
                value={editAffinityNote}
                onChange={(event) => setEditAffinityNote(event.target.value)}
                rows={3}
                className="field min-h-24"
              />
              <button
                type="button"
                onClick={async () => {
                  await updateProfileAffinity(profile._key, editingAffinity.edge_key, {
                    note: editAffinityNote,
                  });
                  setEditingAffinity(null);
                  await loadProfileData();
                }}
                className="button-secondary"
              >
                <Save className="h-4 w-4" />
                Save Brand
              </button>
            </div>
          ) : null}

          <AddAffinityForm duplicateMessage={affinityDuplicateMessage} onSubmit={handleAddAffinity} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text)]">
              Notes
            </h3>
            {notesStatus === "saving" ? <span className="text-xs text-[var(--muted)]">Saving...</span> : null}
            {notesStatus === "saved" ? <span className="text-xs text-[#1ea868]">Saved</span> : null}
            {notesStatus === "error" ? <span className="text-xs text-[var(--error)]">Save failed</span> : null}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes !== (profile.notes || "")) {
                void saveNotes(notes);
              }
            }}
            rows={4}
            className="field min-h-32"
            placeholder="General notes about this client's preferences..."
          />
        </section>

        <div className="grid gap-3 text-xs text-[var(--muted)] md:grid-cols-2">
          {editingInterest ? (
            <div className="inline-flex items-center gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Editing interest updated {formatRelativeDate(editingInterest.updated_at)}
            </div>
          ) : null}
          {editingAffinity ? (
            <div className="inline-flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" />
              Editing brand updated {formatRelativeDate(editingAffinity.updated_at)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
