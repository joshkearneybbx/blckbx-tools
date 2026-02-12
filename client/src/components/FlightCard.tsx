import { ExternalLink, Plane, Calendar, Users, AlertCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightLeg {
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  flightNumber?: string;
  layoverDuration?: string;
}

interface FlightCardProps {
  flightNumber: string;
  date: string;
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  passengers?: string;
  notes?: string;
  duration?: string;
  isMultiLeg?: boolean;
  legs?: FlightLeg[];
  airline?: string;
  bookingReference?: string;
  company?: string;
  contactDetails?: string;
  isConnecting?: boolean;
  legNumber?: number;
  totalLegs?: number;
}

export function FlightCard({
  flightNumber,
  date,
  departureAirport,
  departureTime,
  arrivalAirport,
  arrivalTime,
  passengers,
  notes,
  duration,
  isMultiLeg = false,
  legs = [],
  airline,
  bookingReference,
  company,
  contactDetails,
  isConnecting = false,
  legNumber,
  totalLegs,
}: FlightCardProps) {
  const cleanFlightNumber = flightNumber.replace(/\s/g, '').toUpperCase();
  const flightTrackerUrl = `https://www.flightradar24.com/data/flights/${cleanFlightNumber.toLowerCase()}`;

  const getAirportCode = (airport: string) => {
    if (!airport) return '---';
    if (/^[A-Z]{3}$/i.test(airport.trim())) return airport.trim().toUpperCase();
    return airport.substring(0, 3).toUpperCase();
  };

  const depCode = getAirportCode(departureAirport);
  const arrCode = getAirportCode(arrivalAirport);
  const routeLabel = isConnecting
    ? (legNumber && totalLegs ? `Leg ${legNumber} of ${totalLegs}` : 'Connecting')
    : (duration || 'Direct');

  return (
    <div className="flight-card bg-white rounded-[12px] shadow-sm overflow-hidden my-4 animate-slide-up" data-testid="flight-card">
      {/* Header - Dark base with accent */}
      <div className="flight-card-header bg-[hsl(var(--base-black))] text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Plane className="w-6 h-6" />
          <span className="font-bold text-lg">{cleanFlightNumber}</span>
        </div>
      </div>

      {/* Single Leg Flight */}
      {!isMultiLeg && (
        <div className="flight-route px-6 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-foreground">{depCode}</div>
              <div className="text-xl font-semibold text-foreground mt-1">{departureTime}</div>
              <div className="text-sm text-foreground-muted mt-1 max-w-[120px] mx-auto truncate">{departureAirport}</div>
            </div>

            <div className="flex-1 flex flex-col items-center px-4">
              <div className="text-xs text-foreground-subtle mb-2">{routeLabel}</div>
              <div className="w-full flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--base-black))] dark:bg-white"></div>
                <div className="flex-1 h-0.5 bg-[hsl(var(--base-black))] dark:bg-white"></div>
                <Plane className="text-[hsl(var(--base-black))] dark:text-white w-4 h-4 flex-shrink-0" />
                <div className="flex-1 h-0.5 bg-[hsl(var(--base-black))] dark:bg-white"></div>
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--base-black))] dark:bg-white"></div>
              </div>
              {!isConnecting && (
                <div className="text-xs text-foreground-subtle mt-2">Non-stop</div>
              )}
            </div>

            <div className="text-center flex-1">
              <div className="text-3xl font-bold text-foreground">{arrCode}</div>
              <div className="text-xl font-semibold text-foreground mt-1">{arrivalTime}</div>
              <div className="text-sm text-foreground-muted mt-1 max-w-[120px] mx-auto truncate">{arrivalAirport}</div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Leg Flight */}
      {isMultiLeg && legs.length > 0 && (
        <div className="flight-route-multi px-6 py-4 bg-white">
          {legs.map((leg, index) => (
            <div key={index}>
              {/* Leg */}
              <div className="flex items-center justify-between py-4">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-foreground">{getAirportCode(leg.departureAirport)}</div>
                  <div className="text-lg font-semibold text-foreground mt-1">{leg.departureTime}</div>
                  <div className="text-xs text-foreground-subtle mt-1 max-w-[100px] mx-auto truncate">{leg.departureAirport}</div>
                </div>

                <div className="flex-1 flex flex-col items-center px-2">
                  {leg.flightNumber && (
                    <div className="text-xs text-foreground-subtle mb-1">{leg.flightNumber}</div>
                  )}
                  <div className="w-full flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--base-black))] dark:bg-white"></div>
                    <div className="flex-1 h-0.5 bg-[hsl(var(--base-black))] dark:bg-white"></div>
                    <Plane className="text-[hsl(var(--base-black))] dark:text-white w-3 h-3 flex-shrink-0" />
                    <div className="flex-1 h-0.5 bg-[hsl(var(--base-black))] dark:bg-white"></div>
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--base-black))] dark:bg-white"></div>
                  </div>
                </div>

                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-foreground">{getAirportCode(leg.arrivalAirport)}</div>
                  <div className="text-lg font-semibold text-foreground mt-1">{leg.arrivalTime}</div>
                  <div className="text-xs text-foreground-subtle mt-1 max-w-[100px] mx-auto truncate">{leg.arrivalAirport}</div>
                </div>
              </div>

              {/* Layover indicator (if not last leg) */}
              {index < legs.length - 1 && (
                <div className="flex items-center justify-center py-3 border-y border-dashed border-border bg-white">
                  <div className="flex items-center gap-2 text-[hsl(var(--warning))]">
                    <ArrowRightLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {leg.layoverDuration || 'Connection'} in {getAirportCode(leg.arrivalAirport)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Details Section */}
      <div className="flight-details px-6 py-4 border-t bg-white">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-foreground-subtle" />
            <span className="text-foreground">{date}</span>
          </div>
          {passengers && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-foreground-subtle" />
              <span className="text-foreground">{passengers}</span>
            </div>
          )}
        </div>

        {(airline || bookingReference || company || contactDetails) && (
          <div className="mt-3 text-sm text-foreground-subtle">
            {airline && <div>Airline: {airline}</div>}
            {bookingReference && <div>Booking Ref: {bookingReference}</div>}
            {company && <div>Company: {company}</div>}
            {contactDetails && <div>Contact: {contactDetails}</div>}
          </div>
        )}

        {notes && (
          <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--warning-light))]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[hsl(var(--warning-foreground))] mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[hsl(var(--warning-foreground))] uppercase">Things to Remember</div>
                <div className="text-sm text-[hsl(var(--warning-foreground))] mt-1 whitespace-pre-wrap">{notes}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Track Flight Button with Yellow CTA */}
      <div className="flight-footer px-6 py-4 border-t flex items-center bg-white">
        <Button
          variant="default"
          size="sm"
          className="gap-2 rounded-full border-0 bg-[#E7C51C] text-[#232220] hover:bg-[#d8b71a]"
          asChild
        >
          <a
            href={flightTrackerUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`link-track-flight-${cleanFlightNumber}`}
          >
            <Plane className="w-4 h-4" />
            Track Flight {cleanFlightNumber}
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
        <span className="text-xs text-foreground-subtle ml-3">Opens FlightRadar24 in a new tab</span>
      </div>
    </div>
  );
}

export type { FlightLeg, FlightCardProps };
