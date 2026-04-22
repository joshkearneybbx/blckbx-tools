import { pdf } from "@react-pdf/renderer";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Download,
  FileInput,
  FileText,
  Hotel,
  Loader2,
  Plane,
  Plus,
  Save,
  Send,
  X,
  Trash2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { fetchBookings, saveBooking, deleteBooking } from "@/lib/bookings-api";
import {
  createBookingFromQuote,
  createEmptyBooking,
  emptyAccommodationSegment,
  emptyFlightLeg,
  emptyFlightSegment,
  emptyPassenger,
  emptyTransferSegment,
  formatLongDate,
  parseStoredQuoteData,
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
import { pb } from "@/lib/pocketbase";

type ActionState = "idle" | "saving" | "sending";

type QuoteImportRecord = {
  id: string;
  tripName?: string;
  quoteReference?: string;
  clientName?: string;
  destination?: string;
  dates?: string;
  status?: "draft" | "sent";
  coverPhoto?: string;
  created: string;
  quoteData?: unknown;
};

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
  className = "",
  title
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

function formatShortDate(value: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getQuotePreviewItems(quote: QuoteImportRecord) {
  const quoteData = parseStoredQuoteData(quote.quoteData);
  const project = quoteData.project && typeof quoteData.project === "object"
    ? (quoteData.project as Record<string, unknown>)
    : {};
  const outboundTravel = quoteData.outboundTravel && typeof quoteData.outboundTravel === "object"
    ? (quoteData.outboundTravel as Record<string, unknown>)
    : {};
  const returnTravel = quoteData.returnTravel && typeof quoteData.returnTravel === "object"
    ? (quoteData.returnTravel as Record<string, unknown>)
    : {};
  const accommodation = quoteData.accommodation && typeof quoteData.accommodation === "object"
    ? (quoteData.accommodation as Record<string, unknown>)
    : {};
  const pricing = quoteData.pricing && typeof quoteData.pricing === "object"
    ? (quoteData.pricing as Record<string, unknown>)
    : {};
  const passengers = Array.isArray(quoteData.passengers) ? quoteData.passengers : [];

  return [
    {
      label: "Client name",
      value: quote.clientName || "Will be split into first and last name"
    },
    {
      label: "Trip name",
      value: String(project.name ?? quote.tripName ?? "—")
    },
    {
      label: "Quote reference",
      value: String(project.quoteReference ?? quote.quoteReference ?? "—")
    },
    {
      label: "Outbound flight",
      value:
        [outboundTravel.flightNumber, outboundTravel.departureAirport, outboundTravel.arrivalAirport]
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(" • ") || "No outbound flight found"
    },
    {
      label: "Return flight",
      value:
        [returnTravel.flightNumber, returnTravel.departureAirport, returnTravel.arrivalAirport]
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(" • ") || "No return flight found"
    },
    {
      label: "Accommodation",
      value:
        [accommodation.name, accommodation.roomType, accommodation.boardBasis]
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(" • ") || "No accommodation found"
    },
    {
      label: "Passengers",
      value: passengers.length ? `${passengers.length} passenger${passengers.length === 1 ? "" : "s"}` : "Will fall back to traveller count"
    },
    {
      label: "Pricing",
      value:
        [pricing.totalCost, pricing.deposit, pricing.balanceDeadline]
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
          .join(" • ") || "No pricing found"
    }
  ];
}

function ImportFromQuoteModal({
  open,
  disabled,
  onClose,
  onImport
}: {
  open: boolean;
  disabled: boolean;
  onClose: () => void;
  onImport: (quote: QuoteImportRecord) => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<QuoteImportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteImportRecord | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedQuote(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void pb
      .collection("blckbx_quotes")
      .getList(1, 50, {
        sort: "-created",
        requestKey: null
      })
      .then((result) => {
        if (!cancelled) {
          setQuotes(result.items as unknown as QuoteImportRecord[]);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        toast({
          title: "Failed to load quotes",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive"
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden border border-[hsl(var(--sand-300))] bg-[#FAFAF8] shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--sand-300))] px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[hsl(var(--base-black))]">Import from Quote</h2>
            <p className="text-sm text-[hsl(var(--sand-900))]">
              Select a saved quote and overwrite this booking with its structured data.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center border border-[hsl(var(--sand-300))] bg-white text-[hsl(var(--base-black))] transition hover:border-[hsl(var(--base-black))]"
            aria-label="Close import modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-y-auto border-b border-[hsl(var(--sand-300))] p-6 lg:border-b-0 lg:border-r">
            {isLoading ? (
              <div className="flex min-h-[280px] items-center justify-center gap-3 text-sm text-[hsl(var(--sand-900))]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading quotes...
              </div>
            ) : quotes.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 border border-dashed border-[hsl(var(--sand-300))] bg-white px-6 py-8 text-center">
                <FileText className="h-5 w-5 text-[hsl(var(--sand-900))]" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[hsl(var(--base-black))]">No saved quotes found</div>
                  <div className="text-sm text-[hsl(var(--sand-900))]">
                    Save a quote first, then import it into a booking.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => setSelectedQuote(quote)}
                    className={`w-full border px-4 py-4 text-left transition ${
                      selectedQuote?.id === quote.id
                        ? "border-[hsl(var(--base-black))] bg-[hsl(var(--sand-100))]"
                        : "border-[hsl(var(--sand-300))] bg-white hover:border-[hsl(var(--base-black))]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[hsl(var(--base-black))]">
                          {quote.tripName || "Untitled quote"}
                        </div>
                        <div className="mt-1 text-sm text-[hsl(var(--sand-900))]">
                          {quote.clientName || "Client tbc"}
                        </div>
                      </div>
                      <span
                        className={`border px-2 py-1 text-[11px] uppercase tracking-[0.08em] ${
                          quote.status === "sent"
                            ? "border-[hsl(var(--success))] bg-[hsl(var(--success-light))] text-[hsl(var(--success))]"
                            : "border-[hsl(var(--sand-300))] bg-[hsl(var(--sand-100))] text-[hsl(var(--sand-900))]"
                        }`}
                      >
                        {quote.status === "sent" ? "Sent" : "Draft"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-[hsl(var(--sand-900))]">
                      <div>
                        {[quote.destination, quote.dates].filter(Boolean).join(" • ") || "Destination and dates unavailable"}
                      </div>
                      <div className="text-xs uppercase tracking-[0.08em] text-[hsl(var(--sand-400))]">
                        {quote.quoteReference || "Ref tbc"} · Created {formatShortDate(quote.created)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto bg-white p-6">
            {selectedQuote ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sand-400))]">
                    Import Preview
                  </div>
                  <div className="text-lg font-semibold text-[hsl(var(--base-black))]">
                    {selectedQuote.tripName || "Untitled quote"}
                  </div>
                  <div className="text-sm text-[hsl(var(--sand-900))]">
                    Existing booking data will be overwritten. Fields not present in the quote will be left empty.
                  </div>
                </div>

                <div className="space-y-3">
                  {getQuotePreviewItems(selectedQuote).map((item) => (
                    <div key={item.label} className="border border-[hsl(var(--sand-300))] bg-[#FAFAF8] px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sand-400))]">
                        {item.label}
                      </div>
                      <div className="mt-1 text-sm text-[hsl(var(--base-black))]">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <BookingsButton label="Cancel" tone="secondary" onClick={onClose} disabled={isImporting} />
                  <BookingsButton
                    label={isImporting ? "Importing..." : "Import"}
                    icon={FileInput}
                    onClick={async () => {
                      setIsImporting(true);
                      try {
                        await onImport(selectedQuote);
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                    disabled={disabled || isImporting}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center border border-dashed border-[hsl(var(--sand-300))] bg-[#FAFAF8] px-6 py-8 text-center text-sm text-[hsl(var(--sand-900))]">
                Select a quote to preview the fields that will be imported.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingsTool() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string>("");
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [message, setMessage] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
      if (exists) {
        return current.map((item) => (item.id === next.id ? next : item));
      }

      const isReplacingActiveDraft =
        activeBooking != null &&
        activeBooking.id !== next.id &&
        activeBooking.persisted === false &&
        next.persisted !== false &&
        current.some((item) => item.id === activeBooking.id);

      if (isReplacingActiveDraft) {
        return current.map((item) => (item.id === activeBooking.id ? next : item));
      }

      return [next, ...current];
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

    if (activeBooking.persisted !== false) {
      await deleteBooking(activeBooking.id);
    }

    setBookings((current) => current.filter((item) => item.id !== activeBooking.id));
    setActiveBookingId((current) => (current === activeBooking.id ? "" : current));
    setMessage("Booking deleted.");
  }

  async function downloadActiveBookingPdf() {
    if (!activeBooking || isDownloadingPdf || activeBooking.persisted === false) {
      return;
    }

    setIsDownloadingPdf(true);

    let bookingForPdf = activeBooking;
    try {
      const saved = await saveBooking({ booking: activeBooking, status: activeBooking.status });
      setActiveBooking(saved);
      bookingForPdf = saved;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save the booking before generating the PDF.";
      setMessage(`Save failed: ${errorMessage}`);
      toast({
        title: "Save failed — PDF not generated",
        description: `${errorMessage} Your changes have not been saved. Please try again.`,
        variant: "destructive"
      });
      setIsDownloadingPdf(false);
      return;
    }

    try {
      const blob = await pdf(<BookingPDFTemplate booking={bookingForPdf} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(bookingForPdf.tripName || "booking").replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Booking saved and PDF downloaded.");
      toast({
        title: "PDF ready",
        description: "Booking saved and PDF downloaded."
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate the booking PDF.";
      setMessage(`Download failed: ${errorMessage}`);
      toast({
        title: "Download failed",
        description: `Booking was saved, but PDF generation failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function importFromQuote(quote: QuoteImportRecord) {
    const coverImageUrl = quote.coverPhoto ? pb.files.getUrl(quote as never, quote.coverPhoto) : "";
    const importedBooking = createBookingFromQuote(quote, {
      coverImageUrl
    });

    setIsImportModalOpen(false);

    setActionState("saving");
    try {
      const saved = await saveBooking({ booking: importedBooking, status: importedBooking.status });
      setActiveBooking(saved);
      setMessage("Quote imported and saved.");
      toast({
        title: "Quote imported",
        description: "Booking fields have been populated and saved as a draft."
      });
    } catch (err) {
      console.error("Auto-save after import failed:", err);
      setActiveBooking(importedBooking);
      setMessage("Quote imported, but auto-save failed. Click Save Draft to retry.");
      toast({
        title: "Quote imported — not yet saved",
        description: "Click Save Draft to retry saving the booking.",
        variant: "destructive"
      });
    } finally {
      setActionState("idle");
    }
  }

  return (
    <>
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
                  label="Import from Quote"
                  icon={FileInput}
                  tone="secondary"
                  onClick={() => setIsImportModalOpen(true)}
                  disabled={actionState !== "idle" || isDownloadingPdf}
                />
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
                  disabled={isDownloadingPdf || activeBooking.persisted === false}
                  title={
                    activeBooking.persisted === false
                      ? "Save the booking before downloading the PDF"
                      : undefined
                  }
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
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                  value={activeBooking.tripName}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, tripName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Booking Ref">
                <input
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                  value={activeBooking.bookingRef}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, bookingRef: event.target.value }))
                  }
                />
              </Field>
              <Field label="Issue Date">
                <input
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                  type="date"
                  value={activeBooking.issueDate}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, issueDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Departure Date">
                <input
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                  type="date"
                  value={activeBooking.departureDate}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, departureDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Client First Name">
                <input
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                  value={activeBooking.clientFirstName}
                  onChange={(event) =>
                    patchBooking((booking) => ({ ...booking, clientFirstName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Client Last Name">
                <input
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                  className="min-h-[100px] w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                  className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                        className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                        className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                          className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                    <Field label="Date of Birth" className="w-[180px]">
                      <input
                        className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                        type="date"
                        value={passenger.dateOfBirth ?? ""}
                        onChange={(event) =>
                          patchBooking((booking) => ({
                            ...booking,
                            bookingData: {
                              ...booking.bookingData,
                              passengers: booking.bookingData.passengers.map((item) =>
                                item.id === passenger.id
                                  ? { ...item, dateOfBirth: event.target.value || undefined }
                                  : item
                              )
                            }
                          }))
                        }
                      />
                    </Field>
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
                className="min-h-[100px] w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
      <ImportFromQuoteModal
        open={isImportModalOpen}
        disabled={actionState !== "idle" || isDownloadingPdf}
        onClose={() => setIsImportModalOpen(false)}
        onImport={importFromQuote}
      />
    </>
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
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.flightNumber} onChange={(event) => patch("flightNumber", event.target.value)} />
        </Field>
        <Field label="Airline">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.airline} onChange={(event) => patch("airline", event.target.value)} />
        </Field>
        <Field label="PNR">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.pnr} onChange={(event) => patch("pnr", event.target.value)} />
        </Field>
        <Field label="Departure Airport">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureAirport} onChange={(event) => patch("departureAirport", event.target.value)} />
        </Field>
        <Field label="Departure Code">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureCode} onChange={(event) => patch("departureCode", event.target.value.toUpperCase())} />
        </Field>
        <Field label="Departure Terminal">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureTerminal} onChange={(event) => patch("departureTerminal", event.target.value)} />
        </Field>
        <Field label="Arrival Airport">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalAirport} onChange={(event) => patch("arrivalAirport", event.target.value)} />
        </Field>
        <Field label="Arrival Code">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalCode} onChange={(event) => patch("arrivalCode", event.target.value.toUpperCase())} />
        </Field>
        <Field label="Arrival Terminal">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalTerminal} onChange={(event) => patch("arrivalTerminal", event.target.value)} />
        </Field>
        <Field label="Departure Date">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.departureDate} onChange={(event) => patch("departureDate", event.target.value)} />
        </Field>
        <Field label="Departure Time">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.departureTime} onChange={(event) => patch("departureTime", event.target.value)} />
        </Field>
        <Field label="Arrival Date">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.arrivalDate} onChange={(event) => patch("arrivalDate", event.target.value)} />
        </Field>
        <Field label="Arrival Time">
          <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.arrivalTime} onChange={(event) => patch("arrivalTime", event.target.value)} />
        </Field>
        <Field label="Connecting Flight">
          <select
            className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
            value={String(segment.isConnecting)}
            onChange={(event) => patch("isConnecting", event.target.value === "true")}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
        <Field label="+1 Day Arrival">
          <select
            className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.flightNumber}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, flightNumber: event.target.value }))}
                  />
                </Field>
                <Field label="Airline">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.airline}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, airline: event.target.value }))}
                  />
                </Field>
                <Field label="Layover Duration">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.layoverDuration}
                    placeholder="e.g. 2h 30m"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, layoverDuration: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Airport">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.departureAirport}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureAirport: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Code">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.departureCode}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureCode: event.target.value.toUpperCase() }))}
                  />
                </Field>
                <Field label="Departure Terminal">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.departureTerminal}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTerminal: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Airport">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.arrivalAirport}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalAirport: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Code">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.arrivalCode}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalCode: event.target.value.toUpperCase() }))}
                  />
                </Field>
                <Field label="Arrival Terminal">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.arrivalTerminal}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTerminal: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Date">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    type="date"
                    value={leg.departureDate}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureDate: event.target.value }))}
                  />
                </Field>
                <Field label="Departure Time">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.departureTime}
                    placeholder="e.g. 14:30"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, departureTime: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Date">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    type="date"
                    value={leg.arrivalDate}
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalDate: event.target.value }))}
                  />
                </Field>
                <Field label="Arrival Time">
                  <input
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
                    value={leg.arrivalTime}
                    placeholder="e.g. 05:45"
                    onChange={(event) => patchLeg(leg.id, (item) => ({ ...item, arrivalTime: event.target.value }))}
                  />
                </Field>
                <Field label="+1 Day Arrival">
                  <select
                    className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
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
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.hotelName} onChange={(event) => onChange({ ...segment, hotelName: event.target.value })} />
      </Field>
      <Field label="Room Type">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.roomType} onChange={(event) => onChange({ ...segment, roomType: event.target.value })} />
      </Field>
      <Field label="Board Basis">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.boardBasis} onChange={(event) => onChange({ ...segment, boardBasis: event.target.value })} />
      </Field>
      <Field label="Rooms">
        <input
          className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
          type="number"
          value={segment.numberOfRooms}
          onChange={(event) => onChange({ ...segment, numberOfRooms: Number(event.target.value) || 1 })}
        />
      </Field>
      <Field label="Check-in Date">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.checkInDate} onChange={(event) => onChange({ ...segment, checkInDate: event.target.value })} />
      </Field>
      <Field label="Check-out Date">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" type="date" value={segment.checkOutDate} onChange={(event) => onChange({ ...segment, checkOutDate: event.target.value })} />
      </Field>
      <Field label="Check-out Time">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.checkOutTime} onChange={(event) => onChange({ ...segment, checkOutTime: event.target.value })} />
      </Field>
      <Field label="Duration">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.duration} onChange={(event) => onChange({ ...segment, duration: event.target.value })} />
      </Field>
      <Field label="Address" className="md:col-span-2">
        <input className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.address} onChange={(event) => onChange({ ...segment, address: event.target.value })} />
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
            className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]"
            placeholder="Or paste an image URL"
            value={segment.image.startsWith("data:") ? "" : segment.image}
            onChange={(event) => onChange({ ...segment, image: event.target.value })}
          />
        </div>
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea className="w-full border border-[hsl(var(--sand-300))] bg-white px-3 py-2 text-sm text-[hsl(var(--base-black))] outline-none focus:border-[hsl(var(--base-black))]" value={segment.notes} onChange={(event) => onChange({ ...segment, notes: event.target.value })} />
      </Field>
    </div>
  );
}
