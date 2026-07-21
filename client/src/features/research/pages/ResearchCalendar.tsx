/**
 * Events Calendar — time-first browse over dated pool items (step 9d).
 * Read-only v1: month grid + side panel. No add-to-Edit / edit / source filters.
 *
 * Plot rule: marker on event_start only — never span event_start→event_end.
 * event_end is listings coverage, shown only in the detail panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchDatedRecommendations } from "../lib/api";
import type { Recommendation } from "../lib/types";
import "../calendar.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MAX_CELL_EVENTS = 3;

const SECTION_LABELS: Record<string, string> = {
  shopping: "Shopping",
  going_out: "Going Out",
  travel: "Travel",
  staying_in: "Staying In",
  gifting: "Gifting",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar day as YYYY-MM-DD */
function toDateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function eventStartDateKey(eventStart: string): string {
  return eventStart.slice(0, 10);
}

function hasClockTime(iso: string): boolean {
  // Date-only: YYYY-MM-DD. Datetime has T or space + time.
  return /T\d{2}:\d{2}| \d{2}:\d{2}/.test(iso);
}

function formatEventTime(eventStart: string | null | undefined): string {
  if (!eventStart) return "—";
  if (!hasClockTime(eventStart)) return "All day";
  const d = new Date(eventStart);
  if (Number.isNaN(d.getTime())) return "All day";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatLongDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCoverageDate(iso: string): string {
  const key = iso.slice(0, 10);
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function monthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex, 1)
  );
}

function monthRange(year: number, monthIndex: number): { from: string; to: string } {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return {
    from: toDateKey(year, monthIndex, 1),
    to: toDateKey(year, monthIndex, lastDay),
  };
}

/** Monday-start grid cells for the visible month (includes leading/trailing days). */
function buildMonthCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  // JS: 0=Sun … 6=Sat → Monday-first offset
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const cells: Array<{
    dateKey: string;
    day: number;
    inMonth: boolean;
  }> = [];

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - mondayOffset + 1;
    const date = new Date(year, monthIndex, dayNumber);
    cells.push({
      dateKey: toDateKey(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    });
  }

  return cells;
}

function sectionLabel(category?: string | null): string {
  if (!category) return "";
  return SECTION_LABELS[category] ?? category.replaceAll("_", " ");
}

function locationLine(item: Recommendation): string {
  return item.location || item.destination || "";
}

function coverageNote(item: Recommendation): string | null {
  if (!item.event_start || !item.event_end) return null;
  const startKey = eventStartDateKey(item.event_start);
  const endKey = item.event_end.slice(0, 10);
  if (endKey === startKey) return null;
  // Framed as listings coverage — never "runs until"
  return `Also showing through ${formatCoverageDate(item.event_end)} · listings coverage`;
}

function sortEvents(a: Recommendation, b: Recommendation): number {
  const as = a.event_start || "";
  const bs = b.event_start || "";
  if (as !== bs) return as.localeCompare(bs);
  return (a.name || "").localeCompare(b.name || "");
}

function todayKey(): string {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function ResearchCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [events, setEvents] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dayRefs = useRef<Map<string, HTMLElement>>(new Map());

  const range = useMemo(() => monthRange(year, monthIndex), [year, monthIndex]);
  const cells = useMemo(() => buildMonthCells(year, monthIndex), [year, monthIndex]);
  const today = todayKey();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDatedRecommendations({
        event_start_from: range.from,
        event_start_to: range.to,
      });
      setEvents(result.data.slice().sort(sortEvents));
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : "Failed to load dated events.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Clear selection when month changes
  useEffect(() => {
    setSelectedDateKey(null);
    setSelectedEventKey(null);
  }, [year, monthIndex]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Recommendation[]>();
    for (const item of events) {
      if (!item.event_start) continue;
      const key = eventStartDateKey(item.event_start);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    Array.from(map.values()).forEach((list) => list.sort(sortEvents));
    return map;
  }, [events]);

  const dayGroups = useMemo(() => {
    const keys = Array.from(eventsByDate.keys()).sort();
    return keys.map((dateKey) => ({
      dateKey,
      events: eventsByDate.get(dateKey) ?? [],
    }));
  }, [eventsByDate]);

  const selectedEvent = useMemo(
    () => events.find((e) => e._key === selectedEventKey) ?? null,
    [events, selectedEventKey]
  );

  const scrollToDay = useCallback((dateKey: string) => {
    const el = dayRefs.current.get(dateKey);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleDayClick = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setSelectedEventKey(null);
    // Free-scroll: jump panel to that day if it has events; empty days stay selected on grid only
    if (eventsByDate.has(dateKey)) {
      // Defer so sticky headers paint before scroll
      window.requestAnimationFrame(() => scrollToDay(dateKey));
    }
  };

  const goPrevMonth = () => {
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  const goThisMonth = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonthIndex(n.getMonth());
  };

  const sideTitle = selectedDateKey
    ? formatLongDate(selectedDateKey)
    : monthLabel(year, monthIndex);

  const sideCount = selectedDateKey
    ? `${eventsByDate.get(selectedDateKey)?.length ?? 0} event${
        (eventsByDate.get(selectedDateKey)?.length ?? 0) === 1 ? "" : "s"
      } this day`
    : `${events.length} dated event${events.length === 1 ? "" : "s"} this month`;

  return (
    <div className="cal-surface">
      <div className="cal-head">
        <div>
          <h1 className="cal-head__title">Calendar</h1>
          <p className="cal-head__meta">
            Dated pool items by start date · discovery only
          </p>
        </div>
        <div className="cal-nav">
          <button type="button" className="button-secondary" onClick={goPrevMonth}>
            Previous
          </button>
          <div className="cal-nav__label">{monthLabel(year, monthIndex)}</div>
          <button type="button" className="button-secondary" onClick={goNextMonth}>
            Next
          </button>
          <button type="button" className="button-secondary" onClick={goThisMonth}>
            Today
          </button>
        </div>
      </div>

      <div
        className={`cal-body${selectedEvent ? " cal-body--has-detail" : ""}`}
      >
        {/* Column 1 — month grid (dominant) */}
        <div className="cal-grid-pane">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday">
                {d}
              </div>
            ))}
          </div>
          <div className="cal-grid" role="grid" aria-label="Events calendar">
            {cells.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
              const visible = dayEvents.slice(0, MAX_CELL_EVENTS);
              const overflow = dayEvents.length - visible.length;
              const isSelected = selectedDateKey === cell.dateKey;
              const isToday = cell.dateKey === today;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  role="gridcell"
                  className={[
                    "cal-cell",
                    cell.inMonth ? "" : "cal-cell--outside",
                    isToday ? "cal-cell--today" : "",
                    isSelected ? "cal-cell--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(cell.dateKey)}
                  aria-label={`${formatLongDate(cell.dateKey)}, ${dayEvents.length} events`}
                >
                  <span className="cal-cell__day">{cell.day}</span>
                  <div className="cal-cell__markers">
                    {visible.map((ev) => (
                      <div key={ev._key} className="cal-marker">
                        <span className="bb-diamond bb-diamond--outline" aria-hidden />
                        <span className="cal-marker__name">{ev.name}</span>
                      </div>
                    ))}
                    {overflow > 0 ? (
                      <div className="cal-marker__more">+{overflow} more</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2 — free-scroll day / month list */}
        <aside className="cal-side" aria-label="Event list">
          <div className="cal-side__head">
            <div className="cal-side__label">
              {selectedDateKey ? "Day" : "Upcoming"}
            </div>
            <div className="cal-side__title">{sideTitle}</div>
            <div className="cal-side__count">{sideCount}</div>
          </div>

          <div className="cal-side__scroll" ref={scrollRef}>
            {loading ? (
              <div className="cal-status">Loading dated events…</div>
            ) : error ? (
              <div className="cal-status cal-status--error">{error}</div>
            ) : dayGroups.length === 0 ? (
              <div className="cal-empty">
                No dated events with a start date in this month.
              </div>
            ) : (
              dayGroups.map((group) => (
                <div
                  key={group.dateKey}
                  className={`cal-day-group${
                    selectedDateKey === group.dateKey ? " cal-day-group--active" : ""
                  }`}
                  ref={(el) => {
                    if (el) dayRefs.current.set(group.dateKey, el);
                    else dayRefs.current.delete(group.dateKey);
                  }}
                  data-date={group.dateKey}
                >
                  {/* Panel title already has the selected day's date — don't repeat it as a sticky header. */}
                  {selectedDateKey === group.dateKey ? null : (
                    <div className="cal-day-group__head">{formatLongDate(group.dateKey)}</div>
                  )}
                  {group.events.map((ev) => (
                    <button
                      key={ev._key}
                      type="button"
                      className={`cal-event${
                        selectedEventKey === ev._key ? " cal-event--selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedDateKey(group.dateKey);
                        setSelectedEventKey(ev._key);
                      }}
                    >
                      <span className="bb-diamond bb-diamond--outline" aria-hidden />
                      <div className="cal-event__body">
                        <div className="cal-event__name">{ev.name}</div>
                        <div className="cal-event__meta">
                          <span>{formatEventTime(ev.event_start)}</span>
                          {locationLine(ev) ? <span>{locationLine(ev)}</span> : null}
                          {ev.category ? (
                            <span className="cal-event__section">
                              {sectionLabel(ev.category)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Column 3 — event detail rail (always present; empty until selection) */}
        <aside className="cal-detail-pane" aria-label="Event detail">
          {selectedEvent ? (
            <div className="cal-detail">
              <div className="cal-detail__toolbar">
                <button
                  type="button"
                  className="cal-detail__back"
                  onClick={() => setSelectedEventKey(null)}
                >
                  Back to list
                </button>
                <button
                  type="button"
                  className="cal-detail__close"
                  onClick={() => setSelectedEventKey(null)}
                >
                  Close
                </button>
              </div>
              <div className="cal-detail__scroll">
                <div className="cal-detail__inner">
                  {selectedEvent.image_url || selectedEvent.hero_image_url ? (
                    <img
                      className="cal-detail__image"
                      src={selectedEvent.hero_image_url || selectedEvent.image_url || ""}
                      alt=""
                    />
                  ) : null}
                  <div className="cal-detail__name">{selectedEvent.name}</div>

                  <div className="cal-detail__row">
                    <div className="cal-detail__row-label">When</div>
                    <div className="cal-detail__row-value">
                      {selectedEvent.event_start
                        ? `${formatLongDate(eventStartDateKey(selectedEvent.event_start))} · ${formatEventTime(selectedEvent.event_start)}`
                        : "—"}
                    </div>
                  </div>

                  {locationLine(selectedEvent) ? (
                    <div className="cal-detail__row">
                      <div className="cal-detail__row-label">Where</div>
                      <div className="cal-detail__row-value">{locationLine(selectedEvent)}</div>
                    </div>
                  ) : null}

                  {selectedEvent.category ? (
                    <div className="cal-detail__row">
                      <div className="cal-detail__row-label">Section</div>
                      <div className="cal-detail__row-value">
                        {sectionLabel(selectedEvent.category)}
                      </div>
                    </div>
                  ) : null}

                  {coverageNote(selectedEvent) ? (
                    <div className="cal-detail__coverage">{coverageNote(selectedEvent)}</div>
                  ) : null}

                  {selectedEvent.description ? (
                    <div className="cal-detail__desc">{selectedEvent.description}</div>
                  ) : null}

                  {(selectedEvent.source_name ||
                    selectedEvent.source ||
                    selectedEvent.source_url ||
                    selectedEvent.url) && (
                    <div className="cal-detail__source">
                      {selectedEvent.source_name || selectedEvent.source || "Source"}
                      {selectedEvent.source_url || selectedEvent.url ? (
                        <>
                          {" · "}
                          <a
                            href={selectedEvent.source_url || selectedEvent.url || "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open link
                          </a>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="cal-detail-empty">
              <div className="cal-detail-empty__label">Detail</div>
              <p className="cal-detail-empty__copy">Select an event</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
