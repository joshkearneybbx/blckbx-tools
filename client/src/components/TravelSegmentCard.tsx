import { Plane, Train, Bus, Ship, Car, Key, Route, ExternalLink } from "lucide-react";
import type { TravelSegment, SegmentType } from "@/lib/travel-segments";

interface TravelSegmentCardProps {
  segment: TravelSegment;
  passengers?: string;
  showTrackButton?: boolean;
}

const TYPE_ICONS: Record<SegmentType, React.ElementType> = {
  flight: Plane,
  train: Train,
  bus: Bus,
  ferry: Ship,
  taxi: Car,
  private_transfer: Car,
  shuttle: Car,
  car_rental: Key,
  other: Route,
};

const TYPE_LABELS: Record<SegmentType, string> = {
  flight: "Flight",
  train: "Train",
  bus: "Bus",
  ferry: "Ferry",
  taxi: "Airport Transfer",
  private_transfer: "Private Transfer",
  shuttle: "Shuttle",
  car_rental: "Car Rental",
  other: "Other",
};

export function TravelSegmentCard({ segment, passengers, showTrackButton = true }: TravelSegmentCardProps) {
  const Icon = TYPE_ICONS[segment.type];

  // Generate FlightRadar24 link for flights
  const getFlightRadarLink = () => {
    if (segment.type === 'flight' && segment.flightNumber) {
      // Format flight number for URL (remove spaces and special chars)
      const cleanFlightNum = segment.flightNumber.replace(/\s+/g, '').toUpperCase();
      return `https://www.flightradar24.com/data/flights/${cleanFlightNum}`;
    }
    return null;
  };

  // Extract airport codes (3-letter IATA codes)
  const extractAirportCode = (location: string): string => {
    const match = location.match(/\b([A-Z]{3})\b/);
    return match ? match[1] : location.substring(0, 3).toUpperCase();
  };

  // Get full location name without airport code
  const getLocationName = (location: string): string => {
    return location.replace(/\s*[A-Z]{3}\s*,?\s*/, '').trim() || location;
  };

  const fromCode = extractAirportCode(segment.fromLocation);
  const toCode = extractAirportCode(segment.toLocation);
  const fromName = getLocationName(segment.fromLocation);
  const toName = getLocationName(segment.toLocation);

  const flightRadarLink = getFlightRadarLink();

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-border">
      {/* Header */}
      <div className="bg-[#1a1a1a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-semibold">
            {segment.type === 'flight' && segment.flightNumber ? segment.flightNumber : TYPE_LABELS[segment.type]}
          </span>
        </div>
        {segment.type === 'flight' && (
          <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-1 rounded font-bold">
            Direct
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Route */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-[#1a1a1a]">{fromCode}</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-[80px] mx-auto">{fromName}</div>
          </div>

          <div className="flex-1 px-4">
            <div className="text-center text-sm text-muted-foreground mb-1">{segment.departureTime || '--:--'}</div>
            <div className="relative h-0.5 bg-[#E8E4DE]">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1a1a1a]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#1a1a1a]" />
              <Icon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1a1a]" />
            </div>
            <div className="text-center text-sm text-muted-foreground mt-1">{segment.arrivalTime || '--:--'}</div>
          </div>

          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-[#1a1a1a]">{toCode}</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-[80px] mx-auto">{toName}</div>
          </div>
        </div>

        {/* Flight path info for flights */}
        {segment.type === 'flight' && (
          <div className="flex items-center justify-between text-sm text-center">
            <div className="flex-1">
              <div className="text-muted-foreground">{fromName}</div>
            </div>
            <div className="flex-1 text-muted-foreground">Direct / Non-stop</div>
            <div className="flex-1">
              <div className="text-muted-foreground">{toName}</div>
            </div>
          </div>
        )}

        {/* Date and Passengers */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{segment.date}</span>
          </div>
          {passengers && (
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span>{passengers}</span>
            </div>
          )}
        </div>

        {/* Details Box */}
        <div className="bg-[#E8E4DE] rounded p-3 space-y-1">
          {segment.type === 'flight' && (
            <>
              {segment.bookingReference && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Booking Reference:</span>
                  <span>{segment.bookingReference}</span>
                </div>
              )}
              {segment.confirmationNumber && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Ticket Number:</span>
                  <span>{segment.confirmationNumber}</span>
                </div>
              )}
              {segment.airline && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Airline:</span>
                  <span>{segment.airline}</span>
                </div>
              )}
            </>
          )}

          {segment.type === 'train' && (
            <>
              {segment.company && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Company:</span>
                  <span>{segment.company}</span>
                </div>
              )}
              {segment.bookingReference && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Booking Ref:</span>
                  <span>{segment.bookingReference}</span>
                </div>
              )}
            </>
          )}

          {(segment.type === 'taxi' || segment.type === 'private_transfer' || segment.type === 'shuttle') && (
            <>
              {segment.company && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Company:</span>
                  <span>{segment.company}</span>
                </div>
              )}
              {segment.contactDetails && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Contact:</span>
                  <span>{segment.contactDetails}</span>
                </div>
              )}
            </>
          )}

          {segment.type === 'bus' && (
            <>
              {segment.company && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Company:</span>
                  <span>{segment.company}</span>
                </div>
              )}
              {segment.bookingReference && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Booking Ref:</span>
                  <span>{segment.bookingReference}</span>
                </div>
              )}
            </>
          )}

          {segment.type === 'ferry' && (
            <>
              {segment.company && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Company:</span>
                  <span>{segment.company}</span>
                </div>
              )}
              {segment.bookingReference && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Booking Ref:</span>
                  <span>{segment.bookingReference}</span>
                </div>
              )}
            </>
          )}

          {segment.type === 'car_rental' && (
            <>
              {segment.company && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Rental Company:</span>
                  <span>{segment.company}</span>
                </div>
              )}
              {segment.bookingReference && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Confirmation:</span>
                  <span>{segment.bookingReference}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Track Flight Button */}
        {segment.type === 'flight' && showTrackButton && flightRadarLink && (
          <a
            href={flightRadarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#E7C51C] hover:bg-[#e5b515] text-[#1a1a1a] px-4 py-2 rounded text-sm font-medium transition-colors"
            title="Opens FlightRadar24 in a new tab"
          >
            <Plane className="w-4 h-4" />
            Track Flight {segment.flightNumber}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Notes */}
        {segment.notes && (
          <div className="text-sm text-muted-foreground italic">
            {segment.notes}
          </div>
        )}
      </div>
    </div>
  );
}
