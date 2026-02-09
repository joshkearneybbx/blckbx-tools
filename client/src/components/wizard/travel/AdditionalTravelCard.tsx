/**
 * AdditionalTravelCard - Card for displaying additional travel segments
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Train, Bus, Ship, Car, Key, ArrowRight, Calendar, Clock, Pencil, Trash2, MapPin } from "lucide-react";
import type { AdditionalTravelSegment, AdditionalTransportType } from "@/lib/travel-types";
import { getTransportLabel } from "@/lib/travel-types";

interface AdditionalTravelCardProps {
  segment: AdditionalTravelSegment;
  destinationName?: string;
  onEdit: () => void;
  onRemove: () => void;
}

const getIcon = (type: AdditionalTransportType) => {
  switch (type) {
    case 'flight':
      return <Plane className="w-4 h-4" />;
    case 'train':
      return <Train className="w-4 h-4" />;
    case 'bus':
      return <Bus className="w-4 h-4" />;
    case 'ferry':
      return <Ship className="w-4 h-4" />;
    case 'taxi':
    case 'private_transfer':
    case 'shuttle':
      return <Car className="w-4 h-4" />;
    case 'car_rental':
      return <Key className="w-4 h-4" />;
    default:
      return <ArrowRight className="w-4 h-4" />;
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateString;
  }
};

export function AdditionalTravelCard({
  segment,
  destinationName,
  onEdit,
  onRemove,
}: AdditionalTravelCardProps) {
  const hasLegs = segment.isConnecting && segment.legs && segment.legs.length > 1;

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700">
            {getIcon(segment.type)}
          </div>
          <div>
            <div className="font-medium text-sm">{getTransportLabel(segment.type)}</div>
            {segment.date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(segment.date)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {destinationName && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {destinationName}
            </Badge>
          )}
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

      {/* Route */}
      <div className="px-4 py-3">
        {hasLegs ? (
          // Multi-leg display
          <div className="space-y-2">
            {segment.legs!.map((leg, index) => (
              <div key={leg.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium text-muted-foreground w-12">
                  Leg {leg.legNumber}
                </span>
                {segment.type === 'flight' && leg.flightNumber && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {leg.flightNumber}
                  </span>
                )}
                <span className="font-medium">
                  {segment.type === 'flight'
                    ? leg.departureAirport
                    : leg.departureStation}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">
                  {segment.type === 'flight'
                    ? leg.arrivalAirport
                    : leg.arrivalStation}
                </span>
                {leg.departureTime && (
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {leg.departureTime}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Single route display
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{segment.fromLocation || 'Origin'}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{segment.toLocation || 'Destination'}</span>
              </div>
            </div>
            {segment.departureTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {segment.departureTime}
                {segment.arrivalTime && ` - ${segment.arrivalTime}`}
              </div>
            )}
          </div>
        )}

        {/* Additional info */}
        <div className="mt-2 flex flex-wrap gap-2">
          {segment.type === 'flight' && segment.flightNumber && (
            <Badge variant="secondary" className="text-xs">
              {segment.flightNumber}
              {segment.airline && ` (${segment.airline})`}
            </Badge>
          )}
          {segment.company && (
            <Badge variant="secondary" className="text-xs">
              {segment.company}
            </Badge>
          )}
          {segment.bookingReference && (
            <Badge variant="secondary" className="text-xs">
              Ref: {segment.bookingReference}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
