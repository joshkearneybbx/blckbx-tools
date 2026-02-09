/**
 * TransferCard - Displays a single transfer with drag handle and edit/delete buttons
 */

import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, Car, Train, Bus, ArrowRight, Clock } from "lucide-react";
import type { TransferSegment, TransferType } from "@/lib/travel-types";
import { getTransferLabel } from "@/lib/travel-types";

interface TransferCardProps {
  transfer: TransferSegment;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  dragHandleProps?: any; // For drag and drop library
}

const getTransferIcon = (type: TransferType) => {
  switch (type) {
    case 'train':
      return <Train className="w-4 h-4" />;
    case 'bus':
      return <Bus className="w-4 h-4" />;
    default:
      return <Car className="w-4 h-4" />;
  }
};

export function TransferCard({
  transfer,
  index,
  onEdit,
  onRemove,
  dragHandleProps,
}: TransferCardProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg group">
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Transfer Number */}
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-medium">
        {index + 1}
      </div>

      {/* Transfer Icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
        {getTransferIcon(transfer.type)}
      </div>

      {/* Transfer Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium truncate">
            {transfer.pickupLocation || 'Pickup'}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate">
            {transfer.dropoffLocation || 'Drop-off'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{getTransferLabel(transfer.type)}</span>
          {transfer.pickupTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {transfer.pickupTime}
            </span>
          )}
          {transfer.company && (
            <span className="truncate">{transfer.company}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 w-7 p-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
