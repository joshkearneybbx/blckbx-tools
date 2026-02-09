/**
 * SegmentCard - Display card for a single travel segment
 *
 * Shows segment details with drag handle, icon, and action buttons.
 */

import { GripVertical, Trash2, Edit2, Plane, Train, Bus, Ship, Car, Key, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TravelSegment } from '@/lib/travel-segments';
import { getSegmentIcon } from '@/lib/travel-segments';

const LUCIDE_ICONS: Record<string, React.ElementType> = {
  plane: Plane,
  train: Train,
  bus: Bus,
  ship: Ship,
  car: Car,
  key: Key,
  route: Route,
};

interface SegmentCardProps {
  segment: TravelSegment;
  index: number;
  onRemove: () => void;
  onEdit: () => void;
}

export function SegmentCard({ segment, index, onRemove, onEdit }: SegmentCardProps) {
  const iconName = getSegmentIcon(segment.type);
  const Icon = LUCIDE_ICONS[iconName] || Route;

  const typeLabel = segment.type.replace('_', ' ');

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing mt-1">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Segment Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Segment Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-semibold capitalize text-sm">
            {typeLabel}
          </span>
          <span className="text-muted-foreground text-sm">
            {segment.fromLocation} → {segment.toLocation}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {segment.date && (
            <div>
              <span className="font-medium text-foreground">Date:</span> {segment.date}
            </div>
          )}
          {segment.departureTime && (
            <div>
              <span className="font-medium text-foreground">Departs:</span> {segment.departureTime}
            </div>
          )}
          {segment.arrivalTime && (
            <div>
              <span className="font-medium text-foreground">Arrives:</span> {segment.arrivalTime}
            </div>
          )}
          {segment.flightNumber && (
            <div>
              <span className="font-medium text-foreground">Flight:</span> {segment.flightNumber}
            </div>
          )}
          {segment.airline && (
            <div>
              <span className="font-medium text-foreground">Airline:</span> {segment.airline}
            </div>
          )}
          {segment.company && (
            <div>
              <span className="font-medium text-foreground">Company:</span> {segment.company}
            </div>
          )}
          {segment.bookingReference && (
            <div>
              <span className="font-medium text-foreground">Booking:</span> {segment.bookingReference}
            </div>
          )}
          {segment.contactDetails && (
            <div className="col-span-2">
              <span className="font-medium text-foreground">Contact:</span> {segment.contactDetails}
            </div>
          )}
        </div>

        {segment.notes && (
          <div className="text-sm text-muted-foreground mt-2 italic border-l-2 border-muted-foreground/30 pl-2">
            {segment.notes}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
          title="Edit segment"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Remove segment"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
