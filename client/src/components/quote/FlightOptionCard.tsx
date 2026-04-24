import { Copy, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import airlines from "@/data/airlines.json";
import type { FlightLeg, FlightOption } from "@/components/pdf/OptionsListPDFTemplate";

const INPUT_CLASS = "border-[#D4D0CB] bg-[#FAFAF8] text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:ring-0";

interface AirlineEntry {
  name: string;
  iata: string;
}

function hasLegData(leg: FlightLeg): boolean {
  return Boolean(
    leg.flightNumber?.trim() ||
      leg.depAirport?.trim() ||
      leg.depDate?.trim() ||
      leg.depTime?.trim() ||
      leg.arrAirport?.trim() ||
      leg.arrDate?.trim() ||
      leg.arrTime?.trim()
  );
}

function createLeg(): FlightLeg {
  return {
    id: crypto.randomUUID(),
    flightNumber: "",
    depAirport: "",
    depDate: "",
    depTime: "",
    arrAirport: "",
    arrDate: "",
    arrTime: "",
  };
}

function LegEditor({
  leg,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  leg: FlightLeg;
  index: number;
  onChange: (leg: FlightLeg) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const update = (field: keyof FlightLeg, value: string) => {
    onChange({ ...leg, [field]: field.includes("Airport") ? value.toUpperCase() : value });
  };

  return (
    <div className="rounded-xl border border-[#ECEAE5] bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B6B68]">Leg {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          className="h-7 w-7 rounded-full text-[#6B6B68] hover:bg-[#ECE8DF] hover:text-[#1A1A1A]"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        <Input className={`${INPUT_CLASS} md:col-span-1`} placeholder="Flight #" value={leg.flightNumber || ""} onChange={(event) => update("flightNumber", event.target.value)} />
        <Input className={INPUT_CLASS} placeholder="From (LGW)" value={leg.depAirport} maxLength={3} onChange={(event) => update("depAirport", event.target.value)} />
        <Input className={`${INPUT_CLASS} md:col-span-2`} type="date" value={leg.depDate} onChange={(event) => update("depDate", event.target.value)} />
        <Input className={INPUT_CLASS} type="time" value={leg.depTime} onChange={(event) => update("depTime", event.target.value)} />
        <Input className={INPUT_CLASS} placeholder="To (PFO)" value={leg.arrAirport} maxLength={3} onChange={(event) => update("arrAirport", event.target.value)} />
        <Input className={`${INPUT_CLASS} md:col-span-1`} type="time" value={leg.arrTime} onChange={(event) => update("arrTime", event.target.value)} />
        <Input className={`${INPUT_CLASS} md:col-span-2`} type="date" value={leg.arrDate} onChange={(event) => update("arrDate", event.target.value)} />
      </div>
    </div>
  );
}

function LegsSection({
  title,
  legs,
  onChange,
}: {
  title: string;
  legs: FlightLeg[];
  onChange: (legs: FlightLeg[]) => void;
}) {
  const safeLegs = legs.length > 0 ? legs : [createLeg()];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-t border-[#ECEAE5] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">{title}</p>
        <Button
          type="button"
          variant="outline"
          className="h-8 border-[#D8D2C8] bg-white text-xs text-[#1A1A1A] hover:bg-[#F8F6F1]"
          onClick={() => onChange([...safeLegs, createLeg()])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add connecting leg
        </Button>
      </div>
      {safeLegs.map((leg, index) => (
        <LegEditor
          key={leg.id}
          leg={leg}
          index={index}
          canRemove={safeLegs.length > 1}
          onChange={(nextLeg) => onChange(safeLegs.map((item) => (item.id === leg.id ? nextLeg : item)))}
          onRemove={() => onChange(safeLegs.filter((item) => item.id !== leg.id))}
        />
      ))}
    </div>
  );
}

export function FlightOptionCard({
  option,
  index,
  expanded,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
  duplicateDisabled,
}: {
  option: FlightOption;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (option: FlightOption) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  duplicateDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const airlineOptions = airlines as AirlineEntry[];
  const datalistId = useMemo(() => `airline-options-${option.id}`, [option.id]);
  const title = option.airlineName || `Flight option ${index + 1}`;

  const update = (field: keyof FlightOption, value: string | FlightLeg[]) => {
    onChange({ ...option, [field]: value });
  };

  const handleAirlineSearch = (value: string) => {
    const selected = airlineOptions.find(
      (airline) => airline.name === value || `${airline.name} (${airline.iata})` === value
    );
    if (selected) {
      onChange({ ...option, airlineName: selected.name, airlineIata: selected.iata });
    }
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
          aria-label="Drag flight option"
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
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6B6B68]">Airline</label>
            <Input
              className={INPUT_CLASS}
              list={datalistId}
              placeholder="Search airline — e.g. British Airways"
              onChange={(event) => handleAirlineSearch(event.target.value)}
            />
            <datalist id={datalistId}>
              {airlineOptions.map((airline) => (
                <option key={`${airline.name}-${airline.iata}`} value={`${airline.name} (${airline.iata})`} />
              ))}
            </datalist>
            <p className="text-xs text-[#6B6B68]">Can't find your airline? Type the name and IATA manually below.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input className={INPUT_CLASS} placeholder="Airline name" value={option.airlineName} onChange={(event) => update("airlineName", event.target.value)} />
            <Input className={INPUT_CLASS} placeholder="IATA code" value={option.airlineIata} maxLength={2} onChange={(event) => update("airlineIata", event.target.value.toUpperCase())} />
          </div>

          <LegsSection title="Outbound" legs={option.outboundLegs || []} onChange={(legs) => update("outboundLegs", legs)} />
          <LegsSection title="Return" legs={option.returnLegs || []} onChange={(legs) => update("returnLegs", legs)} />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input className={INPUT_CLASS} placeholder="Baggage — Cabin bags included" value={option.baggage} onChange={(event) => update("baggage", event.target.value)} />
            <Input className={INPUT_CLASS} placeholder="From £1,310" value={option.priceFromText} maxLength={50} onChange={(event) => update("priceFromText", event.target.value)} />
          </div>
          <Textarea className={`${INPUT_CLASS} min-h-[90px]`} placeholder="Notes" value={option.notes || ""} onChange={(event) => update("notes", event.target.value)} />
        </div>
      ) : null}
    </div>
  );
}

export function createFlightOption(order: number): FlightOption {
  return {
    id: crypto.randomUUID(),
    airlineName: "",
    airlineIata: "",
    outboundLegs: [createLeg()],
    returnLegs: [createLeg()],
    baggage: "",
    priceFromText: "",
    notes: "",
    order,
  };
}

export function flightOptionHasData(option: FlightOption): boolean {
  return Boolean(
    option.airlineName.trim() ||
      option.airlineIata.trim() ||
      option.baggage.trim() ||
      option.priceFromText.trim() ||
      option.notes?.trim() ||
      option.outboundLegs.some(hasLegData) ||
      option.returnLegs.some(hasLegData)
  );
}
