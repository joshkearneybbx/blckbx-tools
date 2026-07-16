# SCHEMA v2.9 — Event-timing fields

**Delta on:** `recommendations`, `product_candidates`  
**Depends on:** SCHEMA_V2_7 / v2.8 (`requested_for` → profiles, weekly_edits)  
**Migration:** `gateway/migrations/v2_9_event_timing_fields.js` (`--dry-run` | `--confirm`)  
**Purpose:** Foundation for an event-calendar surface (step 9d). Capture dates at ingestion so promotion cannot drop them.

---

## New fields (both collections)

| Field | Type | Default | Notes |
|---|---|---|---|
| `event_start` | string (ISO 8601) \| null | null | Event start. **Date-only allowed** (`YYYY-MM-DD`) = all-day. Do **not** invent a time when only a date is known. |
| `event_end` | string (ISO 8601) \| null | null | `null` = single occurrence/moment. Present = range/window (festival, Wimbledon fortnight, exhibition run). |
| `is_dated` | boolean | `false` | Calendar filter flag. Products (coat) → `false`. Events (concert) → `true`. Calendar pulls `is_dated == true` without guessing content type. |

### Semantics

- **Date-only `event_start`:** valid. Example `"2026-07-26"` means all-day on that date.
- **Datetime `event_start`:** valid when a real start time is known (`"2026-07-26T19:30:00+01:00"`).
- **`event_end` null:** one-shot / moment.
- **`event_end` set:** inclusive window; prefer same precision as start (date-only range or datetime range).
- **`is_dated`:** explicit flag — never infer solely from category.

### Explicitly out of scope (v1)

- No recurrence / RRULE / weekly markets as series.
- No automatic date parsing from free text in this delta (ingestion population is step 9b+).
- Recurring residencies: model as next occurrence, or leave undated.

---

## Why both collections

An event can enter as a **product_candidate** (assistant hand-add, scrape staging) and must keep its date through **promotion** into `recommendations`. Capturing only on the pool side loses dates on approval.

### Promote contract (required)

`POST /candidates/promote` and the unique_request create path that writes a live recommendation **must copy**:

```
candidate.event_start  →  recommendation.event_start
candidate.event_end    →  recommendation.event_end
candidate.is_dated     →  recommendation.is_dated   (default false if missing)
```

Helper: `gateway/src/lib/event-timing.ts` → `pickEventTiming()`.

---

## Migration behaviour

| Mode | Effect |
|---|---|
| `--dry-run` | Inventory counts: missing `is_dated`, already dated, has `event_start`; list indexes to create. No writes. |
| `--confirm` | Soft-default `is_dated: false` where field missing/null; create persistent indexes. **Does not invent** `event_start` / `event_end`. |

Indexes (both collections):

- `idx_is_dated` → `[is_dated]`
- `idx_event_start` → `[event_start]` (sparse)
- `idx_is_dated_event_start` → `[is_dated, event_start]`

---

## API / validation

Accepted on create/patch (zod):

- `event_start`: nullable ISO date (`YYYY-MM-DD`) or datetime string
- `event_end`: same; if both set, end must not be before start
- `is_dated`: boolean, default `false`

Gateway types: `ProductCandidate`, `Recommendation`, `UpdateCandidateBody`.

---

## Follow-on (not this delta)

- **9b+** Populate from Ticketmaster / scrapes / Engage.
- **9d** Calendar UI filtering on `is_dated` + range.
- Optional Meilisearch filterables for dated pool search.
