import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AccommodationOptionCard,
  accommodationOptionHasData,
  createAccommodationOption,
} from "./AccommodationOptionCard";
import {
  createFlightOption,
  FlightOptionCard,
  flightOptionHasData,
} from "./FlightOptionCard";
import type {
  AccommodationOption,
  FlightOption,
  OptionsListOption,
  OptionsListType,
} from "@/components/pdf/OptionsListPDFTemplate";

function renumberOptions<T extends OptionsListOption>(options: T[]): T[] {
  return options.map((option, index) => ({ ...option, order: index }));
}

function cloneOption<T extends OptionsListOption>(option: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(option) as T;
  }
  return JSON.parse(JSON.stringify(option)) as T;
}

function duplicateFlightOption(option: FlightOption): FlightOption {
  const duplicate = cloneOption(option);
  return {
    ...duplicate,
    id: crypto.randomUUID(),
    outboundLegs: (duplicate.outboundLegs || []).map((leg) => ({ ...leg, id: crypto.randomUUID() })),
    returnLegs: (duplicate.returnLegs || []).map((leg) => ({ ...leg, id: crypto.randomUUID() })),
  };
}

function duplicateAccommodationOption(option: AccommodationOption): AccommodationOption {
  const duplicate = cloneOption(option);
  return {
    ...duplicate,
    id: crypto.randomUUID(),
    coverPhoto: "",
    photos: [],
  };
}

export function OptionsListEditor({
  listType,
  options,
  onChange,
  onPhotoError,
}: {
  listType: OptionsListType;
  options: OptionsListOption[];
  onChange: (options: OptionsListOption[]) => void;
  onPhotoError?: (message: string) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set<string>();
      options.forEach((option) => {
        const hasTitle = listType === "flight"
          ? Boolean((option as FlightOption).airlineName?.trim())
          : Boolean((option as AccommodationOption).name?.trim());
        if (current.has(option.id) || !hasTitle) next.add(option.id);
      });
      return next;
    });
  }, [listType, options]);

  const addOption = () => {
    if (options.length >= 10) return;
    const option = listType === "flight"
      ? createFlightOption(options.length)
      : createAccommodationOption(options.length);
    onChange(renumberOptions([...options, option]));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(option.id);
      return next;
    });
  };

  const updateOption = (nextOption: OptionsListOption) => {
    onChange(options.map((option) => (option.id === nextOption.id ? nextOption : option)));
  };

  const deleteOption = (optionToDelete: OptionsListOption) => {
    const hasData = listType === "flight"
      ? flightOptionHasData(optionToDelete as FlightOption)
      : accommodationOptionHasData(optionToDelete as AccommodationOption);
    if (hasData && !window.confirm("Delete this option? This cannot be undone.")) return;
    onChange(renumberOptions(options.filter((option) => option.id !== optionToDelete.id)));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(optionToDelete.id);
      return next;
    });
  };

  const duplicateOption = (optionToDuplicate: OptionsListOption) => {
    if (options.length >= 10) return;

    const sourceIndex = options.findIndex((option) => option.id === optionToDuplicate.id);
    if (sourceIndex === -1) return;

    const duplicate = listType === "flight"
      ? duplicateFlightOption(optionToDuplicate as FlightOption)
      : duplicateAccommodationOption(optionToDuplicate as AccommodationOption);
    const nextOptions = [
      ...options.slice(0, sourceIndex + 1),
      duplicate,
      ...options.slice(sourceIndex + 1),
    ];

    onChange(renumberOptions(nextOptions));
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(duplicate.id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = options.findIndex((option) => option.id === active.id);
    const newIndex = options.findIndex((option) => option.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(renumberOptions(arrayMove(options, oldIndex, newIndex)));
  };

  const title = listType === "flight" ? "Flight Options" : "Accommodation Options";
  const addLabel = listType === "flight" ? "Add Flight Option" : "Add Accommodation Option";
  const duplicateDisabled = options.length >= 10;

  return (
    <div className="rounded-2xl border border-[#E6E5E0] bg-white p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#ECEAE5] pb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1A1A1A]">{title}</h2>
          <p className="mt-1 text-xs text-[#6B6B68]">
            Drag options to reorder. A maximum of 10 options is supported for accommodation photo storage.
          </p>
        </div>
        <Button
          type="button"
          className="bg-[#1A1A1A] text-white hover:bg-[#111111]"
          disabled={options.length >= 10}
          onClick={addOption}
        >
          <Plus className="mr-2 h-4 w-4" />
          {options.length >= 10 ? "Maximum 10 options reached" : addLabel}
        </Button>
      </div>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8D2C8] bg-[#FAFAFA] px-4 py-8 text-center text-sm text-[#6B6B68]">
          No options added yet.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={options.map((option) => option.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {options.map((option, index) =>
                listType === "flight" ? (
                  <FlightOptionCard
                    key={option.id}
                    option={option as FlightOption}
                    index={index}
                    expanded={expandedIds.has(option.id)}
                    onToggle={() => toggleExpanded(option.id)}
                    onChange={updateOption}
                    onDuplicate={() => duplicateOption(option)}
                    onDelete={() => deleteOption(option)}
                    duplicateDisabled={duplicateDisabled}
                  />
                ) : (
                  <AccommodationOptionCard
                    key={option.id}
                    option={option as AccommodationOption}
                    index={index}
                    expanded={expandedIds.has(option.id)}
                    onToggle={() => toggleExpanded(option.id)}
                    onChange={updateOption}
                    onDuplicate={() => duplicateOption(option)}
                    onDelete={() => deleteOption(option)}
                    duplicateDisabled={duplicateDisabled}
                    onPhotoError={onPhotoError}
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
