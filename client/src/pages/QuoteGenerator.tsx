import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { useLocation, useRoute } from "wouter";
import {
  FileOutput,
  Loader2,
  Upload,
  RotateCcw,
  X,
  Plus,
  MapPinned,
  Plane,
  Hotel,
  Wallet,
  Users,
  Camera,
  ArrowLeft,
  Save,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { pb } from "@/lib/pocketbase";
import {
  QuotePDFTemplate,
  type PassengerDetail,
  type QuoteData,
} from "@/components/pdf/QuotePDFTemplate";

type Status = "upload" | "processing" | "result" | "error";

const DEFAULT_QUOTE_WEBHOOK_URL = "https://n8n.blckbx.co.uk/webhook/pts-import";
const EDITABLE_INPUT_CLASS =
  "h-9 border border-[#D4D0CB] bg-[#FAFAF8] px-3 py-1.5 text-right text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:ring-0";
const EDITABLE_TEXTAREA_CLASS =
  "min-h-[120px] w-full resize-none border border-[#D4D0CB] bg-[#FAFAF8] px-3 py-2 text-sm text-[#0A0A0A] outline-none focus:border-[#0A0A0A] focus:ring-0";

function getWebhookUrl(): string {
  return import.meta.env.VITE_QUOTE_GENERATOR_WEBHOOK_URL ?? DEFAULT_QUOTE_WEBHOOK_URL;
}

function isPdf(file: File | null): file is File {
  return Boolean(
    file &&
      (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function normalizeActivities(value: unknown): QuoteData["activities"] {
  if (!Array.isArray(value)) return undefined;

  const activities = value
    .map((activity) => {
      if (!activity || typeof activity !== "object") return null;
      const nextActivity = activity as Record<string, unknown>;
      return {
        name: sanitizeValue(nextActivity.name),
        description: sanitizeValue(nextActivity.description),
        price: sanitizeValue(nextActivity.price),
      };
    })
    .filter((activity): activity is NonNullable<typeof activity> => Boolean(activity));

  return activities.length > 0 ? activities : undefined;
}

function normalizeQuoteData(payload: unknown): QuoteData {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const project =
    source.project && typeof source.project === "object"
      ? (source.project as Record<string, unknown>)
      : {};
  const destination =
    source.destination && typeof source.destination === "object"
      ? (source.destination as Record<string, unknown>)
      : {};
  const travellers =
    source.travellers && typeof source.travellers === "object"
      ? (source.travellers as Record<string, unknown>)
      : {};
  const outboundTravel =
    source.outboundTravel && typeof source.outboundTravel === "object"
      ? (source.outboundTravel as Record<string, unknown>)
      : {};
  const returnTravel =
    source.returnTravel && typeof source.returnTravel === "object"
      ? (source.returnTravel as Record<string, unknown>)
      : {};
  const accommodation =
    source.accommodation && typeof source.accommodation === "object"
      ? (source.accommodation as Record<string, unknown>)
      : {};
  const pricing =
    source.pricing && typeof source.pricing === "object"
      ? (source.pricing as Record<string, unknown>)
      : {};

  return {
    project: {
      name: sanitizeValue(project.name),
      quoteReference: sanitizeValue(project.quoteReference),
    },
    destination: {
      name: sanitizeValue(destination.name),
      dates: sanitizeValue(destination.dates),
      location: sanitizeValue(destination.location),
    },
    travellers: {
      total: sanitizeValue(travellers.total),
      adults: sanitizeValue(travellers.adults),
      children: sanitizeValue(travellers.children),
    },
    outboundTravel: {
      airline: sanitizeValue(outboundTravel.airline),
      flightNumber: sanitizeValue(outboundTravel.flightNumber),
      departureDate:
        sanitizeValue(outboundTravel.departureDate) ||
        sanitizeValue(outboundTravel.flightDate),
      arrivalDate: sanitizeValue(outboundTravel.arrivalDate),
      departureAirport: sanitizeValue(outboundTravel.departureAirport),
      departureAirportCode: sanitizeValue(outboundTravel.departureAirportCode),
      arrivalAirport: sanitizeValue(outboundTravel.arrivalAirport),
      arrivalAirportCode: sanitizeValue(outboundTravel.arrivalAirportCode),
      departureTime: sanitizeValue(outboundTravel.departureTime),
      arrivalTime: sanitizeValue(outboundTravel.arrivalTime),
      class: sanitizeValue(outboundTravel.class),
      baggage: sanitizeValue(outboundTravel.baggage),
    },
    returnTravel: {
      airline: sanitizeValue(returnTravel.airline),
      flightNumber: sanitizeValue(returnTravel.flightNumber),
      departureDate:
        sanitizeValue(returnTravel.departureDate) ||
        sanitizeValue(returnTravel.flightDate),
      arrivalDate: sanitizeValue(returnTravel.arrivalDate),
      departureAirport: sanitizeValue(returnTravel.departureAirport),
      departureAirportCode: sanitizeValue(returnTravel.departureAirportCode),
      arrivalAirport: sanitizeValue(returnTravel.arrivalAirport),
      arrivalAirportCode: sanitizeValue(returnTravel.arrivalAirportCode),
      departureTime: sanitizeValue(returnTravel.departureTime),
      arrivalTime: sanitizeValue(returnTravel.arrivalTime),
      class: sanitizeValue(returnTravel.class),
      baggage: sanitizeValue(returnTravel.baggage),
    },
    accommodation: {
      name: sanitizeValue(accommodation.name),
      checkIn: sanitizeValue(accommodation.checkIn),
      checkOut: sanitizeValue(accommodation.checkOut),
      nights: sanitizeValue(accommodation.nights),
      roomType: sanitizeValue(accommodation.roomType),
      boardBasis: sanitizeValue(accommodation.boardBasis),
      guests: sanitizeValue(accommodation.guests),
    },
    pricing: {
      totalCost: sanitizeValue(pricing.totalCost),
      deposit: sanitizeValue(pricing.deposit),
      depositDeadline: sanitizeValue(pricing.depositDeadline),
      balance: sanitizeValue(pricing.balance),
      balanceDeadline: sanitizeValue(pricing.balanceDeadline),
    },
    description: sanitizeValue(source.description),
    activities: normalizeActivities(source.activities),
    notes: sanitizeValue(source.notes),
  };
}

function normalizeClientName(payload: unknown): string {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const client =
    source.client && typeof source.client === "object"
      ? (source.client as Record<string, unknown>)
      : {};

  return (
    sanitizeValue(source.clientName) ||
    sanitizeValue(source.client_name) ||
    sanitizeValue(client.name) ||
    ""
  );
}

function buildFilename(data: QuoteData): string {
  const projectName = sanitizeValue(data.project.name, "Quote");
  const reference = sanitizeValue(data.project.quoteReference, "Reference");
  const normalized = `${projectName} - Quote ${reference}`
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalized || "Quote"}.pdf`;
}

function convertToJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(image.src);
        reject(new Error("Canvas not supported"));
        return;
      }

      context.drawImage(image, 0, 0);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(image.src);
      resolve(jpegDataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(image.src);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    image.src = URL.createObjectURL(file);
  });
}

function createPassenger(): PassengerDetail {
  return {
    name: "",
    dateOfBirth: "",
    type: "adult",
  };
}

function base64ToFile(base64: string, filename: string): File {
  const parts = base64.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(parts[1] || "");
  let index = binary.length;
  const bytes = new Uint8Array(index);
  while (index--) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], filename, { type: mime });
}

function parseStoredQuoteData(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeStoredPassengers(payload: unknown, total: QuoteData["travellers"]["total"]): PassengerDetail[] {
  const source = parseStoredQuoteData(payload);
  const passengers = Array.isArray(source.passengers) ? source.passengers : [];
  const normalized = passengers
    .map((passenger) => {
      if (!passenger || typeof passenger !== "object") return null;
      const nextPassenger = passenger as Record<string, unknown>;
      return {
        name: sanitizeValue(nextPassenger.name),
        dateOfBirth: sanitizeValue(nextPassenger.dateOfBirth),
        type: sanitizeValue(nextPassenger.type) === "child" ? "child" : "adult",
      } as PassengerDetail;
    })
    .filter((passenger): passenger is PassengerDetail => Boolean(passenger));

  if (normalized.length > 0) return normalized;
  return Array.from({ length: getPassengerCount(total) }, () => createPassenger());
}

async function fileUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status})`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

function getPassengerCount(total: QuoteData["travellers"]["total"]): number {
  const parsed = Number.parseInt(String(total), 10);
  if (Number.isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

function PreviewSection({
  title,
  icon: Icon,
  children,
  accent = false,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "border-[#E9DDC5] bg-[#F5F0E8]" : "border-[#E6E5E0] bg-white"
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#1A1A1A]" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1A1A1A]">
          {title}
        </h2>
      </div>
      <div className="space-y-3 text-sm text-[#4A4946]">{children}</div>
    </div>
  );
}

function EditableRow({
  label,
  value,
  onChange,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#ECEAE5] pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-[#6B6B68]">{label}</span>
      <Input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${EDITABLE_INPUT_CLASS} max-w-[250px]`}
      />
    </div>
  );
}

interface QuoteGeneratorProps {
  embeddedQuoteId?: string;
  onBack?: () => void;
}

export default function QuoteGenerator({ embeddedQuoteId, onBack }: QuoteGeneratorProps) {
  const [, setLocation] = useLocation();
  const [routeMatch, routeParams] = useRoute("/travel/quote-generator/:id");
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<Status>("upload");
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [clientName, setClientName] = useState("");
  const [passengers, setPassengers] = useState<PassengerDetail[]>([createPassenger()]);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [tripPhotos, setTripPhotos] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [quoteRecordStatus, setQuoteRecordStatus] = useState<"draft" | "sent">("draft");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const tripPhotosInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const quoteId = embeddedQuoteId || (routeMatch ? routeParams?.id : undefined);

  const hasOptionalSections = useMemo(() => {
    if (!quoteData) return false;
    return Boolean(
      (quoteData.activities && quoteData.activities.length > 0) ||
        (quoteData.notes && quoteData.notes.trim())
    );
  }, [quoteData]);

  const syncTravellersFromPassengers = (
    nextPassengers: PassengerDetail[],
    currentQuoteData: QuoteData | null
  ): QuoteData | null => {
    if (!currentQuoteData) return currentQuoteData;

    const adults = nextPassengers.filter((passenger) => passenger.type === "adult").length;
    const children = nextPassengers.filter((passenger) => passenger.type === "child").length;

    return {
      ...currentQuoteData,
      travellers: {
        ...currentQuoteData.travellers,
        total: String(nextPassengers.length),
        adults: String(adults),
        children: String(children),
      },
    };
  };

  const resetState = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFile(null);
    setStatus("upload");
    setError(null);
    setQuoteData(null);
    setClientName("");
    setPassengers([createPassenger()]);
    setCoverPhoto(null);
    setTripPhotos([]);
    setSavedRecordId(null);
    setQuoteRecordStatus("draft");
    if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = "";
    if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
    setIsDragging(false);
  };

  const handleUploadAnother = () => {
    resetState();
    if (onBack) {
      onBack();
    } else if (quoteId) {
      setLocation("/travel/quote-generator");
    }
  };

  const buildStoredPayload = (currentQuoteData: QuoteData) => ({
    ...currentQuoteData,
    clientName: clientName.trim(),
    passengers,
  });

  const persistQuote = async ({
    silent = false,
    nextStatus,
  }: {
    silent?: boolean;
    nextStatus?: "draft" | "sent";
  } = {}): Promise<boolean> => {
    if (!quoteData || !user?.id) return false;

    setIsSaving(true);
    const statusToSave = nextStatus || quoteRecordStatus;

    try {
      const formData = new FormData();
      formData.append("user", user.id);
      formData.append("tripName", quoteData.project.name || "Untitled Quote");
      formData.append("quoteReference", quoteData.project.quoteReference || "");
      formData.append("clientName", clientName.trim());
      formData.append("destination", quoteData.destination.name || "");
      formData.append("dates", quoteData.destination.dates || "");
      formData.append("status", statusToSave);
      formData.append("quoteData", JSON.stringify(buildStoredPayload(quoteData)));

      if (coverPhoto) {
        formData.append("coverPhoto", base64ToFile(coverPhoto, "cover-photo.jpg"));
      }

      if (tripPhotos.length > 0) {
        tripPhotos.forEach((photo, index) => {
          formData.append("tripPhotos", base64ToFile(photo, `trip-photo-${index + 1}.jpg`));
        });
      }

      if (savedRecordId) {
        await pb.collection("blckbx_quotes").update(savedRecordId, formData);
      } else {
        const record = await pb.collection("blckbx_quotes").create(formData);
        setSavedRecordId(record.id);
      }

      setQuoteRecordStatus(statusToSave);
      if (!silent) {
        toast({
          title: "Quote saved",
          description: statusToSave === "sent" ? "Quote marked as sent." : "Draft saved to Quotes.",
        });
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save quote.";
      if (!silent) {
        toast({
          title: "Save failed",
          description: message,
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!quoteId || quoteId === "new") {
      setIsLoadingQuote(false);
      return;
    }

    let cancelled = false;
    const loadQuote = async () => {
      setIsLoadingQuote(true);
      setStatus("processing");
      setError(null);

      try {
        const record = await pb.collection("blckbx_quotes").getOne(quoteId);
        if (cancelled) return;

        const storedPayload = parseStoredQuoteData(record.quoteData);
        const normalized = normalizeQuoteData(storedPayload);
        const normalizedPassengers = normalizeStoredPassengers(storedPayload, normalized.travellers.total);
        const resolvedQuoteData = syncTravellersFromPassengers(normalizedPassengers, normalized) || normalized;

        let nextCoverPhoto: string | null = null;
        if (record.coverPhoto) {
          nextCoverPhoto = await fileUrlToDataUrl(pb.files.getUrl(record, record.coverPhoto));
        }

        let nextTripPhotos: string[] = [];
        if (Array.isArray(record.tripPhotos) && record.tripPhotos.length > 0) {
          nextTripPhotos = await Promise.all(
            record.tripPhotos.map((filename: string) =>
              fileUrlToDataUrl(pb.files.getUrl(record, filename))
            )
          );
        }

        if (cancelled) return;

        setSelectedFile(null);
        setQuoteData(resolvedQuoteData);
        setClientName(
          sanitizeValue(record.clientName) ||
            normalizeClientName(storedPayload)
        );
        setPassengers(normalizedPassengers);
        setCoverPhoto(nextCoverPhoto);
        setTripPhotos(nextTripPhotos);
        setSavedRecordId(record.id);
        setQuoteRecordStatus(record.status === "sent" ? "sent" : "draft");
        setStatus("result");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load quote.";
        setError(message);
        setStatus("error");
        toast({
          title: "Quote load failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsLoadingQuote(false);
        }
      }
    };

    loadQuote();
    return () => {
      cancelled = true;
    };
  }, [quoteId, toast]);

  const handleFilePicked = (file: File | null) => {
    if (!file) return;
    if (!isPdf(file)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError("Only PDF files are supported.");
      setStatus("error");
      toast({
        title: "Unsupported file",
        description: "Please choose a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setStatus("upload");
    setError(null);
    setQuoteData(null);
    setClientName("");
    setPassengers([createPassenger()]);
    setCoverPhoto(null);
    setTripPhotos([]);
    setSavedRecordId(null);
    setQuoteRecordStatus("draft");
    if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = "";
    if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setStatus("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("data", selectedFile);

      const response = await fetch(getWebhookUrl(), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to process PDF (${response.status})`);
      }

      const data = await response.json();
      const payload = Array.isArray(data) ? data[0] : data;
      const normalized = normalizeQuoteData(payload);
      const extractedClientName = normalizeClientName(payload);
      const initialPassengers = Array.from(
        { length: getPassengerCount(normalized.travellers.total) },
        () => createPassenger()
      );

      setQuoteData(syncTravellersFromPassengers(initialPassengers, normalized));
      setClientName(extractedClientName);
      setPassengers(initialPassengers);
      setCoverPhoto(null);
      setTripPhotos([]);
      setSavedRecordId(null);
      setQuoteRecordStatus("draft");
      if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = "";
      if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
      setStatus("result");
      toast({
        title: "Quote data extracted",
        description: "Your BLCK BX quote is ready to review and download.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process the uploaded PDF.";
      setError(message);
      setQuoteData(null);
      setClientName("");
      setPassengers([createPassenger()]);
      setCoverPhoto(null);
      setTripPhotos([]);
      setSavedRecordId(null);
      setQuoteRecordStatus("draft");
      if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = "";
      if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
      setStatus("error");
      toast({
        title: "Quote extraction failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!quoteData) return;

    setIsDownloading(true);
    try {
      await persistQuote({ silent: true });
      const blob = await pdf(
        <QuotePDFTemplate
          data={quoteData}
          passengers={passengers}
          coverPhotoUrl={coverPhoto || undefined}
          tripPhotos={tripPhotos}
          clientName={clientName.trim()}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildFilename(quoteData);
      anchor.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Quote PDF downloaded",
        description: "The BLCK BX quote PDF has been generated successfully.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate the quote PDF.";
      setError(message);
      setStatus("error");
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveDraft = async () => {
    await persistQuote({ silent: false, nextStatus: quoteRecordStatus || "draft" });
  };

  const handleStatusToggle = async () => {
    const nextStatus = quoteRecordStatus === "draft" ? "sent" : "draft";
    setQuoteRecordStatus(nextStatus);
    const saved = await persistQuote({ silent: false, nextStatus });
    if (!saved) {
      setQuoteRecordStatus((current) => (current === "draft" ? "sent" : "draft"));
    }
  };

  const updateQuoteData = (updater: (current: QuoteData) => QuoteData) => {
    setQuoteData((current) => (current ? updater(current) : current));
  };

  const updateProjectField = (field: keyof QuoteData["project"], value: string) => {
    updateQuoteData((current) => ({
      ...current,
      project: { ...current.project, [field]: value },
    }));
  };

  const updateDestinationField = (field: keyof QuoteData["destination"], value: string) => {
    updateQuoteData((current) => ({
      ...current,
      destination: { ...current.destination, [field]: value },
    }));
  };

  const updateTravelField = (
    section: "outboundTravel" | "returnTravel",
    field: keyof QuoteData["outboundTravel"],
    value: string
  ) => {
    updateQuoteData((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const updateAccommodationField = (
    field: keyof QuoteData["accommodation"],
    value: string
  ) => {
    updateQuoteData((current) => ({
      ...current,
      accommodation: { ...current.accommodation, [field]: value },
    }));
  };

  const updatePricingField = (field: keyof QuoteData["pricing"], value: string) => {
    updateQuoteData((current) => ({
      ...current,
      pricing: { ...current.pricing, [field]: value },
    }));
  };

  const updatePassengerCount = (value: string) => {
    updateQuoteData((current) => ({
      ...current,
      travellers: { ...current.travellers, total: value },
    }));

    const parsed = Number.parseInt(value, 10);
    const nextCount = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setPassengers((currentPassengers) => {
      const nextPassengers =
        nextCount > currentPassengers.length
          ? [
              ...currentPassengers,
              ...Array.from({ length: nextCount - currentPassengers.length }, () => createPassenger()),
            ]
          : currentPassengers.slice(0, nextCount);

      setQuoteData((current) => syncTravellersFromPassengers(nextPassengers, current));
      return nextPassengers;
    });
  };

  const updatePassenger = (
    index: number,
    field: keyof PassengerDetail,
    value: PassengerDetail[keyof PassengerDetail]
  ) => {
    setPassengers((currentPassengers) => {
      const nextPassengers = currentPassengers.map((passenger, passengerIndex) =>
        passengerIndex === index ? { ...passenger, [field]: value } : passenger
      );
      setQuoteData((current) => syncTravellersFromPassengers(nextPassengers, current));
      return nextPassengers;
    });
  };

  const addPassenger = () => {
    setPassengers((currentPassengers) => {
      const nextPassengers = [...currentPassengers, createPassenger()];
      setQuoteData((current) => syncTravellersFromPassengers(nextPassengers, current));
      return nextPassengers;
    });
  };

  const removePassenger = (index: number) => {
    setPassengers((currentPassengers) => {
      if (currentPassengers.length === 1) return currentPassengers;
      const nextPassengers = currentPassengers.filter((_, passengerIndex) => passengerIndex !== index);
      setQuoteData((current) => syncTravellersFromPassengers(nextPassengers, current));
      return nextPassengers;
    });
  };

  const handleCoverPhotoUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const jpegDataUrl = await convertToJpeg(file);
      setCoverPhoto(jpegDataUrl || null);
    } catch (error) {
      toast({
        title: "Cover photo failed",
        description: error instanceof Error ? error.message : "Failed to load cover photo.",
        variant: "destructive",
      });
    }
  };

  const handleTripPhotoUpload = async (files: FileList | null) => {
    if (!files || tripPhotos.length >= 6) {
      if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
      return;
    }

    const remaining = 6 - tripPhotos.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    try {
      const encodedPhotos = await Promise.all(
        filesToProcess.map((file) => convertToJpeg(file))
      );
      setTripPhotos((currentPhotos) => [...currentPhotos, ...encodedPhotos.filter(Boolean)]);
    } catch (error) {
      toast({
        title: "Trip photos failed",
        description: error instanceof Error ? error.message : "Failed to load one or more trip photos.",
        variant: "destructive",
      });
    }
    if (tripPhotosInputRef.current) tripPhotosInputRef.current.value = "";
  };

  const removeTripPhoto = (index: number) => {
    setTripPhotos((currentPhotos) => currentPhotos.filter((_, photoIndex) => photoIndex !== index));
  };

  const updateActivityField = (
    index: number,
    field: "name" | "description" | "price",
    value: string
  ) => {
    updateQuoteData((current) => {
      const activities = [...(current.activities || [])];
      activities[index] = {
        name: activities[index]?.name || "",
        description: activities[index]?.description || "",
        price: activities[index]?.price || "",
        [field]: value,
      };
      return { ...current, activities };
    });
  };

  const addActivity = () => {
    updateQuoteData((current) => ({
      ...current,
      activities: [...(current.activities || []), { name: "", description: "", price: "" }],
    }));
  };

  const removeActivity = (index: number) => {
    updateQuoteData((current) => ({
      ...current,
      activities: (current.activities || []).filter((_, activityIndex) => activityIndex !== index),
    }));
  };

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-[#E8E4DE] px-4 py-10 md:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <Button
              type="button"
              variant="ghost"
              className="px-0 text-[#6B6B68] hover:bg-transparent hover:text-[#1A1A1A]"
              onClick={() => onBack ? onBack() : setLocation("/travel/quotes")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quotes
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6B6B68]">
              Travel
            </p>
            <h1 className="text-3xl font-semibold text-[#1A1A1A]">Quote Generator</h1>
            <p className="max-w-2xl text-sm text-[#6B6B68]">
              {isLoadingQuote
                ? "Loading your saved quote..."
                : "Upload a PTS quote PDF to generate a professionally branded BLCK BX document for download."}
            </p>
          </div>

          <Card className="border-[#E6E5E0] bg-white">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A]">
                {isLoadingQuote ? "Loading Quote" : "Upload PTS Quote"}
              </CardTitle>
              <CardDescription>
                {isLoadingQuote
                  ? "Fetching your saved quote data and images from PocketBase."
                  : "Drag in a PDF or browse your files, then extract the quote data and generate a branded PDF."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoadingQuote && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (status !== "processing") fileInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && status !== "processing") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (status !== "processing") setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    if (status === "processing") return;
                    handleFilePicked(event.dataTransfer.files?.[0] || null);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                    status === "processing"
                      ? "cursor-not-allowed border-[#E6E5E0] bg-[#F6F4EF] opacity-70"
                      : isDragging
                        ? "cursor-pointer border-[#F5C518] bg-[#FBF4DA]"
                        : "cursor-pointer border-[#E6E5E0] bg-[#FAF9F8] hover:bg-[#F6F4EF]"
                  }`}
                  data-testid="quote-generator-dropzone"
                >
                  <Upload className="mx-auto mb-3 h-8 w-8 text-[#6B6B68]" />
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    Drag &amp; drop your PTS PDF here
                  </p>
                  <p className="mt-1 text-xs text-[#6B6B68]">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(event) => handleFilePicked(event.target.files?.[0] || null)}
                  />
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E6E5E0] bg-[#FAF9F8] px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#1A1A1A]">{selectedFile.name}</p>
                    <p className="text-xs text-[#6B6B68]">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-[#6B6B68] hover:bg-[#ECE8DF] hover:text-[#1A1A1A]"
                    onClick={handleUploadAnother}
                    disabled={status === "processing"}
                    data-testid="button-remove-selected-quote-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {status === "processing" && (
                <div className="rounded-2xl border border-[#E6E5E0] bg-[#FAF9F8] p-5">
                  <div className="flex items-center gap-3 text-sm text-[#4A4946]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div className="space-y-1">
                      <p className="font-medium text-[#1A1A1A]">
                        {isLoadingQuote ? "Loading quote..." : "Extracting quote data..."}
                      </p>
                      <p className="text-xs text-[#6B6B68]">
                        {isLoadingQuote
                          ? "Fetching saved content and restoring your edit state..."
                          : "Generating your quote preview..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && status === "error" && (
                <Alert variant="destructive">
                  <AlertTitle>Quote generation failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isLoadingQuote && (
                <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || status === "processing"}
                  className="border border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] hover:bg-[#FAFAF8] hover:text-[#0A0A0A]"
                  data-testid="button-upload-generate-quote"
                >
                  {status === "processing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Quote...
                    </>
                  ) : (
                    "Upload & Generate"
                  )}
                </Button>

                {status === "error" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                    onClick={handleUploadAnother}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Upload Another
                  </Button>
                )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8E4DE] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="px-0 text-[#6B6B68] hover:bg-transparent hover:text-[#1A1A1A]"
            onClick={() => onBack ? onBack() : setLocation("/travel/quotes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6B6B68]">
            Travel
          </p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A]">Quote Generator</h1>
          <p className="max-w-2xl text-sm text-[#6B6B68]">
            Review and edit the extracted quote details before generating the BLCK BX PDF.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-[#E6E5E0] bg-white">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-[#1A1A1A]">Quote Summary</CardTitle>
                <CardDescription>
                  Every field below is editable. The PDF uses the current values shown here.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  disabled={isSaving}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    quoteRecordStatus === "sent"
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  {quoteRecordStatus === "sent" ? "Sent" : "Draft"}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                  onClick={resetState}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Upload Another
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-[#6B6B68]">
                Quote reference:{" "}
                <span className="font-medium text-[#1A1A1A]">
                  {quoteData.project.quoteReference || "Not set"}
                </span>
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PreviewSection title="Trip" icon={MapPinned}>
              <EditableRow
                label="Trip Name"
                value={quoteData.project.name}
                onChange={(value) => updateProjectField("name", value)}
              />
              <EditableRow
                label="Client Name"
                value={clientName}
                onChange={setClientName}
              />
              <EditableRow
                label="Quote Ref"
                value={quoteData.project.quoteReference}
                onChange={(value) => updateProjectField("quoteReference", value)}
              />
              <EditableRow
                label="Destination"
                value={quoteData.destination.name}
                onChange={(value) => updateDestinationField("name", value)}
              />
              <EditableRow
                label="Dates"
                value={quoteData.destination.dates}
                onChange={(value) => updateDestinationField("dates", value)}
              />
              <EditableRow
                label="Passengers"
                value={String(quoteData.travellers.total)}
                onChange={updatePassengerCount}
                type="number"
                min={0}
              />
            </PreviewSection>

            <PreviewSection title="Pricing" icon={Wallet} accent>
              <EditableRow
                label="Total Cost"
                value={quoteData.pricing.totalCost}
                onChange={(value) => updatePricingField("totalCost", value)}
              />
              <EditableRow
                label="Deposit"
                value={quoteData.pricing.deposit}
                onChange={(value) => updatePricingField("deposit", value)}
              />
              <EditableRow
                label="Deposit Deadline"
                value={quoteData.pricing.depositDeadline}
                onChange={(value) => updatePricingField("depositDeadline", value)}
              />
              <EditableRow
                label="Balance"
                value={quoteData.pricing.balance}
                onChange={(value) => updatePricingField("balance", value)}
              />
              <EditableRow
                label="Balance Deadline"
                value={quoteData.pricing.balanceDeadline}
                onChange={(value) => updatePricingField("balanceDeadline", value)}
              />
            </PreviewSection>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PreviewSection title="Outbound Flight" icon={Plane}>
              <EditableRow
                label="Airline"
                value={quoteData.outboundTravel.airline}
                onChange={(value) => updateTravelField("outboundTravel", "airline", value)}
              />
              <EditableRow
                label="Flight Number"
                value={quoteData.outboundTravel.flightNumber}
                onChange={(value) => updateTravelField("outboundTravel", "flightNumber", value)}
              />
              <EditableRow
                label="Departure Airport"
                value={quoteData.outboundTravel.departureAirport}
                onChange={(value) =>
                  updateTravelField("outboundTravel", "departureAirport", value)
                }
              />
              <EditableRow
                label="Departure Code"
                value={quoteData.outboundTravel.departureAirportCode || ""}
                onChange={(value) =>
                  updateTravelField("outboundTravel", "departureAirportCode", value.toUpperCase())
                }
              />
              <EditableRow
                label="Arrival Airport"
                value={quoteData.outboundTravel.arrivalAirport}
                onChange={(value) =>
                  updateTravelField("outboundTravel", "arrivalAirport", value)
                }
              />
              <EditableRow
                label="Arrival Code"
                value={quoteData.outboundTravel.arrivalAirportCode || ""}
                onChange={(value) =>
                  updateTravelField("outboundTravel", "arrivalAirportCode", value.toUpperCase())
                }
              />
              <EditableRow
                label="Departure Time"
                value={quoteData.outboundTravel.departureTime}
                onChange={(value) => updateTravelField("outboundTravel", "departureTime", value)}
              />
              <EditableRow
                label="Arrival Time"
                value={quoteData.outboundTravel.arrivalTime}
                onChange={(value) => updateTravelField("outboundTravel", "arrivalTime", value)}
              />
              <EditableRow
                label="Departure Date"
                value={quoteData.outboundTravel.departureDate}
                onChange={(value) => updateTravelField("outboundTravel", "departureDate", value)}
              />
              <EditableRow
                label="Arrival Date"
                value={quoteData.outboundTravel.arrivalDate}
                onChange={(value) => updateTravelField("outboundTravel", "arrivalDate", value)}
              />
              <EditableRow
                label="Class"
                value={quoteData.outboundTravel.class}
                onChange={(value) => updateTravelField("outboundTravel", "class", value)}
              />
              <EditableRow
                label="Baggage"
                value={quoteData.outboundTravel.baggage}
                onChange={(value) => updateTravelField("outboundTravel", "baggage", value)}
              />
            </PreviewSection>

            <PreviewSection title="Return Flight" icon={Plane}>
              <EditableRow
                label="Airline"
                value={quoteData.returnTravel.airline}
                onChange={(value) => updateTravelField("returnTravel", "airline", value)}
              />
              <EditableRow
                label="Flight Number"
                value={quoteData.returnTravel.flightNumber}
                onChange={(value) => updateTravelField("returnTravel", "flightNumber", value)}
              />
              <EditableRow
                label="Departure Airport"
                value={quoteData.returnTravel.departureAirport}
                onChange={(value) =>
                  updateTravelField("returnTravel", "departureAirport", value)
                }
              />
              <EditableRow
                label="Departure Code"
                value={quoteData.returnTravel.departureAirportCode || ""}
                onChange={(value) =>
                  updateTravelField("returnTravel", "departureAirportCode", value.toUpperCase())
                }
              />
              <EditableRow
                label="Arrival Airport"
                value={quoteData.returnTravel.arrivalAirport}
                onChange={(value) => updateTravelField("returnTravel", "arrivalAirport", value)}
              />
              <EditableRow
                label="Arrival Code"
                value={quoteData.returnTravel.arrivalAirportCode || ""}
                onChange={(value) =>
                  updateTravelField("returnTravel", "arrivalAirportCode", value.toUpperCase())
                }
              />
              <EditableRow
                label="Departure Time"
                value={quoteData.returnTravel.departureTime}
                onChange={(value) => updateTravelField("returnTravel", "departureTime", value)}
              />
              <EditableRow
                label="Arrival Time"
                value={quoteData.returnTravel.arrivalTime}
                onChange={(value) => updateTravelField("returnTravel", "arrivalTime", value)}
              />
              <EditableRow
                label="Departure Date"
                value={quoteData.returnTravel.departureDate}
                onChange={(value) => updateTravelField("returnTravel", "departureDate", value)}
              />
              <EditableRow
                label="Arrival Date"
                value={quoteData.returnTravel.arrivalDate}
                onChange={(value) => updateTravelField("returnTravel", "arrivalDate", value)}
              />
              <EditableRow
                label="Class"
                value={quoteData.returnTravel.class}
                onChange={(value) => updateTravelField("returnTravel", "class", value)}
              />
              <EditableRow
                label="Baggage"
                value={quoteData.returnTravel.baggage}
                onChange={(value) => updateTravelField("returnTravel", "baggage", value)}
              />
            </PreviewSection>
          </div>

          <PreviewSection title="Accommodation" icon={Hotel}>
            <EditableRow
              label="Property Name"
              value={quoteData.accommodation.name}
              onChange={(value) => updateAccommodationField("name", value)}
            />
            <EditableRow
              label="Check In"
              value={quoteData.accommodation.checkIn}
              onChange={(value) => updateAccommodationField("checkIn", value)}
            />
            <EditableRow
              label="Check Out"
              value={quoteData.accommodation.checkOut}
              onChange={(value) => updateAccommodationField("checkOut", value)}
            />
            <EditableRow
              label="Nights"
              value={String(quoteData.accommodation.nights)}
              onChange={(value) => updateAccommodationField("nights", value)}
              type="number"
              min={0}
            />
            <EditableRow
              label="Room Type"
              value={quoteData.accommodation.roomType}
              onChange={(value) => updateAccommodationField("roomType", value)}
            />
            <EditableRow
              label="Board Basis"
              value={quoteData.accommodation.boardBasis}
              onChange={(value) => updateAccommodationField("boardBasis", value)}
            />
            <EditableRow
              label="Guests"
              value={String(quoteData.accommodation.guests)}
              onChange={(value) => updateAccommodationField("guests", value)}
              type="number"
              min={0}
            />
          </PreviewSection>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PreviewSection title="Description" icon={FileOutput}>
              <textarea
                rows={5}
                value={quoteData.description || ""}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  updateQuoteData((current) => ({ ...current, description: event.target.value }))
                }
                className={EDITABLE_TEXTAREA_CLASS}
              />
            </PreviewSection>

            <PreviewSection title="Passengers" icon={Users}>
              <div className="space-y-4">
                {passengers.map((passenger, index) => (
                  <div
                    key={`passenger-${index}`}
                    className="rounded-2xl border border-[#ECEAE5] bg-[#FAFAFA] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[#1A1A1A]">Passenger {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={passengers.length === 1}
                        className="h-8 w-8 rounded-full text-[#6B6B68] hover:bg-[#ECE8DF] hover:text-[#1A1A1A]"
                        onClick={() => removePassenger(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Input
                        value={passenger.name}
                        onChange={(event) => updatePassenger(index, "name", event.target.value)}
                        placeholder={`Passenger ${index + 1}`}
                        className={EDITABLE_INPUT_CLASS.replace("text-right", "text-left")}
                      />
                      <Input
                        value={passenger.dateOfBirth}
                        onChange={(event) =>
                          updatePassenger(index, "dateOfBirth", event.target.value)
                        }
                        placeholder="DD/MM/YYYY"
                        className={EDITABLE_INPUT_CLASS.replace("text-right", "text-left")}
                      />
                      <Select
                        value={passenger.type}
                        onValueChange={(value: "adult" | "child") =>
                          updatePassenger(index, "type", value)
                        }
                      >
                        <SelectTrigger className={`${EDITABLE_INPUT_CLASS} text-left`}>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adult">Adult</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                  onClick={addPassenger}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Passenger
                </Button>
              </div>
            </PreviewSection>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PreviewSection title="Cover Photo" icon={Camera}>
              <div className="space-y-3">
                <input
                  ref={coverPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleCoverPhotoUpload(event.target.files?.[0] || null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                  onClick={() => coverPhotoInputRef.current?.click()}
                >
                  {coverPhoto ? "Replace Cover Photo" : "Choose Cover Photo"}
                </Button>
                {coverPhoto ? (
                  <img
                    src={coverPhoto}
                    alt="Cover preview"
                    className="h-40 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-[#D8D2C8] bg-[#FAFAFA] text-sm text-[#6B6B68]">
                    Upload a cover photo to preview it here.
                  </div>
                )}
                {coverPhoto ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-0 text-[#6B6B68] hover:bg-transparent hover:text-[#1A1A1A]"
                    onClick={() => {
                      setCoverPhoto(null);
                      if (coverPhotoInputRef.current) coverPhotoInputRef.current.value = "";
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove Cover Photo
                  </Button>
                ) : null}
              </div>
            </PreviewSection>

            <PreviewSection title="Trip Photos" icon={Camera}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-[#6B6B68]">Trip Photos (max 6)</p>
                  {tripPhotos.length < 6 ? (
                    <>
                      <input
                        ref={tripPhotosInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => handleTripPhotoUpload(event.target.files)}
                      />
                      <Button
                        type="button"
                        onClick={() => tripPhotosInputRef.current?.click()}
                        className="bg-[#1A1A1A] text-white hover:bg-[#111111]"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Photos
                      </Button>
                    </>
                  ) : null}
                </div>
                <p className="text-xs text-[#6B6B68]">{tripPhotos.length} / 6 photos added</p>
                {tripPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {tripPhotos.map((photoUrl, index) => (
                      <div
                        key={`${photoUrl}-${index}`}
                        className="relative overflow-hidden rounded-2xl border border-[#ECEAE5] bg-[#FAFAFA]"
                      >
                        <img
                          src={photoUrl}
                          alt={`Trip photo ${index + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 text-[#1A1A1A] hover:bg-white"
                          onClick={() => removeTripPhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-[#D8D2C8] bg-[#FAFAFA] text-sm text-[#6B6B68]">
                    Upload up to 6 trip photos for a dedicated PDF page.
                  </div>
                )}
              </div>
            </PreviewSection>
          </div>

          {hasOptionalSections && (
            <PreviewSection title="Optional Content" icon={FileOutput}>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">Activities</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                      onClick={addActivity}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Activity
                    </Button>
                  </div>
                  {(quoteData.activities || []).map((activity, index) => (
                    <div
                      key={`activity-${index}`}
                      className="rounded-2xl border border-[#ECEAE5] bg-[#FAFAFA] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#1A1A1A]">Activity {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-[#6B6B68] hover:bg-[#ECE8DF] hover:text-[#1A1A1A]"
                          onClick={() => removeActivity(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          value={activity.name}
                          onChange={(event) =>
                            updateActivityField(index, "name", event.target.value)
                          }
                          placeholder="Activity name"
                          className={EDITABLE_INPUT_CLASS.replace("text-right", "text-left")}
                        />
                        <textarea
                          rows={3}
                          value={activity.description || ""}
                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                            updateActivityField(index, "description", event.target.value)
                          }
                          placeholder="Activity description"
                          className={EDITABLE_TEXTAREA_CLASS}
                        />
                        <Input
                          value={activity.price || ""}
                          onChange={(event) =>
                            updateActivityField(index, "price", event.target.value)
                          }
                          placeholder="Price"
                          className={EDITABLE_INPUT_CLASS.replace("text-right", "text-left")}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#1A1A1A]">Notes</p>
                  <textarea
                    rows={4}
                    value={quoteData.notes || ""}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      updateQuoteData((current) => ({ ...current, notes: event.target.value }))
                    }
                    className={EDITABLE_TEXTAREA_CLASS}
                  />
                </div>
              </div>
            </PreviewSection>
          )}

          <Card className="border-[#E6E5E0] bg-white">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-[#D8D2C8] bg-white text-[#1A1A1A] hover:bg-[#F8F6F1]"
                onClick={handleSaveDraft}
                disabled={isSaving || isDownloading}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                disabled={isDownloading || isSaving}
                className="border border-[#0A0A0A] bg-[#0A0A0A] text-[#FAFAF8] hover:bg-[#FAFAF8] hover:text-[#0A0A0A]"
                data-testid="button-download-quote-pdf"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <FileOutput className="mr-2 h-4 w-4" />
                    Download Quote PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
