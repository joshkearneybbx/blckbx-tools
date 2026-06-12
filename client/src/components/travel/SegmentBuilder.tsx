import type { ReactNode } from "react";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Hotel,
  Plane,
  Plus,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  emptyAccommodationSegment,
  emptySubAccommodationSegment,
  emptyFlightLeg,
  emptyFlightSegment,
  emptyTransferSegment,
  segmentLabel,
} from "@/lib/bookings";
import type {
  AccommodationSegment,
  BookingSegment,
  FlightLeg,
  FlightSegment,
  TransferSegment,
} from "@/lib/types";

const buttonToneClasses = {
  primary:
    "border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] text-white hover:bg-white hover:text-[hsl(var(--base-black))]",
  secondary:
    "border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--base-black))]",
  danger:
    "border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]",
} as const;

export const SEGMENT_OPTIONS = [
  { label: "Transfer", value: "transfer", icon: Car },
  { label: "Flight", value: "flight", icon: Plane },
  { label: "Accommodation", value: "accommodation", icon: Hotel },
] as const;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function BookingsButton({
  label,
  onClick,
  tone = "primary",
  disabled = false,
  icon: Icon,
  fullWidth = false,
  className = "",
  title,
}: {
  label: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 border px-5 py-2.5 text-sm font-medium transition rounded-none disabled:cursor-not-allowed disabled:opacity-50 ${buttonToneClasses[tone]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

export function IconActionButton({
  onClick,
  icon: Icon,
  label,
  tone = "secondary",
  disabled = false,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  tone?: "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center border text-[hsl(var(--base-black))] transition rounded-none disabled:cursor-not-allowed disabled:opacity-50 ${buttonToneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-[hsl(var(--sand-900))]">{label}</span>
      {children}
    </label>
  );
}

export function getSegmentIcon(type: BookingSegment["type"]): LucideIcon {
  if (type === "flight") return Plane;
  if (type === "accommodation") return Hotel;
  return Car;
}

export function SegmentShell({
  segmentType,
  title,
  children,
  onMoveUp,
  onMoveDown,
  onDelete,
  moveUpDisabled = false,
  moveDownDisabled = false,
}: {
  segmentType: BookingSegment["type"];
  title: string;
  children: ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
}) {
  const Icon = getSegmentIcon(segmentType);

  return (
    <div className="border border-[hsl(var(--sand-300))] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[hsl(var(--base-black))] px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]">
          <Icon className="h-4 w-4" />
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <IconActionButton onClick={onMoveUp} icon={ChevronUp} label="Move up" disabled={moveUpDisabled} />
          <IconActionButton onClick={onMoveDown} icon={ChevronDown} label="Move down" disabled={moveDownDisabled} />
          <IconActionButton onClick={onDelete} icon={Trash2} label="Remove segment" tone="danger" />
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function isAccommodationSegment(segment: BookingSegment): segment is AccommodationSegment {
  return segment.type === "accommodation";
}

function isSubAccommodationSegment(segment: BookingSegment): segment is AccommodationSegment {
  return isAccommodationSegment(segment) && Boolean(segment.parentId);
}

function normalizeSubAccommodationOrder(segments: BookingSegment[]): BookingSegment[] {
  const topLevelAccommodationIds = new Set(
    segments
      .filter((segment): segment is AccommodationSegment =>
        isAccommodationSegment(segment) && !segment.parentId
      )
      .map((segment) => segment.id)
  );
  const childrenByParent = new Map<string, AccommodationSegment[]>();
  const topLevelSegments: BookingSegment[] = [];

  segments.forEach((segment) => {
    if (isAccommodationSegment(segment) && segment.parentId) {
      if (topLevelAccommodationIds.has(segment.parentId) && segment.parentId !== segment.id) {
        const siblings = childrenByParent.get(segment.parentId) || [];
        siblings.push(segment);
        childrenByParent.set(segment.parentId, siblings);
        return;
      }

      topLevelSegments.push({ ...segment, parentId: undefined });
      return;
    }

    topLevelSegments.push(segment);
  });

  return topLevelSegments.flatMap((segment) => {
    if (isAccommodationSegment(segment) && !segment.parentId) {
      return [segment, ...(childrenByParent.get(segment.id) || [])];
    }

    return [segment];
  });
}

function blockEnd(segments: BookingSegment[], startIndex: number) {
  const segment = segments[startIndex];
  if (!isAccommodationSegment(segment) || segment.parentId) return startIndex;

  let endIndex = startIndex;
  while (endIndex + 1 < segments.length) {
    const next = segments[endIndex + 1];
    if (!next || !isAccommodationSegment(next) || next.parentId !== segment.id) break;
    endIndex += 1;
  }
  return endIndex;
}

function blockStart(segments: BookingSegment[], index: number) {
  const segment = segments[index];
  if (!isSubAccommodationSegment(segment)) return index;

  const parentIndex = segments.findIndex((item) => item.id === segment.parentId);
  return parentIndex >= 0 ? parentIndex : index;
}

function canMoveUp(segments: BookingSegment[], index: number) {
  const segment = segments[index];
  if (!segment) return false;
  if (isSubAccommodationSegment(segment)) {
    const previous = segments[index - 1];
    return Boolean(
      previous && isAccommodationSegment(previous) && previous.parentId === segment.parentId
    );
  }

  return index > 0;
}

function canMoveDown(segments: BookingSegment[], index: number) {
  const segment = segments[index];
  if (!segment) return false;
  if (isSubAccommodationSegment(segment)) {
    const next = segments[index + 1];
    return Boolean(next && isAccommodationSegment(next) && next.parentId === segment.parentId);
  }

  return blockEnd(segments, index) < segments.length - 1;
}

export function SegmentBuilder({
  segments,
  onChange,
  allowSubAccommodation = false,
}: {
  segments: BookingSegment[];
  onChange: (segments: BookingSegment[]) => void;
  allowSubAccommodation?: boolean;
}) {
  const visibleSegments = allowSubAccommodation ? normalizeSubAccommodationOrder(segments) : segments;
  const commit = (nextSegments: BookingSegment[]) =>
    onChange(allowSubAccommodation ? normalizeSubAccommodationOrder(nextSegments) : nextSegments);

  const addSegment = (type: BookingSegment["type"]) => {
    const next =
      type === "transfer"
        ? emptyTransferSegment()
        : type === "flight"
          ? emptyFlightSegment()
          : emptyAccommodationSegment();
    commit([...visibleSegments, next]);
  };

  const addSubAccommodation = (parentId: string) => {
    const parentIndex = visibleSegments.findIndex((segment) => segment.id === parentId);
    if (parentIndex < 0) return;

    const insertIndex = blockEnd(visibleSegments, parentIndex) + 1;
    commit([
      ...visibleSegments.slice(0, insertIndex),
      emptySubAccommodationSegment(parentId),
      ...visibleSegments.slice(insertIndex),
    ]);
  };

  const moveUp = (index: number) => {
    if (!canMoveUp(visibleSegments, index)) return;

    const segment = visibleSegments[index];
    if (isSubAccommodationSegment(segment)) {
      const next = [...visibleSegments];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      commit(next);
      return;
    }

    const currentStart = index;
    const currentEnd = blockEnd(visibleSegments, currentStart);
    const previousEnd = currentStart - 1;
    const previousStart = blockStart(visibleSegments, previousEnd);
    commit([
      ...visibleSegments.slice(0, previousStart),
      ...visibleSegments.slice(currentStart, currentEnd + 1),
      ...visibleSegments.slice(previousStart, currentStart),
      ...visibleSegments.slice(currentEnd + 1),
    ]);
  };

  const moveDown = (index: number) => {
    if (!canMoveDown(visibleSegments, index)) return;

    const segment = visibleSegments[index];
    if (isSubAccommodationSegment(segment)) {
      const next = [...visibleSegments];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      commit(next);
      return;
    }

    const currentStart = index;
    const currentEnd = blockEnd(visibleSegments, currentStart);
    const nextStart = currentEnd + 1;
    const nextEnd = blockEnd(visibleSegments, nextStart);
    commit([
      ...visibleSegments.slice(0, currentStart),
      ...visibleSegments.slice(nextStart, nextEnd + 1),
      ...visibleSegments.slice(currentStart, currentEnd + 1),
      ...visibleSegments.slice(nextEnd + 1),
    ]);
  };

  const remove = (segment: BookingSegment) =>
    commit(
      visibleSegments.filter(
        (item) => item.id !== segment.id && (!isAccommodationSegment(item) || item.parentId !== segment.id)
      )
    );

  const update = (next: BookingSegment) =>
    commit(visibleSegments.map((s) => (s.id === next.id ? next : s)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SEGMENT_OPTIONS.map((option) => (
          <BookingsButton
            key={option.value}
            label={`Add ${option.label}`}
            icon={option.icon}
            tone="secondary"
            onClick={() => addSegment(option.value)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {visibleSegments.map((segment, index) => (
          <SegmentShell
            key={segment.id}
            segmentType={segment.type}
            title={isSubAccommodationSegment(segment) ? `${segmentLabel(segment)} (Additional stay)` : segmentLabel(segment)}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
            onDelete={() => remove(segment)}
            moveUpDisabled={!canMoveUp(visibleSegments, index)}
            moveDownDisabled={!canMoveDown(visibleSegments, index)}
          >
            {segment.type === "transfer" ? (
              <TransferSegmentForm segment={segment} onChange={update} />
            ) : null}
            {segment.type === "flight" ? (
              <FlightSegmentForm segment={segment} onChange={update} />
            ) : null}
            {segment.type === "accommodation" ? (
              <AccommodationSegmentForm
                segment={segment}
                onChange={update}
                allowSubAccommodation={allowSubAccommodation}
                onAddSubAccommodation={() => addSubAccommodation(segment.id)}
              />
            ) : null}
          </SegmentShell>
        ))}

        {visibleSegments.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 border border-dashed border-[hsl(var(--sand-300))] bg-white px-6 py-8 text-center">
            <div className="text-sm font-medium text-[hsl(var(--base-black))]">
              No itinerary segments yet
            </div>
            <div className="text-sm text-[hsl(var(--sand-900))]">
              Add transfer, flight, and accommodation blocks to build the trip timeline.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TransferSegmentForm({
  segment,
  onChange,
}: {
  segment: TransferSegment;
  onChange: (segment: TransferSegment) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Transfer Type">
        <select
          className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
          value={segment.label}
          onChange={(event) => onChange({ ...segment, label: event.target.value })}
        >
          <option value="Transfer to Airport">Transfer to Airport</option>
          <option value="Transfer to Accommodation">Transfer to Accommodation</option>
          <option value="Transfer Home">Transfer Home</option>
          <option value="Airport Transfer">Airport Transfer</option>
          <option value="Private Transfer">Private Transfer</option>
        </select>
      </Field>
      <Field label="Custom Label">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.label} onChange={(event) => onChange({ ...segment, label: event.target.value })} />
      </Field>
      <Field label="Company">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.company} onChange={(event) => onChange({ ...segment, company: event.target.value })} />
      </Field>
      <Field label="Pickup Time">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.pickupTime} onChange={(event) => onChange({ ...segment, pickupTime: event.target.value })} />
      </Field>
      <Field label="Payment Status">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.paymentStatus} onChange={(event) => onChange({ ...segment, paymentStatus: event.target.value })} />
      </Field>
      <Field label="Pickup Location">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.pickupLocation} onChange={(event) => onChange({ ...segment, pickupLocation: event.target.value })} />
      </Field>
      <Field label="Dropoff Location">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.dropoffLocation} onChange={(event) => onChange({ ...segment, dropoffLocation: event.target.value })} />
      </Field>
      <Field label="Vehicle Details">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.vehicleDetails} onChange={(event) => onChange({ ...segment, vehicleDetails: event.target.value })} />
      </Field>
      <Field label="Contact Number">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.contactNumber} onChange={(event) => onChange({ ...segment, contactNumber: event.target.value })} />
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.notes} onChange={(event) => onChange({ ...segment, notes: event.target.value })} />
      </Field>
    </div>
  );
}

export function FlightSegmentForm({
  segment,
  onChange,
}: {
  segment: FlightSegment;
  onChange: (segment: FlightSegment) => void;
}) {
  function patch<K extends keyof FlightSegment>(key: K, value: FlightSegment[K]) {
    onChange({ ...segment, [key]: value });
  }

  function patchLeg(id: string, updater: (leg: FlightLeg) => FlightLeg) {
    onChange({
      ...segment,
      legs: segment.legs.map((leg) => (leg.id === id ? updater(leg) : leg)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Flight Number"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.flightNumber} onChange={(event) => patch("flightNumber", event.target.value)} /></Field>
        <Field label="Airline"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.airline} onChange={(event) => patch("airline", event.target.value)} /></Field>
        <Field label="PNR"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.pnr} onChange={(event) => patch("pnr", event.target.value)} /></Field>
        <Field label="Departure Airport"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureAirport} onChange={(event) => patch("departureAirport", event.target.value)} /></Field>
        <Field label="Departure Code"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureCode} onChange={(event) => patch("departureCode", event.target.value.toUpperCase())} /></Field>
        <Field label="Departure Terminal"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureTerminal} onChange={(event) => patch("departureTerminal", event.target.value)} /></Field>
        <Field label="Arrival Airport"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalAirport} onChange={(event) => patch("arrivalAirport", event.target.value)} /></Field>
        <Field label="Arrival Code"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalCode} onChange={(event) => patch("arrivalCode", event.target.value.toUpperCase())} /></Field>
        <Field label="Arrival Terminal"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalTerminal} onChange={(event) => patch("arrivalTerminal", event.target.value)} /></Field>
        <Field label="Departure Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.departureDate} onChange={(event) => patch("departureDate", event.target.value)} /></Field>
        <Field label="Departure Time"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureTime} onChange={(event) => patch("departureTime", event.target.value)} /></Field>
        <Field label="Arrival Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.arrivalDate} onChange={(event) => patch("arrivalDate", event.target.value)} /></Field>
        <Field label="Arrival Time"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalTime} onChange={(event) => patch("arrivalTime", event.target.value)} /></Field>
        <Field label="Connecting Flight">
          <select className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={String(segment.isConnecting)} onChange={(event) => patch("isConnecting", event.target.value === "true")}>
            <option value="false">No</option><option value="true">Yes</option>
          </select>
        </Field>
        <Field label="+1 Day Arrival">
          <select className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={String(segment.arrivalNextDay)} onChange={(event) => patch("arrivalNextDay", event.target.value === "true")}>
            <option value="false">No</option><option value="true">Yes</option>
          </select>
        </Field>
      </div>

      {segment.isConnecting ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[hsl(var(--base-black))]">Flight Legs</div>
            <BookingsButton label="Add Leg" icon={Plus} tone="secondary" onClick={() => onChange({ ...segment, legs: [...segment.legs, emptyFlightLeg()] })} />
          </div>
          {segment.legs.map((leg) => (
            <div key={leg.id} className="border border-[hsl(var(--sand-300))] bg-[#FAFAF8] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[hsl(var(--base-black))]">{leg.flightNumber || "Connecting Leg"}</div>
                <BookingsButton
                  label="Remove Leg"
                  icon={Trash2}
                  tone="danger"
                  onClick={() =>
                    onChange({
                      ...segment,
                      legs: segment.legs.length > 1 ? segment.legs.filter((item) => item.id !== leg.id) : segment.legs,
                    })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Flight Number"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.flightNumber} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, flightNumber: event.target.value }))} /></Field>
                <Field label="Airline"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.airline} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, airline: event.target.value }))} /></Field>
                <Field label="Layover Duration"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.layoverDuration} placeholder="e.g. 2h 30m" onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, layoverDuration: event.target.value }))} /></Field>
                <Field label="Departure Airport"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.departureAirport} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureAirport: event.target.value }))} /></Field>
                <Field label="Departure Code"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.departureCode} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureCode: event.target.value.toUpperCase() }))} /></Field>
                <Field label="Departure Terminal"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.departureTerminal} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTerminal: event.target.value }))} /></Field>
                <Field label="Arrival Airport"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.arrivalAirport} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalAirport: event.target.value }))} /></Field>
                <Field label="Arrival Code"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.arrivalCode} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalCode: event.target.value.toUpperCase() }))} /></Field>
                <Field label="Arrival Terminal"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.arrivalTerminal} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTerminal: event.target.value }))} /></Field>
                <Field label="Departure Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={leg.departureDate} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureDate: event.target.value }))} /></Field>
                <Field label="Departure Time"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.departureTime} placeholder="e.g. 14:30" onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTime: event.target.value }))} /></Field>
                <Field label="Arrival Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={leg.arrivalDate} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalDate: event.target.value }))} /></Field>
                <Field label="Arrival Time"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={leg.arrivalTime} placeholder="e.g. 05:45" onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTime: event.target.value }))} /></Field>
                <Field label="+1 Day Arrival">
                  <select className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={String(leg.arrivalNextDay)} onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalNextDay: event.target.value === "true" }))}>
                    <option value="false">No</option><option value="true">Yes</option>
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Field label="Notes">
        <textarea className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.notes || ""} onChange={(event) => patch("notes", event.target.value)} />
      </Field>
    </div>
  );
}

export function AccommodationSegmentForm({
  segment,
  onChange,
  allowSubAccommodation = false,
  onAddSubAccommodation,
}: {
  segment: AccommodationSegment;
  onChange: (segment: AccommodationSegment) => void;
  allowSubAccommodation?: boolean;
  onAddSubAccommodation?: () => void;
}) {
  const canAddSubAccommodation = allowSubAccommodation && !segment.parentId;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {canAddSubAccommodation ? (
        <div className="md:col-span-2">
          <BookingsButton
            label="Add sub-accommodation"
            icon={Plus}
            tone="secondary"
            onClick={onAddSubAccommodation}
          />
        </div>
      ) : null}
      <Field label="Hotel Name"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.hotelName} onChange={(event) => onChange({ ...segment, hotelName: event.target.value })} /></Field>
      <Field label="Room Type"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.roomType} onChange={(event) => onChange({ ...segment, roomType: event.target.value })} /></Field>
      <Field label="Board Basis"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.boardBasis} onChange={(event) => onChange({ ...segment, boardBasis: event.target.value })} /></Field>
      <Field label="Rooms"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="number" value={segment.numberOfRooms} onChange={(event) => onChange({ ...segment, numberOfRooms: Number(event.target.value) || 1 })} /></Field>
      <Field label="Check-in Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.checkInDate} onChange={(event) => onChange({ ...segment, checkInDate: event.target.value })} /></Field>
      <Field label="Check-out Date"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.checkOutDate} onChange={(event) => onChange({ ...segment, checkOutDate: event.target.value })} /></Field>
      <Field label="Check-out Time"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.checkOutTime} onChange={(event) => onChange({ ...segment, checkOutTime: event.target.value })} /></Field>
      <Field label="Duration"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.duration} onChange={(event) => onChange({ ...segment, duration: event.target.value })} /></Field>
      <Field label="Address" className="md:col-span-2"><input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.address} onChange={(event) => onChange({ ...segment, address: event.target.value })} /></Field>
      <Field label="Hotel Photo" className="md:col-span-2">
        <div className="space-y-3">
          {segment.image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={segment.image} alt="Hotel preview" className="h-32 w-full border border-[hsl(var(--sand-300))] object-cover" />
              <button type="button" onClick={() => onChange({ ...segment, image: "" })} className="absolute right-2 top-2 inline-flex items-center gap-1 border border-[hsl(var(--sand-300))] bg-white px-2 py-1 text-xs text-[hsl(var(--base-black))] transition hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]">
                <Trash2 className="h-3.5 w-3.5" />Remove
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const result = await readFileAsDataUrl(file);
              onChange({ ...segment, image: result });
            }}
          />
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" placeholder="Or paste an image URL" value={segment.image.startsWith("data:") ? "" : segment.image} onChange={(event) => onChange({ ...segment, image: event.target.value })} />
        </div>
      </Field>
      <Field label="Notes" className="md:col-span-2"><textarea className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.notes} onChange={(event) => onChange({ ...segment, notes: event.target.value })} /></Field>
    </div>
  );
}
