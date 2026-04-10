import { pdf } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Hotel,
  Plane,
  Plus,
  Save,
  Send,
  Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { fetchBookings, saveBooking, deleteBooking } from "@/lib/bookings-api";
import {
  createEmptyBooking,
  emptyAccommodationSegment,
  emptyFlightLeg,
  emptyFlightSegment,
  emptyPassenger,
  emptyTransferSegment,
  formatLongDate,
  segmentLabel
} from "@/lib/bookings";
import type {
  AccommodationSegment,
  BookingPassenger,
  BookingRecord,
  BookingSegment,
  BookingStatus,
  FlightLeg,
  FlightSegment,
  TransferSegment
} from "@/lib/types";
import { BookingPDFTemplate } from "@/components/pdf/booking-pdf-template";
import { useToast } from "@/hooks/use-toast";

type ActionState = "idle" | "saving" | "sending";

const buttonToneClasses = {
  primary:
    "border-[hsl(var(--base-black))] bg-[hsl(var(--base-black))] text-white hover:bg-white hover:text-[hsl(var(--base-black))]",
  secondary:
    "border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--base-black))]",
  danger:
    "border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]"
} as const;

const SEGMENT_OPTIONS = [
  { label: "Transfer", value: "transfer", icon: Car },
  { label: "Flight", value: "flight", icon: Plane },
  { label: "Accommodation", value: "accommodation", icon: Hotel }
] as const;

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function BookingsButton({
  label,
  onClick,
  tone = "primary",
  disabled = false,
  icon: Icon,
  fullWidth = false,
  className = ""
}: {
  label: string;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 border px-5 py-2.5 text-sm font-medium transition rounded-none disabled:cursor-not-allowed disabled:opacity-50 ${buttonToneClasses[tone]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function IconActionButton({
  onClick,
  icon: Icon,
  label,
  tone = "secondary",
  disabled = false
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

function SectionCard({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="bookings-section group border border-[hsl(var(--sand-300))] bg-[#FAFAF8]">
      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-[hsl(var(--sand-300))] px-5 py-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--base-black))]">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 text-[hsl(var(--sand-900))] transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-5">{children}</div>
    </details>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-[hsl(var(--sand-900))]">{label}</span>
      {children}
    </label>
  );
}

function getSegmentIcon(type: BookingSegment["type"]): LucideIcon {
  if (type === "flight") return Plane;
  if (type === "accommodation") return Hotel;
  return Car;
}

function SegmentShell({
  segmentType,
  title,
  children,
  onMoveUp,
  onMoveDown,
  onDelete
}: {
  segmentType: BookingSegment["type"];
  title: string;
  children: React.ReactNode;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
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
          <IconActionButton onClick={onMoveUp} icon={ChevronUp} label="Move up" />
          <IconActionButton onClick={onMoveDown} icon={ChevronDown} label="Move down" />
          <IconActionButton onClick={onDelete} icon={Trash2} label="Remove segment" tone="danger" />
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function updateSegmentList(
  booking: BookingRecord,
  updater: (segments: BookingSegment[]) => BookingSegment[]
) {
  return {
    ...booking,
    bookingData: {
      ...booking.bookingData,
      segments: updater(booking.bookingData.segments)
    }
  };
}

export function BookingsTool() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string>("");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [message, setMessage] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    void fetchBookings().then((records) => {
      setBookings(records);
      if (records[0]) {
        setActiveBookingId(records[0].id);
      }
    });
  }, []);

  const activeBooking = useMemo(
    () => bookings.find((item) => item.id === activeBookingId) ?? null,
    [activeBookingId, bookings]
  );

  function setActiveBooking(next: BookingRecord) {
    setBookings((current) => {
      const exists = current.some((item) => item.id === next.id);
      const updated = exists
        ? current.map((item) => (item.id === next.id ? next : item))
        : [next, ...current];

      return updated;
    });
    setActiveBookingId(next.id);
  }

  function patchBooking(updater: (booking: BookingRecord) => BookingRecord) {
    if (!activeBooking) {
      return;
    }

    setActiveBooking(updater(activeBooking));
  }

  async function persistBooking(status?: BookingStatus) {
    if (!activeBooking) {
      return;
    }

    setActionState(status === "sent" ? "sending" : "saving");
    const saved = await saveBooking({ booking: activeBooking, status });
    setActiveBooking(saved);
    setActionState("idle");
    setMessage(status === "sent" ? "Booking marked as sent." : "Booking saved.");
  }

  async function removeActiveBooking() {
    if (!activeBooking || !window.confirm(`Delete ${activeBooking.tripName || "this booking"}?`)) {
      return;
    }

    await deleteBooking(activeBooking.id);
    setBookings((current) => current.filter((item) => item.id !== activeBooking.id));
    setActiveBookingId((current) => (current === activeBooking.id ? "" : current));
    setMessage("Booking deleted.");
  }

  async function downloadActiveBookingPdf() {
    if (!activeBooking || isDownloadingPdf) {
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const blob = await pdf(<BookingPDFTemplate booking={activeBooking} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(activeBooking.tripName || "booking").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Booking PDF downloaded.");
      toast({
        title: "PDF ready",
        description: "Booking PDF downloaded."
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate the booking PDF.";
      setMessage(`Download failed: ${errorMessage}`);
      toast({
        title: "Download failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <div className="bookings-tool grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border border-[hsl(var(--sand-300))] bg-[#FAFAF8] p-5">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-[hsl(var(--base-black))]">Bookings</h2>
            <p className="text-sm text-[hsl(var(--sand-900))]">
              Create branded booking confirmations for clients.
            </p>
          </div>
          <BookingsButton
            label="New Booking"
            icon={Plus}
            fullWidth
            onClick={() => {
              const next = createEmptyBooking();
              setActiveBooking(next);
              setMessage("");
            }}
          />
        </div>

        <div className="mt-5 space-y-3">
          {bookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => setActiveBookingId(booking.id)}
              className={`w-full border px-4 py-4 text-left transition ${
                booking.id === activeBookingId
                  ? "border-[hsl(var(--sand-300))] bg-[hsl(var(--sand-100))]"
                  : "border-[hsl(var(--sand-300))] bg-white hover:border-[hsl(var(--base-black))]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[hsl(var(--base-black))]">{booking.tripName || "Untitled booking"}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--sand-900))]">
                    {[booking.clientFirstName, booking.clientLastName].filter(Boolean).join(" ") || "Client tbc"}
                  </div>
                </div>
                <span
                  className={`border px-2 py-1 text-[11px] uppercase tracking-[0.08em] ${
                    booking.status === "sent"
                      ? "border-[hsl(var(--success))] bg-[hsl(var(--success-light))] text-[hsl(var(--success))]"
                      : "border-[hsl(var(--sand-300))] bg-[hsl(var(--sand-100))] text-[hsl(var(--sand-900))]"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.08em] text-[hsl(var(--sand-400))]">
                {booking.bookingRef || "Ref tbc"} · {formatLongDate(booking.departureDate)}
              </div>
            </button>
          ))}
          {!bookings.length ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border border-dashed border-[hsl(var(--sand-300))] bg-white px-6 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--sand-100))]">
                <FileText className="h-5 w-5 text-[hsl(var(--sand-900))]" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-[hsl(var(--base-black))]">No bookings yet</div>
                <div className="text-sm text-[hsl(var(--sand-900))]">
                  Start a new booking to build your first confirmation PDF.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {activeBooking ? (
        <div className="space-y-6">
          <div className="border border-[hsl(var(--sand-300))] bg-[#FAFAF8] p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-3">
                <h3 className="text-4xl font-semibold leading-none text-[hsl(var(--base-black))]">
                  {activeBooking.tripName || "New Booking"}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[hsl(var(--sand-900))]">
                  <span>{[activeBooking.clientFirstName, activeBooking.clientLastName].filter(Boolean).join(" ") || "Client tbc"}</span>
                  <span className="text-[hsl(var(--sand-400))]">•</span>
                  <span>{activeBooking.bookingRef || "Ref tbc"}</span>
                  <span className="text-[hsl(var(--sand-400))]">•</span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatLongDate(activeBooking.departureDate)}
                  </span>
                </div>
                {message ? <div className="text-sm text-[hsl(var(--sand-900))]">{message}</div> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <BookingsButton
                  label={actionState === "saving" ? "Saving..." : "Save Draft"}
                  icon={Save}
                  tone="secondary"
                  onClick={() => void persistBooking("draft")}
                  disabled={actionState !== "idle"}
                />
                <BookingsButton
                  label={isDownloadingPdf ? "Preparing PDF..." : "Download PDF"}
                  icon={Download}
                  onClick={() => void downloadActiveBookingPdf()}
                  disabled={isDownloadingPdf}
                />
                <BookingsButton
                  label={actionState === "sending" ? "Sending..." : "Mark as Sent"}
                  icon={Send}
                  tone="secondary"
                  onClick={() => void persistBooking("sent")}
                  disabled={actionState !== "idle"}
                />
                <BookingsButton label="Delete" tone="danger" icon={Trash2} onClick={() => void removeActiveBooking()} />
              </div>
            </div>
          </div>

          <SectionCard title="Booking Details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Trip Name">
                <input
                  value={activeBooking.tripName}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, tripName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Booking Ref">
                <input
                  value={activeBooking.bookingRef}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, bookingRef: event.target.value }))
                  }
                />
              </Field>
              <Field label="Issue Date">
                <input
                  type="date"
                  value={activeBooking.issueDate}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, issueDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Departure Date">
                <input
                  type="date"
                  value={activeBooking.departureDate}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, departureDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Client First Name">
                <input
                  value={activeBooking.clientFirstName}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, clientFirstName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Client Last Name">
                <input
                  value={activeBooking.clientLastName}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, clientLastName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Cover Image" className="md:col-span-2">
                <div className="space-y-3">
                  {activeBooking.coverImage ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeBooking.coverImage}
                        alt="Cover preview"
                        className="h-40 w-full border border-[hsl(var(--sand-300))] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => patchBooking((booking) => ({ ...booking, coverImage: "" }))}
                        className="absolute right-2 top-2 inline-flex items-center gap-1 border border-[hsl(var(--sand-300))] bg-white px-2 py-1 text-xs text-[hsl(var(--base-black))] transition hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        return;
                      }

                      const result = await readFileAsDataUrl(file);
                      patchBooking((booking) => ({ ...booking, coverImage: result }));
                    }}
                  />
                  <input
                    placeholder="Or paste an image URL"
                    value={activeBooking.coverImage.startsWith("data:") ? "" : activeBooking.coverImage}
                    onChange={(event) =>
                      patchBooking((booking) => ({ ...booking, coverImage: event.target.value }))
                    }
                  />
                </div>
              </Field>
              <Field label="Welcome Message" className="md:col-span-2">
                <textarea
                  className="min-h-[100px]"
                  value={activeBooking.welcomeMessage}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, welcomeMessage: event.target.value }))
                  }
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Pricing">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Total Cost">
                <input
                  value={activeBooking.bookingData.pricing.totalCost}
                  onChange={(event) =>
                    patchBooking((booking) => ({
                      ...booking,
                      bookingData: {
                        ...booking.bookingData,
                        pricing: {
                          ...booking.bookingData.pricing,
                          totalCost: event.target.value
                        }
                      }
                    }))
                  }
                />
              </Field>
              <Field label="Deposit Paid">
                <input
                  value={activeBooking.bookingData.pricing.depositPaid}
                  onChange={(event) =>
                    patchBooking((booking) => ({
                      ...booking,
                      bookingData: {
                        ...booking.bookingData,
                        pricing: {
                          ...booking.bookingData.pricing,
                          depositPaid: event.target.value
                        }
                      }
                    }))
                  }
                />
              </Field>
              <Field label="Balance Due Date">
                <input
                  type="date"
                  value={activeBooking.bookingData.pricing.balanceDueDate}
                  onChange={(event) =>
                    patchBooking((booking) => ({
                      ...booking,
                      bookingData: {
                        ...booking.bookingData,
                        pricing: {
                          ...booking.bookingData.pricing,
                          balanceDueDate: event.target.value
                        }
                      }
                    }))
                  }
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Passengers">
            <div className="space-y-3">
              {activeBooking.bookingData.passengers.map((passenger, index) => (
                <div key={passenger.id} className="border border-[hsl(var(--sand-300))] bg-white p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={`Passenger ${index + 1}`} className="min-w-[220px] flex-1">
                      <input
                        value={passenger.name}
                        onChange={(event) =>
                          patchBooking((booking) => ({
                            ...booking,
                            bookingData: {
                              ...booking.bookingData,
                              passengers: booking.bookingData.passengers.map((item) =>
                                item.id === passenger.id ? { ...item, name: event.target.value } : item
                              )
                            }
                          }))
                        }
                      />
                    </Field>
                    <Field label="Type" className="w-[150px]">
                      <select
                        value={passenger.type}
                        onChange={(event) =>
                          patchBooking((booking) => ({
                            ...booking,
                            bookingData: {
                              ...booking.bookingData,
                              passengers: booking.bookingData.passengers.map((item) =>
                                item.id === passenger.id
                                  ? {
                                      ...item,
                                      type: event.target.value as BookingPassenger["type"],
                                      age:
                                        event.target.value === "child"
                                          ? item.age ?? 0
                                          : undefined
                                    }
                                  : item
                              )
                            }
                          }))
                        }
                      >
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                      </select>
                    </Field>
                    {passenger.type === "child" ? (
                      <Field label="Age" className="w-[100px]">
                        <input
                          type="number"
                          value={passenger.age ?? ""}
                          onChange={(event) =>
                            patchBooking((booking) => ({
                              ...booking,
                              bookingData: {
                                ...booking.bookingData,
                                passengers: booking.bookingData.passengers.map((item) =>
                                  item.id === passenger.id
                                    ? {
                                        ...item,
                                        age: event.target.value ? Number(event.target.value) : undefined
                                      }
                                    : item
                                )
                              }
                            }))
                          }
                        />
                      </Field>
                    ) : null}
                    <div className="ml-auto flex items-end gap-2">
                      <IconActionButton
                        onClick={() =>
                          patchBooking((booking) => {
                            const next = [...booking.bookingData.passengers];
                            if (index > 0) {
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            }
                            return {
                              ...booking,
                              bookingData: { ...booking.bookingData, passengers: next }
                            };
                          })
                        }
                        icon={ChevronUp}
                        label="Move passenger up"
                        disabled={index === 0}
                      />
                      <IconActionButton
                        onClick={() =>
                          patchBooking((booking) => ({
                            ...booking,
                            bookingData: {
                              ...booking.bookingData,
                              passengers:
                                booking.bookingData.passengers.length > 1
                                  ? booking.bookingData.passengers.filter((item) => item.id !== passenger.id)
                                  : booking.bookingData.passengers
                            }
                          }))
                        }
                        icon={Trash2}
                        label="Remove passenger"
                        tone="danger"
                        disabled={activeBooking.bookingData.passengers.length === 1}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <BookingsButton
                label="Add Passenger"
                icon={Plus}
                tone="secondary"
                className="self-start"
                onClick={() =>
                  patchBooking((booking) => ({
                    ...booking,
                    bookingData: {
                      ...booking.bookingData,
                      passengers: [...booking.bookingData.passengers, emptyPassenger()]
                    }
                  }))
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Itinerary Builder">
            <div className="flex flex-wrap gap-2">
              {SEGMENT_OPTIONS.map((option) => (
                <BookingsButton
                  key={option.value}
                  label={`Add ${option.label}`}
                  icon={option.icon}
                  tone="secondary"
                  onClick={() =>
                    patchBooking((booking) =>
                      updateSegmentList(booking, (segments) => [
                        ...segments,
                        option.value === "transfer"
                          ? emptyTransferSegment()
                          : option.value === "flight"
                            ? emptyFlightSegment()
                            : emptyAccommodationSegment()
                      ])
                    )
                  }
                />
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {activeBooking.bookingData.segments.map((segment, index) => (
                <SegmentShell
                  key={segment.id}
                  segmentType={segment.type}
                  title={segmentLabel(segment)}
                  onMoveUp={() =>
                    patchBooking((booking) =>
                      updateSegmentList(booking, (segments) => {
                        const next = [...segments];
                        if (index > 0) {
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        }
                        return next;
                      })
                    )
                  }
                  onMoveDown={() =>
                    patchBooking((booking) =>
                      updateSegmentList(booking, (segments) => {
                        const next = [...segments];
                        if (index < next.length - 1) {
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        }
                        return next;
                      })
                    )
                  }
                  onDelete={() =>
                    patchBooking((booking) =>
                      updateSegmentList(booking, (segments) =>
                        segments.filter((item) => item.id !== segment.id)
                      )
                    )
                  }
                >
                  {segment.type === "transfer" ? (
                    <TransferSegmentForm
                      segment={segment}
                      onChange={(next) =>
                        patchBooking((booking) =>
                          updateSegmentList(booking, (segments) =>
                            segments.map((item) => (item.id === next.id ? next : item))
                          )
                        )
                      }
                    />
                  ) : null}

                  {segment.type === "flight" ? (
                    <FlightSegmentForm
                      segment={segment}
                      onChange={(next) =>
                        patchBooking((booking) =>
                          updateSegmentList(booking, (segments) =>
                            segments.map((item) => (item.id === next.id ? next : item))
                          )
                        )
                      }
                    />
                  ) : null}

                  {segment.type === "accommodation" ? (
                    <AccommodationSegmentForm
                      segment={segment}
                      onChange={(next) =>
                        patchBooking((booking) =>
                          updateSegmentList(booking, (segments) =>
                            segments.map((item) => (item.id === next.id ? next : item))
                          )
                        )
                      }
                    />
                  ) : null}
                </SegmentShell>
              ))}

              {!activeBooking.bookingData.segments.length ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 border border-dashed border-[hsl(var(--sand-300))] bg-white px-6 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--sand-100))]">
                    <Plane className="h-5 w-5 text-[hsl(var(--sand-900))]" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-[hsl(var(--base-black))]">No itinerary segments yet</div>
                    <div className="text-sm text-[hsl(var(--sand-900))]">
                      Add transfer, flight, and accommodation blocks to build the trip timeline.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Additional Information">
            <Field label="Free text">
              <textarea
                className="min-h-[100px]"
                value={activeBooking.bookingData.additionalInfo}
                onChange={(event) =>
                  patchBooking((booking) => ({
                    ...booking,
                    bookingData: {
                      ...booking.bookingData,
                      additionalInfo: event.target.value
                    }
                  }))
                }
              />
            </Field>
          </SectionCard>
        </div>
      ) : (
        <div className="flex min-h-[420px] items-center justify-center border border-[hsl(var(--sand-300))] bg-[#FAFAF8] p-8 text-center text-[hsl(var(--sand-900))]">
          Select a booking or create a new one to start building the PDF.
        </div>
      )}
    </div>
  );
}

function TransferSegmentForm({
  segment,
  onChange
}: {
  segment: TransferSegment;
  onChange: (segment: TransferSegment) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Transfer Type">
        <select
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
        <input value={segment.label} onChange={(event) => onChange({ ...segment, label: event.target.value })} />
      </Field>
      <Field label="Company">
        <input value={segment.company} onChange={(event) => onChange({ ...segment, company: event.target.value })} />
      </Field>
      <Field label="Pickup Time">
        <input value={segment.pickupTime} onChange={(event) => onChange({ ...segment, pickupTime: event.target.value })} />
      </Field>
      <Field label="Payment Status">
        <input value={segment.paymentStatus} onChange={(event) => onChange({ ...segment, paymentStatus: event.target.value })} />
      </Field>
      <Field label="Pickup Location">
        <input value={segment.pickupLocation} onChange={(event) => onChange({ ...segment, pickupLocation: event.target.value })} />
      </Field>
      <Field label="Dropoff Location">
        <input value={segment.dropoffLocation} onChange={(event) => onChange({ ...segment, dropoffLocation: event.target.value })} />
      </Field>
      <Field label="Vehicle Details">
        <input value={segment.vehicleDetails} onChange={(event) => onChange({ ...segment, vehicleDetails: event.target.value })} />
      </Field>
      <Field label="Contact Number">
        <input value={segment.contactNumber} onChange={(event) => onChange({ ...segment, contactNumber: event.target.value })} />
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea value={segment.notes} onChange={(event) => onChange({ ...segment, notes: event.target.value })} />
      </Field>
    </div>
  );
}

function FlightSegmentForm({
  segment,
  onChange
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
      legs: segment.legs.map((leg) => (leg.id === id ? updater(leg) : leg))
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Flight Number">
          <input value={segment.flightNumber} onChange={(event) => patch("flightNumber", event.target.value)} />
        </Field>
        <Field label="Airline">
          <input value={segment.airline} onChange={(event) => patch("airline", event.target.value)} />
        </Field>
        <Field label="PNR">
          <input value={segment.pnr} onChange={(event) => patch("pnr", event.target.value)} />
        </Field>
        <Field label="Departure Airport">
          <input value={segment.departureAirport} onChange={(event) => patch("departureAirport", event.target.value)} />
        </Field>
        <Field label="Departure Code">
          <input value={segment.departureCode} onChange={(event) => patch("departureCode", event.target.value.toUpperCase())} />
        </Field>
        <Field label="Departure Terminal">
          <input value={segment.departureTerminal} onChange={(event) => patch("departureTerminal", event.target.value)} />
        </Field>
        <Field label="Arrival Airport">
          <input value={segment.arrivalAirport} onChange={(event) => patch("arrivalAirport", event.target.value)} />
        </Field>
        <Field label="Arrival Code">
          <input value={segment.arrivalCode} onChange={(event) => patch("arrivalCode", event.target.value.toUpperCase())} />
        </Field>
        <Field label="Arrival Terminal">
          <input value={segment.arrivalTerminal} onChange={(event) => patch("arrivalTerminal", event.target.value)} />
        </Field>
        <Field label="Departure Date">
          <input type="date" value={segment.departureDate} onChange={(event) => patch("departureDate", event.target.value)} />
        </Field>
        <Field label="Departure Time">
          <input value={segment.departureTime} onChange={(event) => patch("departureTime", event.target.value)} />
        </Field>
        <Field label="Arrival Date">
          <input type="date" value={segment.arrivalDate} onChange={(event) => patch("arrivalDate", event.target.value)} />
        </Field>
        <Field label="Arrival Time">
          <input value={segment.arrivalTime} onChange={(event) => patch("arrivalTime", event.target.value)} />
        </Field>
        <Field label="Connecting Flight">
          <select
            value={String(segment.isConnecting)}
            onChange={(event) => patch("isConnecting", event.target.value === "true")}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
        <Field label="+1 Day Arrival">
          <select
            value={String(segment.arrivalNextDay)}
            onChange={(event) => patch("arrivalNextDay", event.target.value === "true")}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
      </div>

      {segment.isConnecting ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[hsl(var(--base-black))]">
              Flight Legs
            </div>
            <BookingsButton
              label="Add Leg"
              icon={Plus}
              tone="secondary"
              onClick={() => onChange({ ...segment, legs: [...segment.legs, emptyFlightLeg()] })}
            />
          </div>
          {segment.legs.map((leg) => (
            <div key={leg.id} className="border border-[hsl(var(--sand-300))] bg-[#FAFAF8] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[hsl(var(--base-black))]">
                  {leg.flightNumber || "Connecting Leg"}
                </div>
                <BookingsButton
                  label="Remove Leg"
                  icon={Trash2}
                  tone="danger"
                  onClick={() =>
                    onChange({
                      ...segment,
                      legs:
                        segment.legs.length > 1
                          ? segment.legs.filter((item) => item.id !== leg.id)
                          : segment.legs
                    })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Flight Number">
                  <input
                    value={leg.flightNumber}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, flightNumber: event.target.value }))}
                  />
                </Field>
                <Field label="Airline">
                  <input
                    value={leg.airline}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, airline: event.target.value }))}
                  />
                </Field>
                <Field label="Layover Duration">
                  <input
                    value={leg.layoverDuration}
                    placeholder="e.g. 2h 30m"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, layoverDuration: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Airport">
                  <input
                    value={leg.departureAirport}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureAirport: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Code">
                  <input
                    value={leg.departureCode}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureCode: event.target.value.toUpperCase() }))}
                  />
                </Field>
                <Field label="Departure Terminal">
                  <input
                    value={leg.departureTerminal}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTerminal: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Airport">
                  <input
                    value={leg.arrivalAirport}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalAirport: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Code">
                  <input
                    value={leg.arrivalCode}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalCode: event.target.value.toUpperCase() }))}
                  />
                </Field>
                <Field label="Arrival Terminal">
                  <input
                    value={leg.arrivalTerminal}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTerminal: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Date">
                  <input
                    type="date"
                    value={leg.departureDate}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureDate: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Time">
                  <input
                    value={leg.departureTime}
                    placeholder="e.g. 14:30"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTime: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Date">
                  <input
                    type="date"
                    value={leg.arrivalDate}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalDate: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Time">
                  <input
                    value={leg.arrivalTime}
                    placeholder="e.g. 05:45"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTime: event.target.value }))}
                  />
                </Field>
                <Field label="+1 Day Arrival">
                  <select
                    value={String(leg.arrivalNextDay)}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalNextDay: event.target.value === "true" }))}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccommodationSegmentForm({
  segment,
  onChange
}: {
  segment: AccommodationSegment;
  onChange: (segment: AccommodationSegment) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Hotel Name">
        <input value={segment.hotelName} onChange={(event) => onChange({ ...segment, hotelName: event.target.value })} />
      </Field>
      <Field label="Room Type">
        <input value={segment.roomType} onChange={(event) => onChange({ ...segment, roomType: event.target.value })} />
      </Field>
      <Field label="Board Basis">
        <input value={segment.boardBasis} onChange={(event) => onChange({ ...segment, boardBasis: event.target.value })} />
      </Field>
      <Field label="Rooms">
        <input
          type="number"
          value={segment.numberOfRooms}
          onChange={(event) => onChange({ ...segment, numberOfRooms: Number(event.target.value) || 1 })}
        />
      </Field>
      <Field label="Check-in Date">
        <input type="date" value={segment.checkInDate} onChange={(event) => onChange({ ...segment, checkInDate: event.target.value })} />
      </Field>
      <Field label="Check-out Date">
        <input type="date" value={segment.checkOutDate} onChange={(event) => onChange({ ...segment, checkOutDate: event.target.value })} />
      </Field>
      <Field label="Check-out Time">
        <input value={segment.checkOutTime} onChange={(event) => onChange({ ...segment, checkOutTime: event.target.value })} />
      </Field>
      <Field label="Duration">
        <input value={segment.duration} onChange={(event) => onChange({ ...segment, duration: event.target.value })} />
      </Field>
      <Field label="Address" className="md:col-span-2">
        <input value={segment.address} onChange={(event) => onChange({ ...segment, address: event.target.value })} />
      </Field>
      <Field label="Hotel Photo" className="md:col-span-2">
        <div className="space-y-3">
          {segment.image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={segment.image}
                alt="Hotel preview"
                className="h-32 w-full border border-[hsl(var(--sand-300))] object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ ...segment, image: "" })}
                className="absolute right-2 top-2 inline-flex items-center gap-1 border border-[hsl(var(--sand-300))] bg-white px-2 py-1 text-xs text-[hsl(var(--base-black))] transition hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ) : null}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              const result = await readFileAsDataUrl(file);
              onChange({ ...segment, image: result });
            }}
          />
          <input
            placeholder="Or paste an image URL"
            value={segment.image.startsWith("data:") ? "" : segment.image}
            onChange={(event) => onChange({ ...segment, image: event.target.value })}
          />
        </div>
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea value={segment.notes} onChange={(event) => onChange({ ...segment, notes: event.target.value })} />
      </Field>
    </div>
  );
}
