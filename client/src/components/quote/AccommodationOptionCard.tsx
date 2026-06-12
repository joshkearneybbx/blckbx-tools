import { Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AccommodationOption, FlightLeg, FlightReturnType } from "@/components/pdf/OptionsListPDFTemplate";
import { createLeg, LegsSection, legHasData } from "@/components/quote/FlightOptionCard";

const INPUT_CLASS = "border-[#D4D0CB] bg-[#FAFAF8] text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:ring-0";

function autoResizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function useAutoResizeTextarea(value: string | undefined, active = true) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    autoResizeTextarea(ref.current);
  }, [value, active]);

  return ref;
}

function normalizeBookingLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function convertToJpeg(file: File): Promise<string> {
  const MAX_DIMENSION = 1600;
  const QUALITY = 0.82;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
      const targetWidth = Math.round(image.width * ratio);
      const targetHeight = Math.round(image.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(image.src);
        reject(new Error("Canvas not supported"));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", QUALITY);
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

export function AccommodationOptionCard({
  option,
  index,
  expanded,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
  duplicateDisabled,
  onPhotoError,
}: {
  option: AccommodationOption;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (option: AccommodationOption) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  duplicateDisabled: boolean;
  onPhotoError?: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [highlightInput, setHighlightInput] = useState("");
  const locationDistancesRef = useAutoResizeTextarea(option.locationDistances || "", expanded);
  const areaSummaryRef = useAutoResizeTextarea(option.areaSummary || "", expanded);
  const whyThisOneRef = useAutoResizeTextarea(option.whyThisOne || "", expanded);
  const notesRef = useAutoResizeTextarea(option.notes || "", expanded);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const title = option.name || `Accommodation option ${index + 1}`;
  const returnType = option.returnType || "return";

  const update = (field: keyof AccommodationOption, value: string | string[] | FlightLeg[] | FlightReturnType) => {
    onChange({ ...option, [field]: value });
  };

  const addHighlight = () => {
    const nextHighlight = highlightInput.trim();
    if (!nextHighlight) return;
    update("highlights", [...(option.highlights || []), nextHighlight]);
    setHighlightInput("");
  };

  const removeHighlight = (highlightIndex: number) => {
    update("highlights", (option.highlights || []).filter((_, index) => index !== highlightIndex));
  };

  const handlePhotos = async (files: FileList | null) => {
    if (!files || option.photos.length >= 6) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const remaining = 6 - option.photos.length;
    const filesToProcess = Array.from(files).slice(0, remaining);
    try {
      const encoded = await Promise.all(filesToProcess.map((file) => convertToJpeg(file)));
      update("photos", [...option.photos, ...encoded.filter(Boolean)]);
    } catch (error) {
      onPhotoError?.(error instanceof Error ? error.message : "Failed to load one or more photos.");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCoverPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const encoded = await convertToJpeg(files[0]);
      update("coverPhoto", encoded);
    } catch (error) {
      onPhotoError?.(error instanceof Error ? error.message : "Failed to load cover photo.");
    }
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-[#E6E5E0] bg-[#FAFAFA] ${isDragging ? "opacity-70 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-3 border-b border-[#ECEAE5] p-3">
        <button
          type="button"
          className="cursor-grab rounded-lg p-1 text-[#6B6B68] hover:bg-[#ECE8DF] active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag accommodation option"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="flex-1 text-left" onClick={onToggle}>
          <span className="text-sm font-medium text-[#1A1A1A]">Option {index + 1}: {title}</span>
          <span className="ml-2 text-xs text-[#6B6B68]">{expanded ? "Collapse" : "Edit"}</span>
        </button>
        <div className="flex items-center gap-2">
          <span title={duplicateDisabled ? "Maximum 10 options reached." : "Duplicate option"}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none border-[#0A0A0A] bg-[#F5F3F0] px-2 text-xs text-[#0A0A0A] hover:bg-[#E8E4DE]"
              onClick={onDuplicate}
              disabled={duplicateDisabled}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-none border-[#0A0A0A] bg-[#F5F3F0] px-2 text-xs text-[#0A0A0A] hover:bg-[#E8E4DE]"
            onClick={onDelete}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input className={INPUT_CLASS} placeholder="Name" value={option.name} onChange={(event) => update("name", event.target.value)} />
            <Input className={INPUT_CLASS} placeholder="Location" value={option.location} onChange={(event) => update("location", event.target.value)} />
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">Booking link (optional)</span>
              <Input
                className={INPUT_CLASS}
                placeholder="https://www.airbnb.co.uk/rooms/..."
                value={option.bookingLink || ""}
                onChange={(event) => update("bookingLink", event.target.value)}
                onBlur={(event) => update("bookingLink", normalizeBookingLink(event.target.value))}
              />
            </label>
            <Input className={INPUT_CLASS} type="number" min={0} placeholder="Nights" value={String(option.nights || "")} onChange={(event) => update("nights", event.target.value)} />
            <Input className={INPUT_CLASS} type="number" min={0} placeholder="Bedrooms" value={String(option.bedrooms || "")} onChange={(event) => update("bedrooms", event.target.value)} />
            <Input className={INPUT_CLASS} type="number" min={0} placeholder="Sleeps" value={String(option.sleeps || "")} onChange={(event) => update("sleeps", event.target.value)} />
            <Input className={INPUT_CLASS} placeholder="Board — B&B, Half Board..." value={option.boardBasis || ""} onChange={(event) => update("boardBasis", event.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">Highlights</label>
            <div className="flex gap-2">
              <Input
                className={INPUT_CLASS}
                placeholder="Villa highlight — e.g. Private pool"
                value={highlightInput}
                onChange={(event) => setHighlightInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHighlight();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="border-[#D8D2C8] bg-white text-sm text-[#1A1A1A] hover:bg-[#F8F6F1]"
                onClick={addHighlight}
              >
                Add
              </Button>
            </div>
            {(option.highlights || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(option.highlights || []).map((highlight, highlightIndex) => (
                  <span key={`${highlight}-${highlightIndex}`} className="inline-flex items-center gap-1 rounded-full border border-[#D8D2C8] bg-white px-3 py-1 text-xs text-[#1A1A1A]">
                    {highlight}
                    <button type="button" className="text-[#6B6B68] hover:text-[#1A1A1A]" onClick={() => removeHighlight(highlightIndex)} aria-label={`Remove ${highlight}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">Location — distances</label>
            <Textarea
              ref={locationDistancesRef}
              className={`${INPUT_CLASS} min-h-[90px] !w-full resize-y overflow-hidden`}
              placeholder="One per line — e.g. Beach 800m"
              value={option.locationDistances || ""}
              onChange={(event) => {
                autoResizeTextarea(event.currentTarget);
                update("locationDistances", event.target.value);
              }}
              style={{ overflowY: "hidden", resize: "vertical" }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECEAE5] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">Flights</p>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6B6B68]">
                Return flight
                <select
                  className="h-8 rounded-none border border-[#D4D0CB] bg-[#FAFAF8] px-2 text-xs font-normal normal-case tracking-normal text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none"
                  value={returnType}
                  onChange={(event) => update("returnType", event.target.value as FlightReturnType)}
                >
                  <option value="return">Return</option>
                  <option value="one-way">One-way</option>
                  <option value="tbc">TBC</option>
                </select>
              </label>
            </div>
            <LegsSection title="Outbound" legs={option.outboundLegs || []} onChange={(legs) => update("outboundLegs", legs)} />
            {returnType === "return" ? (
              <LegsSection title="Return" legs={option.returnLegs || []} onChange={(legs) => update("returnLegs", legs)} />
            ) : (
              <div className="rounded-xl border border-dashed border-[#D8D2C8] bg-[#F8F6F1] px-4 py-3 text-xs text-[#6B6B68]">
                Return flight fields are hidden for {returnType === "one-way" ? "one-way" : "TBC"} options. Existing return details are preserved if you switch back to Return.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input className={INPUT_CLASS} placeholder="Car hire — e.g. Group B hatchback, fully insured" value={option.carHire || ""} onChange={(event) => update("carHire", event.target.value)} />
            <Input className={INPUT_CLASS} placeholder="Baggage — e.g. 22kg per person included" value={option.baggage || ""} onChange={(event) => update("baggage", event.target.value)} />
          </div>

          <div className="space-y-1">
            <Textarea
              ref={areaSummaryRef}
              className={`${INPUT_CLASS} min-h-[110px] !w-full resize-y overflow-hidden`}
              placeholder="About the area — the high-street-agent context for this location"
              value={option.areaSummary || ""}
              onChange={(event) => {
                autoResizeTextarea(event.currentTarget);
                update("areaSummary", event.target.value);
              }}
              style={{ overflowY: "hidden", resize: "vertical" }}
            />
            <p className="text-xs text-[#6B6B68]">2–4 sentences works best.</p>
          </div>

          <Textarea
            ref={whyThisOneRef}
            className={`${INPUT_CLASS} min-h-[110px] !w-full resize-y overflow-hidden`}
            placeholder="Why we picked this one — the rationale for this specific option"
            value={option.whyThisOne || ""}
            onChange={(event) => {
              autoResizeTextarea(event.currentTarget);
              update("whyThisOne", event.target.value);
            }}
            style={{ overflowY: "hidden", resize: "vertical" }}
          />

          {/* Cover Photo */}
          <div className="space-y-3 rounded-xl border border-[#ECEAE5] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Cover Photo</p>
                <p className="text-xs text-[#6B6B68]">{option.coverPhoto ? "1 cover photo set" : "No cover photo set"}</p>
              </div>
              {!option.coverPhoto ? (
                <>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleCoverPhoto(event.target.files)} />
                  <Button type="button" className="bg-[#1A1A1A] text-white hover:bg-[#111111]" onClick={() => coverInputRef.current?.click()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Cover Photo
                  </Button>
                </>
              ) : null}
            </div>
            {option.coverPhoto ? (
              <div className="relative overflow-hidden rounded-xl border border-[#ECEAE5] bg-[#FAFAFA]">
                <img src={option.coverPhoto} alt={`Cover for ${title}`} className="h-40 w-full object-cover" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 rounded-full bg-white/90 text-[#1A1A1A] hover:bg-white" onClick={() => update("coverPhoto", "")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </div>

          {/* Gallery Photos */}
          <div className="space-y-3 rounded-xl border border-[#ECEAE5] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">Photos</p>
                <p className="text-xs text-[#6B6B68]">{option.photos.length} / 6 photos added</p>
              </div>
              {option.photos.length < 6 ? (
                <>
                  <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handlePhotos(event.target.files)} />
                  <Button type="button" className="bg-[#1A1A1A] text-white hover:bg-[#111111]" onClick={() => inputRef.current?.click()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Photos
                  </Button>
                </>
              ) : null}
            </div>
            {option.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {option.photos.map((photo, photoIndex) => (
                  <div key={`${photo}-${photoIndex}`} className="relative overflow-hidden rounded-xl border border-[#ECEAE5] bg-[#FAFAFA]">
                    <img src={photo} alt={`Accommodation option ${index + 1} photo ${photoIndex + 1}`} className="h-28 w-full object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 rounded-full bg-white/90 text-[#1A1A1A] hover:bg-white"
                      onClick={() => update("photos", option.photos.filter((_, i) => i !== photoIndex))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[#D8D2C8] bg-[#FAFAFA] text-sm text-[#6B6B68]">
                Upload up to 6 photos for this option.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input className={INPUT_CLASS} placeholder="From £4,500" value={option.priceFromText} maxLength={50} onChange={(event) => update("priceFromText", event.target.value)} />
            <Textarea
              ref={notesRef}
              className={`${INPUT_CLASS} min-h-[90px] !w-full resize-y overflow-hidden`}
              placeholder="Notes"
              value={option.notes || ""}
              onChange={(event) => {
                autoResizeTextarea(event.currentTarget);
                update("notes", event.target.value);
              }}
              style={{ overflowY: "hidden", resize: "vertical" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function createAccommodationOption(order: number): AccommodationOption {
  return {
    id: crypto.randomUUID(),
    name: "",
    location: "",
    bookingLink: "",
    nights: "",
    bedrooms: "",
    sleeps: "",
    boardBasis: "",
    // Deprecated in favour of areaSummary/whyThisOne, but retained so old saved quotes still render.
    description: "",
    highlights: [],
    locationDistances: "",
    outboundLegs: [createLeg()],
    returnLegs: [createLeg()],
    returnType: "return",
    carHire: "",
    baggage: "",
    areaSummary: "",
    whyThisOne: "",
    coverPhoto: "",
    photos: [],
    priceFromText: "",
    notes: "",
    order,
  };
}

export function accommodationOptionHasData(option: AccommodationOption): boolean {
  return Boolean(
    option.name.trim() ||
      option.location.trim() ||
      option.bookingLink?.trim() ||
      String(option.nights || "").trim() ||
      String(option.bedrooms || "").trim() ||
      String(option.sleeps || "").trim() ||
      option.boardBasis?.trim() ||
      option.description?.trim() ||
      (option.highlights?.length ?? 0) > 0 ||
      option.locationDistances?.trim() ||
      option.carHire?.trim() ||
      option.baggage?.trim() ||
      option.areaSummary?.trim() ||
      option.whyThisOne?.trim() ||
      (option.outboundLegs || []).some(legHasData) ||
      (option.returnLegs || []).some(legHasData) ||
      Boolean(option.coverPhoto) ||
      option.photos.length > 0 ||
      option.priceFromText.trim() ||
      option.notes?.trim()
  );
}
