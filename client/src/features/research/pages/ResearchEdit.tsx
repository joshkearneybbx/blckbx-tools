/**
 * The Edit surface — mutations live.
 * Human disposal (swap/remove/move/add) never sends llm_proposed.
 * Regenerate is the only path that rewrites llm_proposed (server-side).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addEditItem,
  canonicalWeekOf,
  CURRENT_USER_KEY,
  fetchEditQueue,
  fetchHouseholdEdits,
  fetchRecommendations,
  moveEditItem,
  regenerateEdit,
  removeEditItem,
  shipEdit,
  swapEditItem,
  undoShipEdit,
} from "../lib/api";
import type {
  BoundAction,
  EditItem,
  EditQueueHousehold,
  EditSection,
  HouseholdEditsResponse,
  WeeklyEditDraft,
} from "../lib/edit-types";
import {
  BOUND_ACTION_LABELS,
  SECTION_LABELS,
  SECTIONS,
} from "../lib/edit-types";
import type { Recommendation } from "../lib/types";
import "../edit.css";

const SWAP_REASON_CHIPS = [
  "wrong price tier",
  "already been",
  "not their taste",
  "bad timing",
  "better option",
] as const;

const REMOVE_REASON_CHIPS = [
  "nothing fits",
  "section too full",
  "wrong week",
  "client wouldn't want",
] as const;

const REGEN_REASON_CHIPS = [
  "weak overall",
  "wrong tone",
  "stale picks",
  "missed known taste",
  "other",
] as const;

function formatPrice(item: EditItem): string {
  if (item.snapshot?.price_text) return item.snapshot.price_text;
  if (typeof item.snapshot?.price_pence === "number") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(item.snapshot.price_pence / 100);
  }
  return "";
}

function itemsForSection(draft: WeeklyEditDraft, section: EditSection): EditItem[] {
  return (draft.items ?? [])
    .filter((i) => i.section === section)
    .sort((a, b) => a.position - b.position);
}

function underfillFor(draft: WeeklyEditDraft, section: EditSection) {
  return (draft.underfilled ?? []).find((u) => u.section === section);
}

function PoolPicker({
  section,
  excludeKeys,
  onPick,
}: {
  section: EditSection;
  excludeKeys: string[];
  onPick: (rec: Recommendation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      fetchRecommendations({ q: query, category: section, limit: 12, offset: 0 })
        .then((data) => {
          if (!active) return;
          setResults(data.data.filter((r) => !excludeKeys.includes(r._key)));
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [query, section, excludeKeys.join("|")]);

  return (
    <div>
      <input
        className="field search-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search pool (${SECTION_LABELS[section]})…`}
      />
      <div className="edit-swap-results mt-3">
        {loading ? (
          <div className="px-3 py-2 text-sm text-[var(--muted)]">Searching…</div>
        ) : results.length === 0 ? (
          <div className="px-3 py-2 text-sm text-[var(--muted)]">No pool items.</div>
        ) : (
          results.map((rec) => (
            <button
              key={rec._key}
              type="button"
              className="edit-swap-result"
              onClick={() => onPick(rec)}
            >
              <div className="edit-swap-result__name">{rec.name}</div>
              <div className="edit-swap-result__meta">{rec.category?.replaceAll("_", " ")}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function ReasonChips({
  chips,
  value,
  onChange,
}: {
  chips: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          className={`chip${value === chip ? " chip-active" : ""}`}
          onClick={() => onChange(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

type Panel =
  | { kind: "swap"; editKey: string; item: EditItem }
  | { kind: "remove"; editKey: string; item: EditItem }
  | { kind: "move"; editKey: string; item: EditItem; otherAdults: WeeklyEditDraft[] }
  | { kind: "add"; editKey: string; section: EditSection; draft: WeeklyEditDraft }
  | { kind: "regen"; editKey: string; scope: "section" | "edit"; section?: EditSection }
  | { kind: "ship"; editKey: string; name: string };

function ActionPanel({
  panel,
  onClose,
  onDone,
}: {
  panel: Panel;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reasonPreset, setReasonPreset] = useState("");
  const [reasonText, setReasonText] = useState("");
  const [selectedIn, setSelectedIn] = useState<Recommendation | null>(null);
  const [targetProfile, setTargetProfile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmShip, setConfirmShip] = useState(false);

  const run = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (panel.kind === "swap") {
        if (!selectedIn || !reasonPreset) return;
        const r = await swapEditItem(panel.editKey, {
          recommendation_key_out: panel.item.recommendation_key,
          recommendation_key_in: selectedIn._key,
          section: panel.item.section,
          reason_preset: reasonPreset,
          reason_text: reasonText.trim() || undefined,
          decided_by: CURRENT_USER_KEY,
        });
        if (!r.llm_proposed_untouched) throw new Error("llm_proposed was touched on swap");
      } else if (panel.kind === "remove") {
        if (!reasonPreset) return;
        await removeEditItem(panel.editKey, {
          recommendation_key_out: panel.item.recommendation_key,
          section: panel.item.section,
          reason_preset: reasonPreset,
          reason_text: reasonText.trim() || undefined,
          decided_by: CURRENT_USER_KEY,
        });
      } else if (panel.kind === "move") {
        if (!targetProfile) return;
        await moveEditItem(panel.editKey, {
          recommendation_key_out: panel.item.recommendation_key,
          section: panel.item.section,
          moved_to_profile_key: targetProfile,
          decided_by: CURRENT_USER_KEY,
          reason_text: reasonText.trim() || undefined,
        });
      } else if (panel.kind === "add") {
        if (!selectedIn) return;
        await addEditItem(panel.editKey, {
          recommendation_key_in: selectedIn._key,
          section: panel.section,
          decided_by: CURRENT_USER_KEY,
        });
      } else if (panel.kind === "regen") {
        if (!reasonPreset) return;
        await regenerateEdit(panel.editKey, {
          scope: panel.scope,
          section: panel.section,
          reason_preset: reasonPreset,
          reason_text: reasonText.trim() || undefined,
          decided_by: CURRENT_USER_KEY,
        });
      } else if (panel.kind === "ship") {
        if (!confirmShip) return;
        await shipEdit(panel.editKey, CURRENT_USER_KEY);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    panel.kind === "swap"
      ? "Swap"
      : panel.kind === "remove"
        ? "Remove"
        : panel.kind === "move"
          ? "Move to other adult"
          : panel.kind === "add"
            ? `Add to ${SECTION_LABELS[panel.section]}`
            : panel.kind === "regen"
              ? panel.scope === "edit"
                ? "Regenerate whole Edit"
                : `Regenerate ${SECTION_LABELS[panel.section!]}`
              : "Ship Edit";

  return (
    <div className="edit-swap-panel">
      <div className="edit-swap-panel__head">
        <div>
          <div className="label">{title}</div>
          {"item" in panel ? (
            <div className="mt-1 text-sm text-[var(--bb-near-black)]">
              <strong>{panel.item.snapshot?.name ?? panel.item.recommendation_key}</strong>
              {" · "}
              {SECTION_LABELS[panel.item.section]}
            </div>
          ) : null}
        </div>
        <button type="button" className="button-secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>

      {(panel.kind === "swap" || panel.kind === "add") && (
        <div className="mt-3">
          <PoolPicker
            section={panel.kind === "swap" ? panel.item.section : panel.section}
            excludeKeys={
              panel.kind === "swap"
                ? [panel.item.recommendation_key]
                : (panel.draft.items ?? []).map((i) => i.recommendation_key)
            }
            onPick={setSelectedIn}
          />
          {selectedIn ? (
            <div className="mt-2 text-sm">
              Selected: <strong>{selectedIn.name}</strong>
            </div>
          ) : null}
        </div>
      )}

      {panel.kind === "move" && (
        <div className="mt-3">
          <div className="label">Move to</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {panel.otherAdults.map((a) => (
              <button
                key={a.profile_key}
                type="button"
                className={`chip${targetProfile === a.profile_key ? " chip-active" : ""}`}
                onClick={() => setTargetProfile(a.profile_key)}
              >
                {a.profile_name || a.profile_key}
              </button>
            ))}
          </div>
        </div>
      )}

      {(panel.kind === "swap" ||
        panel.kind === "remove" ||
        panel.kind === "regen") && (
        <div className="mt-4">
          <div className="label">Reason *</div>
          <ReasonChips
            chips={
              panel.kind === "swap"
                ? SWAP_REASON_CHIPS
                : panel.kind === "remove"
                  ? REMOVE_REASON_CHIPS
                  : REGEN_REASON_CHIPS
            }
            value={reasonPreset}
            onChange={setReasonPreset}
          />
          <textarea
            className="field mt-3 min-h-[64px] resize-y"
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="Optional free text"
          />
        </div>
      )}

      {panel.kind === "ship" && (
        <div className="mt-4 text-sm text-[var(--bb-body)]">
          <p>
            Shipping freezes this Edit for the client. You have a <strong>15-minute undo</strong>{" "}
            window computed from <code>shipped_at</code>.
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmShip}
              onChange={(e) => setConfirmShip(e.target.checked)}
            />
            I confirm ship for {panel.name}
          </label>
        </div>
      )}

      {error ? <div className="mt-2 text-xs text-[var(--error)]">{error}</div> : null}

      <button
        type="button"
        className="button-primary mt-4 w-full"
        disabled={
          submitting ||
          (panel.kind === "swap" && (!selectedIn || !reasonPreset)) ||
          (panel.kind === "remove" && !reasonPreset) ||
          (panel.kind === "move" && !targetProfile) ||
          (panel.kind === "add" && !selectedIn) ||
          (panel.kind === "regen" && !reasonPreset) ||
          (panel.kind === "ship" && !confirmShip)
        }
        onClick={() => void run()}
      >
        {submitting ? "Working…" : `Confirm ${title}`}
      </button>
    </div>
  );
}

function AdultColumn({
  draft,
  isPrimary,
  otherAdults,
  onAction,
}: {
  draft: WeeklyEditDraft;
  isPrimary: boolean;
  otherAdults: WeeklyEditDraft[];
  onAction: (panel: Panel) => void;
}) {
  const name =
    draft.profile_name?.trim() ||
    [draft.profile_first_name, draft.profile_last_name].filter(Boolean).join(" ") ||
    draft.profile_key;
  const locked = draft.status === "shipped";

  return (
    <div className="edit-col">
      <div className="edit-col-head">
        <div className="edit-col-name">
          {name}
          {isPrimary ? <span className="edit-col-primary">Primary</span> : null}
          {locked ? <span className="edit-col-primary">Shipped</span> : null}
        </div>
        {draft.no_primary_set ? (
          <div className="edit-queue__flag" style={{ marginTop: 8 }}>
            No primary set on household
          </div>
        ) : null}
        <div className="edit-personas">
          {(draft.personas_matched ?? []).map((p) => (
            <span key={p.slug} className="edit-persona">
              {p.slug}
              <b>{p.weight.toFixed(1)}</b>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="button-secondary"
            disabled={locked}
            onClick={() =>
              onAction({ kind: "regen", editKey: draft._key, scope: "edit" })
            }
          >
            Regenerate Edit
          </button>
          <button
            type="button"
            className="button-primary"
            disabled={locked}
            onClick={() => onAction({ kind: "ship", editKey: draft._key, name })}
          >
            Ship
          </button>
          {locked && (draft as WeeklyEditDraft & { undo_available?: boolean }).undo_available !== false ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                void undoShipEdit(draft._key).then(() => onAction({ kind: "ship", editKey: draft._key, name: "__reload__" }))
              }
            >
              Undo ship
            </button>
          ) : null}
        </div>
      </div>

      {SECTIONS.map((section) => {
        const items = itemsForSection(draft, section);
        const uf = underfillFor(draft, section);
        const short = items.length < 2;
        return (
          <div key={section} className="edit-sec">
            <div className="edit-sec-head">
              <div className="edit-sec-title">{SECTION_LABELS[section]}</div>
              <div className="flex items-center gap-2">
                <div className={`edit-sec-count${short ? " is-short" : ""}`}>
                  {items.length}/2
                  {uf ? ` · wanted ${uf.wanted}, got ${uf.got}` : ""}
                </div>
                <button
                  type="button"
                  className="edit-txt is-live"
                  disabled={locked}
                  onClick={() =>
                    onAction({ kind: "regen", editKey: draft._key, scope: "section", section })
                  }
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  className="edit-txt is-live"
                  disabled={locked || items.length >= 2}
                  title={items.length >= 2 ? "Section full — use swap" : "Add from pool"}
                  onClick={() =>
                    onAction({ kind: "add", editKey: draft._key, section, draft })
                  }
                >
                  Add
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="edit-empty-sec">
                Empty section
                {uf ? (
                  <div className="edit-underfill-note">
                    Underfilled — wanted {uf.wanted}, got {uf.got}
                  </div>
                ) : null}
              </div>
            ) : (
              items.map((item) => (
                <article key={`${item.recommendation_key}-${item.position}`} className="edit-ecard">
                  <div className="edit-ethumb">
                    {item.snapshot?.image_url ? (
                      <img src={item.snapshot.image_url} alt="" />
                    ) : null}
                  </div>
                  <div className="edit-ebody">
                    <div className="edit-ename">{item.snapshot?.name ?? item.recommendation_key}</div>
                    <div className="edit-emeta">
                      {[SECTION_LABELS[item.section], formatPrice(item)].filter(Boolean).join(" · ")}
                    </div>
                    <div className="edit-rationale">
                      <span className="bb-diamond bb-diamond--outline" aria-hidden />
                      <span>{item.rationale || "No rationale recorded."}</span>
                    </div>
                    <div className="edit-eacts">
                      <button type="button" className="edit-ba-do" disabled>
                        {BOUND_ACTION_LABELS[item.bound_action as BoundAction] ?? item.bound_action}
                      </button>
                      <span className="edit-ba-div" />
                      <button
                        type="button"
                        className="edit-txt is-live"
                        disabled={locked}
                        onClick={() => onAction({ kind: "swap", editKey: draft._key, item })}
                      >
                        Swap
                      </button>
                      <button
                        type="button"
                        className="edit-txt is-live"
                        disabled={locked || otherAdults.length === 0}
                        onClick={() =>
                          onAction({
                            kind: "move",
                            editKey: draft._key,
                            item,
                            otherAdults,
                          })
                        }
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        className="edit-txt is-live"
                        disabled={locked}
                        onClick={() => onAction({ kind: "remove", editKey: draft._key, item })}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResearchEdit() {
  const [queue, setQueue] = useState<EditQueueHousehold[]>([]);
  const [weekOf, setWeekOf] = useState<string>(() => canonicalWeekOf());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [household, setHousehold] = useState<HouseholdEditsResponse | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingHousehold, setLoadingHousehold] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const reloadHousehold = useCallback(async (key: string, week: string) => {
    setLoadingHousehold(true);
    try {
      const data = await fetchHouseholdEdits(key, week);
      setHousehold(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setLoadingHousehold(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingQueue(true);
    setError(null);
    const week = canonicalWeekOf();
    setWeekOf(week);
    fetchEditQueue(week)
      .then((data) => {
        if (!active) return;
        setWeekOf(data.week_of || week);
        setQueue(data.households ?? []);
        if ((data.households ?? []).length > 0) {
          setSelectedKey((prev) => prev ?? data.households[0].household_key);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load queue");
        setQueue([]);
      })
      .finally(() => {
        if (active) setLoadingQueue(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!selectedKey) {
      setHousehold(null);
      return;
    }
    void reloadHousehold(selectedKey, weekOf || canonicalWeekOf());
  }, [selectedKey, weekOf, refreshToken, reloadHousehold]);

  const drafts = useMemo(() => household?.drafts ?? [], [household]);

  return (
    <div className="edit-surface">
      <aside className="edit-queue">
        <div className="edit-queue__head">
          <div className="edit-queue__title">The Edit</div>
          <div className="edit-queue__meta">
            Week of {weekOf || "—"} · {queue.length} household{queue.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="edit-queue__list">
          {loadingQueue ? (
            <div className="edit-main__empty">Loading queue…</div>
          ) : queue.length === 0 ? (
            <div className="edit-main__empty">No drafts this week.</div>
          ) : (
            queue.map((h) => (
              <button
                key={h.household_key}
                type="button"
                className={`edit-queue__item${selectedKey === h.household_key ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedKey(h.household_key);
                  setPanel(null);
                }}
              >
                <div className="edit-queue__name">{h.account_name}</div>
                <div className="edit-queue__status">
                  {h.status} · {h.adult_count} adults · {h.item_count} items
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="edit-main">
        {error ? <div className="edit-main__empty text-[var(--error)]">{error}</div> : null}

        {!selectedKey ? (
          <div className="edit-main__empty">Select a household from the queue.</div>
        ) : loadingHousehold ? (
          <div className="edit-main__empty">Loading drafts…</div>
        ) : !household || drafts.length === 0 ? (
          <div className="edit-main__empty">No drafts for this household this week.</div>
        ) : (
          <>
            <div className="edit-main__band">
              <div className="edit-main__household">{household.account_name}</div>
              <div className="edit-main__week">Week of {household.week_of}</div>
            </div>

            {panel ? (
              <ActionPanel
                panel={panel}
                onClose={() => setPanel(null)}
                onDone={() => {
                  setPanel(null);
                  setRefreshToken((n) => n + 1);
                }}
              />
            ) : null}

            <div className="edit-split">
              {drafts.map((draft) => (
                <AdultColumn
                  key={draft._key}
                  draft={draft}
                  isPrimary={household.primary_key === draft.profile_key}
                  otherAdults={drafts.filter((d) => d.profile_key !== draft.profile_key)}
                  onAction={(p) => {
                    if (p.kind === "ship" && p.name === "__reload__") {
                      setRefreshToken((n) => n + 1);
                      return;
                    }
                    setPanel(p);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
