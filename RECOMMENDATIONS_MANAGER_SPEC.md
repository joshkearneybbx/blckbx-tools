# RECOMMENDATIONS MANAGER — Spec

**Status:** DESIGNED (14 Jul 2026). Ready for Pi.
**Supersedes:** the two-surface sketch in `RECOMMENDATIONS_ARCHITECTURE.md` §4.
**Depends on:** `SCHEMA_V2_7.md`; requires a v2.8 delta (§5).
**Companion artifacts:** `design.md` (brand style guide),
`blckbx-ui-refresh.html` (reference implementation of §6).

**Scope note:** this covers the Recommendations Manager *and* the UI refresh of
the Approval Catalogue (§6), which is a sibling tool and must not drift from it.

---

## 0. What this is

The Research Hub, re-navigated around the weekly Edit loop. Not a new tool — a
repurposing. Four tabs. The Approval Catalogue **stays as its own separate tool**
(it exists, it works, Kath owns it) and is not absorbed here.

### Navigation

| Tab | Was | Status |
|---|---|---|
| **Pool** | Search | Exists; rename + additions |
| **The Edit** | — | **New build.** Name is provisional. |
| **Clients** | Clients (Client Preferences Manager) | Exists; unchanged |
| **Add Item** | Add Item | Exists; routing change (§2) |

**Dropped:** Task Matcher, Lists.

---

## 1. Pool

The existing Search tab, renamed to Pool. Carries forward as-is:

- Full-text search over the approved pool
- Client filter → re-rank against that client's taste profile (Model B, re-rank
  not hard-filter — `SESSION_NOTES_22_APR_EVE`)
- Tag review surface (`RECS_MANAGER_TAG_REVIEW_SURFACE.md`) — the low-confidence
  worklist, already designed, unchanged by this spec

**Additions:**

- Filters: category, content type, provenance, persona, season, freshness

> **Assistants do NOT remove items from the pool.** Pool membership is governance,
> not an assistant surface — the same way assistants do not approve items *into*
> the pool (that is the Approval Catalogue's job). Removing an approved item from
> the shared inventory is a curation decision made directly in Arango by the
> catalogue owner, not an in-tool action. There is **no** assistant "remove from
> pool" control and **no** Removed view in this tool. (An earlier draft of this
> spec included one; it was wrong and has been removed.)
>
> What assistants do with items happens entirely inside **The Edit** (§3), where
> *remove* and *swap* act on an item's presence in one client's weekly Edit — not
> on its pool membership. A removed-or-swapped item stays in the pool, available
> for other clients and other weeks. "Wrong for this Edit" ≠ "wrong for the pool."

Pool is also the **swap source** for The Edit (§3) — the same search, invoked
inline, pre-filtered and pre-ranked.

---

## 2. Add Item — routing

Everything an assistant adds by hand goes to the **Approval Catalogue**. There is
no bypass. But there are two intents, and they route differently *after* the
catalogue receives them.

### The form

A required choice at the top, before any other field:

```
What is this?
  ○ For a client   → client selector becomes REQUIRED
  ○ For the pool   → no client selector
```

### "For a client"

- Writes `content_scope: "unique_request"` + `requested_for` edge → the item is
  **live for that client immediately.** No wait for approval.
- **Also** lands in the Approval Catalogue, flagged:
  `Attached to: Emma Hartley — also add to pool?`
- The approver answers **only that question.** They are not gatekeeping delivery.
- **Default is NO.** Most client-specific adds are niche and should stay niche.
- **A "no" is NOT a rejection.** It must not write a `curation_decisions` row with
  `decision: "rejected"`. Doing so would teach the system that assistant manual
  adds are low-quality — they are the opposite. Log it as a distinct decision type
  (`kept_client_bound`) or not at all.
- A "yes" flips `content_scope` → `general`, clears `requested_by_client`, drops
  the `requested_for` edge (per `SCHEMA_V2_6` §unique_request), and the item
  enters the pool.

### "For the pool"

- Standard path. `provenance: assistant_manual`. Normal approve/reject in the
  Approval Catalogue.

### Why not a checkbox

The original instinct was a "pre-approved" checkbox at the bottom of the form.
Rejected: "for a client" vs "for the pool" is not a property of the item, it is a
**different job**, and it changes which fields are required. It belongs at the
top as a mode switch, not the bottom as an afterthought.

---

## 3. The Edit

**The only genuinely new build in this spec.**

### 3.1 Who gets an Edit

**One Edit per adult profile per week.** Children do not receive Edits — they are
**content, not audience.**

Children generate two kinds of content, both handled by the existing care-stage
persona model with no schema change:

1. **Things *for* the child** — a holiday club for Noah. Parent buys, child
   benefits.
2. **Things for the parent *because of* the child** — a restaurant with a decent
   kids' menu. Parent benefits, child is a constraint.

### 3.2 Composition is a HOUSEHOLD operation

> **This is the load-bearing decision. Read it twice.**

Emma and James both match the same care-stage personas (both connected to Noah 9,
Lily 6, Sophie 14). A naive per-profile composer will therefore surface *the same
child-derived items to both of them* — they open their apps and see the identical
holiday club. That reads as a bug, not a service.

Therefore: **the composer runs per household and writes per profile.** One LLM
call sees all adult Edits in the household simultaneously, with
*do-not-repeat-across-the-household* as a hard constraint. A child-derived item
lands in **exactly one** parent's Edit.

**Tiebreak on which parent — SETTLED (14 Jul):**

A child-derived item that matches multiple adults defaults to the household's
**primary member**. The assistant can reassign any individual item to another
adult (the `moved_to_profile` decision, §4). Default to primary, move by exception.

**The composer READS the primary designation — it never computes it.** Primary is
determined upstream by the main BlckBx system. The composer consumes that value; it
must not infer a primary carer from the household graph, relationship edges, or any
heuristic. Inferring the primary is exactly the "make an agent reliably apply a
rule" failure mode — it is a human/upstream decision the composer reads, full stop.

**Scope of "primary" is tightly bounded:** it is *only* the default recipient for
household-shared and child-derived items. It does not mean "the important adult,"
must not affect Edit quality, item count, or composition priority for either adult,
and must not accrete additional meaning over time.

**Two implementation seams for step 6 — seam 1 now RESOLVED:**

1. *Read location — RESOLVED.* The primary designation already exists in the
   `blckbx_inspiration` graph: `has_profile` (`client_accounts → profiles`) carries
   an **`is_primary` boolean**, with exactly one `is_primary: true` edge per client
   account (`SCHEMA_V2_7.md`, edge #41). The composer reads the primary profile by
   finding the household's `has_profile` edge where `is_primary == true`. No
   cross-system integration, no synced field — it's a direct graph read. This is a
   *read*, not a computation: the composer must not derive primacy from anything
   other than this flag.
2. *Missing/stale fallback.* If no `is_primary: true` edge exists for a household
   when the composer runs (data gap, mid-migration account), the composer must
   **not** guess silently or drop the item: fall back to a deterministic pick
   (first `has_profile` edge by profile `_key`, adults only) AND surface a "no
   primary set" flag in the Recommendations Manager queue for that household. Make
   the gap visible; never bury it.

**Consequences:**

- **The Edit queue is a household worklist**, not a client dropdown. The assistant
  works "the Hartleys," seeing Emma's and James's drafts side by side — they need
  both in view to judge the split.
- **Swapping in one Edit can affect the other.** Pulling the holiday club from
  Emma's should *offer* it to James's, not silently move it.
- `composition_decisions` needs **`moved_to_profile`** as a decision type distinct
  from swap and remove. "Wrong parent" is a different signal from "wrong item."

### 3.3 Section caps

**Two items per section. Four sections. Eight items total.**

| Section | Cap |
|---|---|
| Going Out | 2 |
| Staying In | 2 |
| Shopping | 2 |
| Gifting | 2 |

Travel is **not** in the weekly Edit — separate monthly cadence, Travel Twin,
own surface.

> Caps are **ceilings, not floors.** Quality beats filling slots. Ship a section
> with one item rather than a weak second.

**Design consequence of a cap this tight:** a single swap is **50% of a section.**
The bar on the LLM draft is correspondingly high, and the assistant has almost no
room to rubber-stamp. That is the point. But it means Regenerate (§3.5) is not a
rare escape hatch — it is the likely response to a weak section, and must
therefore work **per-section**, not only whole-Edit.

> **Risk to hold in view:** a bounded Edit is *naked* in a way an endless feed is
> not. A feed hides thin personalisation — you scroll past. Two picks where one is
> obviously off reads as "they don't know me." Scarcity makes every miss visible.
> Hard dependency: content-supply depth and per-profile personalisation must be
> good enough to fill 8 quality slots per adult per week **before launch.**

### 3.4 The surface

**Left rail — the household queue.** Every household needing an Edit this week,
with status. The Monday-morning job is "get this list to zero." Not-started first.

**Main panel, on selecting a household:** the adults' drafts, side by side.

**Per-adult header strip.** Read-only, compact. Name, matched personas with
weights (`connected-to-teen · 0.7`, `quiet-luxury-home-cook · 0.9`), price tier,
key dates in the next fortnight. The assistant must hold the person in their head
before judging picks.

**Body — the draft, by section.** Each card:

```
┌─────────────────────────────────────────┐
│ [img]  The Ledbury                      │
│        Restaurant · Notting Hill · ££££ │
│                                         │
│ ↳ She saved two similar bookings;       │
│   James' birthday is in 9 days.         │
│                                         │
│ [Book ▾]     [Swap] [Move] [Remove]     │
└─────────────────────────────────────────┘
```

- **Rationale always visible.** This is the anti-rubber-stamping mechanism. An
  assistant reviewing a *reasoned* proposal thinks; one reviewing a bare list
  scrolls. Non-negotiable.
- **Bound action** — dropdown, LLM's suggestion pre-selected
  (`ask_assistant` | `book` | `buy` | `save`). Changing it is itself a signal.
- **Swap** → opens Pool search inline, pre-filtered to the section, pre-ranked for
  this profile. **Reason tap is MANDATORY.** Preset chips: `wrong price tier` /
  `already been` / `not their taste` / `bad timing` / `better option`. If the
  reason is optional it will not get filled, and the swap log is the entire point
  of this tool.
- **Move** → reassign to the other adult in the household. Logs
  `moved_to_profile`.
- **Remove** → drop without replacement. Distinct signal from swap: "nothing
  belongs here this week." **Carries a reason on the same pattern as swap** —
  mandatory preset chip + optional free text (chips e.g. `nothing fits` /
  `section too full` / `wrong week` / `client wouldn't want`). Logs a `remove`
  decision. The reason is what makes a removal a signal rather than a silent gap.
- **Add from Pool**, per section — for when the assistant knows something the LLM
  did not.

### 3.5 Regenerate

Per-section and whole-Edit. **Requires a reason** — "why was this draft bad" is a
signal about the *composer*, categorically different from item-level swap signal.
Log separately.

### 3.6 Ship

Freezes the week. `status: shipped`, `shipped_at` set, `items` locked.

**Reversible via a 15-minute undo window.** Hard freeze was considered and
rejected: "shipped the wrong Edit to a Black-tier client at 09:00 Monday" is a
realistic and expensive error. The window is cheap, covers the realistic mistake,
and keeps the freeze meaningful. After 15 minutes: frozen.

### 3.7 The standing law, applied

**LLM proposes, human disposes.** The LLM does the mechanical work — sift, match,
draft, write the rationale. The assistant does the judgment — final yes, swaps,
moves — using context the system structurally cannot hold (the phone call, last
year's flopped gift). We delete the *tedious* part of the assistant's job and keep
the *valuable* part.

**Every swap is the highest-value signal in the system.** The LLM proposed X; the
human who knows the client best chose Y. Capture out, in, and reason.

---

## 4. Schema — new collections

### `weekly_edits`

One doc per **adult profile** per week.

| Field | Type | Notes |
|---|---|---|
| `_key` | String | `{profile_key}_{week_of}` — deterministic; prevents duplicate Edits for a week |
| `profile_key` | String | Who it's for |
| `household_key` | String | Denormalised — the composition unit; needed for the dedupe query |
| `week_of` | Date | The Monday. The freeze anchor. |
| `status` | Enum | `draft` \| `shipped` |
| `composed_by` | String | Assistant identity |
| `shipped_at` | DateTime | Null until shipped |
| `llm_proposed` | Array[Item] | **The original draft, frozen at draft time. NEVER mutated.** |
| `items` | Array[Item] | The final shipped set. Initialised as a copy of `llm_proposed`. |
| `personas_matched` | Array[{slug, weight}] | Snapshot of the blend used — lets you audit *why* an Edit looked the way it did |

**Item** (embedded object):

| Field | Notes |
|---|---|
| `recommendation_key` | Pointer to the pool item |
| `section` | `going_out` \| `staying_in` \| `shopping` \| `gifting` |
| `position` | Order within section |
| `bound_action` | `ask_assistant` \| `book` \| `buy` \| `save` |
| `rationale` | The one-liner. LLM-written; assistant may edit. |
| `snapshot` | Name, image, price, URL **at compose time** |

> **Why `llm_proposed` and `items` are separate fields:** the swap delta is the
> single highest-value training signal in the system. It cannot be computed if only
> the final state is stored. Do not "optimise" these into one.

> **Why `snapshot` exists:** a shipped Edit is an **immutable historical record.**
> Pool items get removed, prices change, venues close. If the Edit stores only keys
> and resolves at render, last week's Edit silently rewrites itself. Snapshot on
> compose.

> **Why this is not a JSON blob on the profile:** (a) it must be an immutable
> snapshot, per above; (b) you need to query *across* Edits — "how often does the
> LLM's #1 pick survive to ship?", "which pool items keep getting swapped out?" —
> which is impossible against blobs; (c) composition is household-level while the
> doc is profile-level, so there is no single profile the blob belongs on.

### `composition_decisions`

One doc per assistant intervention. Mirrors `curation_decisions`, one layer up.

| Field | Notes |
|---|---|
| `edit_key` | |
| `profile_key`, `household_key`, `week_of` | |
| `decision_type` | `swap` \| `remove` \| `moved_to_profile` \| `regenerate_section` \| `regenerate_edit` |
| `section` | |
| `item_out` | rec key + snapshot |
| `item_in` | rec key + snapshot. Null on `remove`. |
| `moved_to_profile_key` | Only on `moved_to_profile` |
| `reason` | Preset tap + optional free text |
| `decided_by`, `decided_at` | |

---

## 5. Schema — v2.8 delta (changes to EXISTING collections)

Two changes fall out of decisions made this session. Neither is an oversight in
v2.6 — the model changed underneath it.

### 5.1 `unique_request` must NOT block graph learning

`SCHEMA_V2_6.md` states the graph update workflow **skips entirely** for
`content_scope: "unique_request"` — no `interested_in` updates, no
`has_affinity_for`, no tag boosts.

**That was correct when unique requests were one-off client asks. It is wrong now.**
An assistant hand-adding an item for Emma *because they know Emma* is the strongest
taste signal in the system. Discarding it is a significant loss.

**Change:** unique-request items **DO** write graph signal for the profile they are
scoped to. They simply do not enter the general pool. Scope-out of the pool ≠
scope-out of learning.

### 5.2 `requested_for` must point at `profiles`, not `client_accounts`

`requested_for` currently targets `client_accounts`. So an item added "for Emma" is
really recorded against "the Hartleys" — and you cannot tell whether it was meant
for Emma or James.

Given Edits are now **per adult profile** with household-level dedupe, this is
load-bearing. Ambiguity here breaks composition.

**Change:** repoint `requested_for` at `profiles`. (Cleaner than adding a second
parallel edge.) Update `inspiration_graph` accordingly.

---

## 6. UI refresh — design tokens

Applies to **both** the Recommendations Manager and the Approval Catalogue. They
are sibling tools and must not drift.

### 6.1 What this is

`design.md` (the BlckBx style guide) is a **marketing-site** scale — H1 at 64px,
body at 16–24px, buttons at 20px with 35×21 padding. These are **dense internal
tools**. Applied literally, a 36px Cormorant card title means four candidates fill
a 1440px screen and Kath's throughput — already a critical-path dependency for
freemium wait times — gets worse.

**So: same fonts, same palette, same square corners — rescaled to roughly half.**
The brand reads identically. The density is a tool's.

### 6.2 Type scale

| Role | `design.md` | **Tool scale** |
|---|---|---|
| Page title | H1 · 64px Cormorant | **28px** Cormorant, 400 |
| Section head | H3 · 36px Cormorant | **18px** Cormorant, 500 |
| Item name (card title) | — | **20px** Cormorant, 500 |
| Label / column head | Pre-heading · 14px, 3px track | **11px**, 3px track, uppercase, `#898479` |
| Body / metadata | 16px Inter · `#404040` | **13px** Inter · `#404040` |
| Secondary / muted | 20px · `#696969` | **12px** Inter · `#696969` |
| Button | 20px · 35×21 padding | **13px** · 16×9 padding |
| Italic accent | Noto Serif italic · `#756F65` | Unchanged, used sparingly |

**Fonts:** Cormorant Garamond (all headings and item names), Inter (everything
functional), Noto Serif italic (accent lines only).

### 6.3 Palette

Straight from `design.md`, no additions:

| Token | Hex | Use |
|---|---|---|
| Near black | `#171717` | Headings, item names, primary buttons, links |
| Body | `#404040` | Body copy, metadata |
| Muted | `#696969` | Secondary text, disabled |
| Taupe | `#898479` | Pre-headings, labels, markers |
| Warm brown | `#756F65` | Italic accent |
| Rule | `#E4E2DD` | Hairlines, borders |
| Rule soft | `#EFEDE9` | Grid gaps, internal dividers |
| Ground | `#FFFFFF` | Page |
| Hover | `#FAF9F7` | Row/control hover |

**Square corners everywhere. `border-radius: 0`. No exceptions.**

### 6.4 Functional colour — **OPTION B (chosen)**

`design.md` has no functional colour. A tool needs it. Three hues added,
desaturated and warmed to sit beside the taupes, used **only** for status:

| Role | Hex | Use |
|---|---|---|
| Warning | `#FAEEDA` bg / `#854F0B` text / `#EFDCBB` rule | Needs-review bar |
| Success | `#3B6D11` | In-stock marker |
| Error | `#A32D2D` | Out-of-stock marker |
| Destructive | `#8C3A32` | **Reject / Remove buttons only** |

**Rationale for B over monochrome:** across a 57-card grid, hue scans faster than
weight. Throughput is the binding constraint. Monochrome was the more restrained
option and was rejected on that ground.

> **Destructive red is non-negotiable and separate from the above.** Reject and
> Remove are the only destructive actions on either screen. They must not look
> like Approve. Outline red, filling on hover.

### 6.5 What is being replaced

The current tools use a different system. It goes:

| Out | In |
|---|---|
| Playfair Display | **Cormorant Garamond** |
| DM Sans | **Inter** |
| Sand ramp `#F5F3F0` / `#E8E5E0` | **White ground + `#E4E2DD` hairlines** |
| **CTA yellow `#E7C51C`** | **Black** (`#171717`) |
| Mint `#F1F8F8` / `#C0DDED` pills | Bordered tags, `#E4E2DD` rule |

> **Brace for the yellow.** The approve button has been CTA-yellow for four
> months. It becomes black. This is the single biggest perceptual change and Kath
> should be told before it lands, not after.

### 6.6 The bound-action control (The Edit)

The first draft used a boxed `<select>` for the bound action. **Rejected** — a full
black-bordered box reads as an empty form field ("fill me in") and becomes the
loudest thing on the card, competing with the item name. The bound action is not
an empty field: the LLM already picked it. It is a **default the assistant usually
accepts**.

**Chosen pattern — action-as-primary-button, with an inline change menu:**

- The action verb (`Book` / `Buy` / `Ask assistant` / `Save`) renders as the
  **primary button** — black fill `#171717`, white text, square, 8×16 padding.
  This is the one thing the card is *for*; it should look pressable. One tap.
- A quiet **`Change`** control sits beside it — `#898479` taupe, no border,
  smaller. It is visually **separated from Swap / Move / Remove** (a gap or
  divider), because those act on the *item* while Change acts on the *action*.
  Four equal-weight text links would blur two different jobs into one row.
- Tapping `Change` reveals the four verbs as a **small inline list beneath the
  button** — not a native dropdown, not a cycle-on-tap. Inline menu keeps the
  primary action one-tap and only surfaces alternatives when the assistant
  actively wants to override.
- **Changing the action is itself a logged signal** (the LLM's suggestion vs. the
  assistant's override) — see §3.4. The control being quiet does not mean the
  event is unimportant.

Native `<select>` elements are **not** used anywhere in either tool — they can't be
styled to the square/hairline system and the native chevron fights the diamond
motif.

### 6.7 The one ornament

The **diamond marker** (◇), lifted from the bullet in `design.md`, is the only
decorative element permitted. It carries three jobs:

- Opens the LLM rationale on every Edit card
- Marks stock status in the Catalogue
- Opens the needs-review bar

Everything else is type, rule, and whitespace. **Do not add a second motif.**

### 6.8 Layout — unchanged

The responsive 4-up ladder and per-category aspect ratios survive the refresh
untouched. They work.

| Viewport | Columns |
|---|---|
| ≥ 1400px | 4 |
| 1024–1399px | 3 |
| 640–1023px | 2 |
| < 640px | 1 |

Aspect ratios: Shopping portrait 3:4; everything else landscape 4:3; Requests 1:1.

**Reference implementation:** `blckbx-ui-refresh.html` (14 Jul) — Approval
Catalogue grid and The Edit split-view, both at final tokens.

---

## 7. Build sequence

1. **v2.8 migration** — §5.1 and §5.2. Do this first; everything else assumes it.
2. `weekly_edits` + `composition_decisions` collections.
3. **UI refresh (§6)** — both tools, shared token file. Do this as one pass across
   both, not tool-by-tool, or they drift.
4. Add Item routing change (§2) — smallest piece, ships independently.
5. Pool: rename the Search tab to Pool; add the filter set (§1). No remove
   control, no Removed view — those were dropped (§1). Small step.
6. **The composer** — household-level, dedupe constraint, per-profile writes. The
   long pole.
7. The Edit surface (§3.4) — queue, side-by-side drafts, swap/move/remove,
   regenerate, ship + undo window.
8. Drop Task Matcher and Lists.

---

## 8. Open / not settled

- [ ] **The Edit's real name.** "The Edit" is the noun the client receives and the
      boss uses. Provisional for the internal tool.
- [x] **Primary-carer tiebreak rule — SETTLED (14 Jul), see §3.2.** Child-derived
      items default to the household's primary member (determined upstream by the
      main system; the composer reads, never computes), assistant reassigns by
      exception. Two implementation seams remain for step 6 to confirm — where the
      composer reads `primary` from, and the missing/stale fallback — both noted in
      §3.2, neither blocks the design.
- [ ] **Regenerate cost.** Per-section regenerate at a 2-item cap could be invoked
      often. Watch the LLM spend.
- [ ] **`kept_client_bound` logging.** §2 says a "no" on pool-promotion is not a
      rejection. Decide whether it logs at all, and to where.
- [ ] **Single-adult households.** §3.2's dedupe logic assumes ≥2 adults. Degenerate
      case is presumably fine (no dedupe to do) but should be confirmed, not assumed.
