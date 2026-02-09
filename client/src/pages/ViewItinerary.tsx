import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, ArrowLeft, MapPin, ExternalLink, Pencil, Copy, Check, Plane, Train, Bus, Sailboat, Car, Calendar, Link2, UtensilsCrossed, Martini, Compass, Bed } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import type { FullItinerary } from "@shared/schema";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ItineraryPDFTemplate } from "@/components/pdf/ItineraryPDFTemplate";
import logoUrl from "@assets/blckbx-logo.png";
// Map feature disabled - will re-enable when Google Maps API key is configured
// import MapVisualization from "@/components/MapVisualization";
// import { collectLocationsFromItinerary } from "@/lib/collectLocations";
import { useImagePreprocessor } from "@/hooks/useImagePreprocessor";
import { Helmet } from "react-helmet";
import { FlightCard } from "@/components/FlightCard";
import { useAuth } from "@/hooks/useAuth";
import { pb } from "@/lib/pocketbase";
import { outboundToSegments, returnToSegments } from "@/lib/travel-migration";
import type { TravelSegment } from "@/lib/travel-segments";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Travel Item component for drag-and-drop
// Supports both legacy AdditionalTravel format and new AdditionalTravelSegment format
function SortableTravelItem({
  travel,
  canReorder = true,
}: {
  travel: any;
  canReorder?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: travel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    touchAction: 'none' as const,
  };

  // Detect format: new format has 'type', legacy has 'travelType'
  const isNewFormat = 'type' in travel && !('travelType' in travel);
  const travelType = isNewFormat ? travel.type : travel.travelType;
  const displayType = travelType?.charAt(0).toUpperCase() + travelType?.slice(1) || 'Travel';

  // Render content based on format
  const renderContent = () => {
    if (isNewFormat) {
      // New AdditionalTravelSegment format
      const { type, fromLocation, toLocation, date, departureTime, arrivalTime, company, bookingReference, notes, flightNumber, airline, isConnecting, legs } = travel;

      if (type === 'flight') {
        // Handle multi-leg/connecting flights
        if (isConnecting && legs && legs.length > 1) {
          return (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Connecting Flights</h4>
              {legs.map((leg: any, idx: number) => (
                <div key={leg.id || idx}>
                  <FlightCard
                    flightNumber={leg.flightNumber || ''}
                    date={date || ''}
                    departureAirport={leg.departureAirport || ''}
                    departureTime={leg.departureTime || ''}
                    arrivalAirport={leg.arrivalAirport || ''}
                    arrivalTime={leg.arrivalTime || ''}
                  />
                  {idx < legs.length - 1 && leg.layoverDuration && (
                    <div className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                      <span className="font-medium">Layover:</span> {leg.layoverDuration}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }
        // Single flight
        return (
          <FlightCard
            flightNumber={flightNumber || ''}
            date={date || ''}
            departureAirport={fromLocation || ''}
            departureTime={departureTime || ''}
            arrivalAirport={toLocation || ''}
            arrivalTime={arrivalTime || ''}
          />
        );
      }

      // Generic transport (train, bus, ferry, taxi, etc.)
      return (
        <div className="space-y-2 text-sm">
          {fromLocation && <p><span className="font-medium">From:</span> {fromLocation}</p>}
          {toLocation && <p><span className="font-medium">To:</span> {toLocation}</p>}
          {date && <p><span className="font-medium">Date:</span> {date}</p>}
          {departureTime && <p><span className="font-medium">Departure:</span> {departureTime}</p>}
          {arrivalTime && <p><span className="font-medium">Arrival:</span> {arrivalTime}</p>}
          {company && <p><span className="font-medium">Company:</span> {company}</p>}
          {bookingReference && <p><span className="font-medium">Booking Ref:</span> {bookingReference}</p>}
          {notes && <p className="whitespace-pre-wrap text-muted-foreground">{notes}</p>}
        </div>
      );
    }

    // Legacy AdditionalTravel format
    if (travelType === 'flight' && travel.flightNumber) {
      return (
        <FlightCard
          flightNumber={travel.flightNumber}
          date={travel.flightDate || ''}
          departureAirport={travel.flightDepartureAirport || ''}
          departureTime={travel.flightDepartureTime || ''}
          arrivalAirport={travel.flightArrivalAirport || ''}
          arrivalTime={travel.flightArrivalTime || ''}
          passengers={travel.flightPassengersSeats || undefined}
          notes={travel.flightThingsToRemember || undefined}
        />
      );
    }

    return (
      <div className="space-y-2 text-sm">
        {travelType === 'car' && (
          <>
            {travel.vehicleDetails && <p><span className="font-medium">Vehicle:</span> {travel.vehicleDetails}</p>}
            {travel.vehicleRegistration && <p><span className="font-medium">Registration:</span> {travel.vehicleRegistration}</p>}
            {travel.carContactDetails && <p><span className="font-medium">Contact:</span> {travel.carContactDetails}</p>}
            {travel.carBookingDetails && <p className="whitespace-pre-wrap">{travel.carBookingDetails}</p>}
          </>
        )}
        {travelType === 'ferry' && (
          <>
            {travel.ferryDepartingFrom && <p><span className="font-medium">From:</span> {travel.ferryDepartingFrom}</p>}
            {travel.ferryDestination && <p><span className="font-medium">To:</span> {travel.ferryDestination}</p>}
            {travel.ferryDate && <p><span className="font-medium">Date:</span> {travel.ferryDate}</p>}
            {travel.ferryPrice && <p><span className="font-medium">Price:</span> {travel.ferryPrice}</p>}
            {travel.ferryContactDetails && <p><span className="font-medium">Contact:</span> {travel.ferryContactDetails}</p>}
            {travel.ferryBookingReference && <p><span className="font-medium">Booking Ref:</span> {travel.ferryBookingReference}</p>}
            {travel.ferryAdditionalNotes && <p className="whitespace-pre-wrap">{travel.ferryAdditionalNotes}</p>}
          </>
        )}
        {travelType === 'train' && (
          <>
            {travel.trainDepartingFrom && <p><span className="font-medium">From:</span> {travel.trainDepartingFrom}</p>}
            {travel.trainDestination && <p><span className="font-medium">To:</span> {travel.trainDestination}</p>}
            {travel.trainDate && <p><span className="font-medium">Date:</span> {travel.trainDate}</p>}
            {travel.trainPrice && <p><span className="font-medium">Price:</span> {travel.trainPrice}</p>}
            {travel.trainContactDetails && <p><span className="font-medium">Contact:</span> {travel.trainContactDetails}</p>}
            {travel.trainBookingReference && <p><span className="font-medium">Booking Ref:</span> {travel.trainBookingReference}</p>}
            {travel.trainAdditionalNotes && <p className="whitespace-pre-wrap">{travel.trainAdditionalNotes}</p>}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-[12px] bg-white shadow-sm overflow-hidden transition-shadow ${
        isDragging ? 'shadow-xl ring-2 ring-[#E7C51C]' : ''
      }`}
    >
      {/* Header with optional drag handle and travel type */}
      <div className="px-4 py-3 flex items-center gap-3 border-b bg-muted/30">
        {canReorder && (
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:opacity-70 transition-opacity touch-none p-1 -m-1"
            style={{ touchAction: 'none' }}
            aria-label="Drag to reorder"
          >
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
            </div>
          </button>
        )}
        <h3 className="font-semibold text-lg">{displayType}</h3>
        {travel.date && (
          <span className="text-sm text-muted-foreground ml-auto">{travel.date}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>
    </div>
  );
}

// Weather emoji mapping - dynamic based on weather text
const getWeatherEmoji = (weather: string | null | undefined): string => {
  if (!weather) return '🌡️';
  
  const text = weather.toLowerCase();
  
  if (text.includes('hot') || text.includes('sunny') || text.includes('clear')) {
    return 'Sunny';
  }
  if (text.includes('warm') || text.includes('mild') || text.includes('pleasant')) {
    return 'Warm';
  }
  if (text.includes('partly') || text.includes('partial')) {
    return 'Partly Cloudy';
  }
  if (text.includes('cloud') || text.includes('overcast')) {
    return 'Cloudy';
  }
  if (text.includes('rain') || text.includes('shower')) {
    return 'Rainy';
  }
  if (text.includes('storm') || text.includes('thunder')) {
    return 'Stormy';
  }
  if (text.includes('snow') || text.includes('cold') || text.includes('freezing')) {
    return 'Snowy';
  }
  if (text.includes('wind')) {
    return 'Windy';
  }
  if (text.includes('fog') || text.includes('mist')) {
    return 'Foggy';
  }
  
  // Default
  return '';
};

// =============================================================================
// DESTINATION SECTION COMPONENT
// =============================================================================

interface DestinationSectionProps {
  destination: any;
  destIndex: number;
  travelSegments: TravelSegment[];
  accommodations: any[];
  activities: any[];
  dining: any[];
  bars: any[];
  travellers: any[];
}

function DestinationSection({
  destination,
  destIndex,
  travelSegments,
  accommodations,
  activities,
  dining,
  bars,
  travellers,
}: DestinationSectionProps) {
  const hasAnyContent = 
    travelSegments.length > 0 ||
    accommodations.length > 0 ||
    activities.length > 0 ||
    dining.length > 0 ||
    bars.length > 0;

  // Format destination dates
  const formatDestDates = () => {
    if (destination.dates) return destination.dates;
    if (destination.startDate && destination.endDate) {
      const start = new Date(destination.startDate).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      const end = new Date(destination.endDate).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      return `${start} - ${end}`;
    }
    return null;
  };

  return (
    <Card id={`section-destination-${destination.id}`} className="overflow-hidden rounded-[12px]">
      <CardHeader className="bg-[#232220] text-white">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2 text-white">
              <MapPin className="w-6 h-6 text-white" />
              {destination.name}
            </CardTitle>
            {formatDestDates() && (
              <p className="text-white/80 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white" />
                {formatDestDates()}
              </p>
            )}
            {destination.weather && (
              <p className="text-white/80 mt-1">
                {destination.weather}
              </p>
            )}
          </div>
          {destination.weatherUrl && (
            <a 
              href={destination.weatherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#E07A5F] underline hover:opacity-80 flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Weather
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {/* Travel Section */}
        {travelSegments.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#1a1a1a]">
              {destIndex === 0 ? 'Outbound Travel' : `Travel to ${destination.name}`}
            </h3>
            <div className="space-y-4">
              {travelSegments.map((segment, idx) => (
                <TravelSegmentCard key={idx} segment={segment} travellers={travellers} />
              ))}
            </div>
          </div>
        )}

        {/* Accommodation Section */}
        {accommodations.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#1a1a1a]">
              Accommodation
            </h3>
            <div className="space-y-4">
              {accommodations.map((accom) => (
                <AccommodationCard key={accom.id} accommodation={accom} />
              ))}
            </div>
          </div>
        )}

        {/* Activities Section */}
        {activities.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#1a1a1a]">
              Activities & Experiences
            </h3>
            <div className="space-y-4">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}

        {/* Dining Section */}
        {dining.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#1a1a1a]">
              Restaurants & Dining
            </h3>
            <div className="space-y-4">
              {dining.map((restaurant) => (
                <DiningCard key={restaurant.id} dining={restaurant} />
              ))}
            </div>
          </div>
        )}

        {/* Bars Section */}
        {bars.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4 text-[#1a1a1a]">
              Bars & Nightlife
            </h3>
            <div className="space-y-4">
              {bars.map((bar) => (
                <BarCard key={bar.id} bar={bar} />
              ))}
            </div>
          </div>
        )}

        {/* No content message */}
        {!hasAnyContent && (
          <p className="text-muted-foreground text-center py-8">
            No items added for this destination yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// TRAVEL SEGMENT CARD (WEB VIEW)
// =============================================================================

function TravelSegmentCard({ segment, travellers }: { segment: TravelSegment; travellers?: any[] }) {
  const getSegmentIcon = () => {
    const iconClass = "w-5 h-5 text-[#E7C51C]";
    switch (segment.type) {
      case 'flight': return <Plane className={iconClass} />;
      case 'train': return <Train className={iconClass} />;
      case 'bus': return <Bus className={iconClass} />;
      case 'ferry': return <Sailboat className={iconClass} />;
      case 'taxi': return <Car className={iconClass} />;
      case 'car_rental': return <Car className={iconClass} />;
      default: return <Car className={iconClass} />;
    }
  };

  const getSegmentLabel = () => {
    switch (segment.type) {
      case 'flight': return 'Flight';
      case 'train': return 'Train';
      case 'bus': return 'Bus';
      case 'ferry': return 'Ferry';
      case 'taxi': return 'Taxi';
      case 'private_transfer': return 'Private Transfer';
      case 'shuttle': return 'Shuttle';
      case 'car_rental': return 'Car Rental';
      default: return 'Transport';
    }
  };

  if (segment.type === 'flight') {
    return (
      <FlightCard
        flightNumber={segment.flightNumber || ''}
        date={segment.date || ''}
        departureAirport={segment.fromLocation || ''}
        departureTime={segment.departureTime || ''}
        arrivalAirport={segment.toLocation || ''}
        arrivalTime={segment.arrivalTime || ''}
        passengers={travellers?.map(t => t.name).join(', ') || undefined}
        notes={segment.notes || undefined}
      />
    );
  }

  return (
    <div className="p-4 rounded-[12px] bg-white shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {getSegmentIcon()}
        <h4 className="font-semibold">{getSegmentLabel()}</h4>
        {segment.date && (
          <span className="text-sm text-muted-foreground ml-auto">{segment.date}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        {segment.fromLocation && (
          <div>
            <span className="text-muted-foreground">From:</span> {segment.fromLocation}
          </div>
        )}
        {segment.toLocation && (
          <div>
            <span className="text-muted-foreground">To:</span> {segment.toLocation}
          </div>
        )}
        {segment.departureTime && (
          <div>
            <span className="text-muted-foreground">Departure:</span> {segment.departureTime}
          </div>
        )}
        {segment.arrivalTime && (
          <div>
            <span className="text-muted-foreground">Arrival:</span> {segment.arrivalTime}
          </div>
        )}
        {segment.company && (
          <div>
            <span className="text-muted-foreground">Company:</span> {segment.company}
          </div>
        )}
        {segment.bookingReference && (
          <div>
            <span className="text-muted-foreground">Booking Ref:</span> {segment.bookingReference}
          </div>
        )}
      </div>
      {segment.notes && (
        <p className="text-sm text-muted-foreground mt-3">{segment.notes}</p>
      )}
    </div>
  );
}

// =============================================================================
// ITEM CARDS
// =============================================================================

type CardDetail = { label: string; value: string };

function UnifiedContentCard({
  name,
  description,
  address,
  googleMapsLink,
  websiteUrl,
  priceBadge,
  details,
  imageUrl,
  notes,
}: {
  name: string;
  description?: string;
  address?: string;
  googleMapsLink?: string;
  websiteUrl?: string;
  priceBadge?: string;
  details?: CardDetail[];
  imageUrl?: string;
  notes?: string;
}) {
  const detailRows = [
    ...(details || []).filter((d) => d.value),
    ...(notes ? [{ label: "Notes", value: notes }] : []),
  ];

  return (
    <div className="p-6 rounded-[12px] bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3 gap-3">
        <h3 className="font-semibold text-xl text-[#1a1a1a]">{name}</h3>
        {priceBadge && (
          <span className="bg-[#E7C51C] text-[#1a1a1a] px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
            {priceBadge}
          </span>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">{description}</p>
      )}

      {(address || googleMapsLink || websiteUrl) && (
        <div className="space-y-2 mb-4">
          {address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm">{address}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            {googleMapsLink && (
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#E07A5F] underline hover:opacity-80"
              >
                <ExternalLink className="w-4 h-4" />
                View on Google Maps
              </a>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#E07A5F] underline hover:opacity-80"
              >
                <ExternalLink className="w-4 h-4" />
                View Website
              </a>
            )}
          </div>
        </div>
      )}

      {detailRows.length > 0 && (
        <div className="mb-4 p-4 rounded-[8px] bg-[#FFBB95] space-y-2">
          {detailRows.map((detail, idx) => (
            <p key={`${detail.label}-${idx}`} className="text-sm">
              <span className="font-medium text-[#1a1a1a]">{detail.label}:</span>{" "}
              <span className="text-[#555555] whitespace-pre-wrap">{detail.value}</span>
            </p>
          ))}
        </div>
      )}

      {imageUrl && (
        <div className="mt-4 w-full aspect-video overflow-hidden rounded-[8px]">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

function AccommodationCard({ accommodation: accom }: { accommodation: any }) {
  return (
    <UnifiedContentCard
      name={accom.name}
      description={accom.description}
      address={accom.address}
      googleMapsLink={accom.googleMapsLink}
      websiteUrl={accom.websiteUrl}
      details={[
        { label: "Check-in/Check-out", value: accom.checkInDetails || "" },
        { label: "Booking Reference", value: accom.bookingReference || "" },
        { label: "Contact", value: accom.contactInfo || "" },
      ]}
      imageUrl={accom.primaryImage || accom.images?.[0]}
      notes={accom.notes}
    />
  );
}

function ActivityCard({ activity }: { activity: any }) {
  return (
    <UnifiedContentCard
      name={activity.name}
      description={activity.description}
      address={activity.address}
      googleMapsLink={activity.googleMapsLink}
      websiteUrl={activity.websiteUrl}
      priceBadge={activity.price}
      details={[
        { label: "Contact", value: activity.contactDetails || "" },
      ]}
      imageUrl={activity.primaryImage || activity.images?.[0]}
      notes={activity.notes}
    />
  );
}

function DiningCard({ dining: restaurant }: { dining: any }) {
  return (
    <UnifiedContentCard
      name={restaurant.name}
      description={restaurant.description}
      address={restaurant.address}
      googleMapsLink={restaurant.googleMapsLink}
      websiteUrl={restaurant.websiteUrl}
      priceBadge={restaurant.priceRange}
      details={[
        { label: "Cuisine Type", value: restaurant.cuisineType || "" },
        { label: "Contact", value: restaurant.contactDetails || "" },
      ]}
      imageUrl={restaurant.primaryImage || restaurant.images?.[0]}
      notes={restaurant.notes}
    />
  );
}

function BarCard({ bar }: { bar: any }) {
  return (
    <UnifiedContentCard
      name={bar.name}
      description={bar.description}
      address={bar.address}
      googleMapsLink={bar.googleMapsLink}
      websiteUrl={bar.websiteUrl}
      priceBadge={bar.priceRange}
      details={[
        { label: "Bar Type", value: bar.barType || "" },
        { label: "Contact", value: bar.contactDetails || "" },
      ]}
      imageUrl={bar.primaryImage || bar.images?.[0]}
      notes={bar.notes}
    />
  );
}

// =============================================================================
// MAIN VIEW ITINERARY COMPONENT
// =============================================================================

export default function ViewItinerary() {
  const [, params] = useRoute("/itinerary/:slug");
  const slug = params?.slug || "";
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);
  const { user, isAuthResolved } = useAuth();
  const isLoggedIn = !!user;
  const canEdit = isLoggedIn;

  const { data, isLoading, error } = useQuery<FullItinerary>({
    queryKey: ["itinerary_by_slug", slug, isLoggedIn],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');

      console.log('Fetching itinerary by slug:', { slug, isLoggedIn });

      // Logged-in users can view all statuses. Public viewers only see published.
      const filter = isLoggedIn
        ? `customUrlSlug = "${slug}"`
        : `customUrlSlug = "${slug}" && status = "published"`;

      const records = await pb.collection('blckbx_projects').getList(1, 1, {
        filter,
      });

      if (records.items.length === 0) {
        throw new Error('Itinerary not found');
      }

      const project = records.items[0];
      console.log('Project fetched:', { id: project.id, name: project.name, slug: project.customUrlSlug });

      // Fetch related collections
      const [
        destinations, 
        travellers, 
        accommodations, 
        activities, 
        dining, 
        bars, 
        outboundTravel, 
        returnTravel, 
        helpfulInformation,
        interDestinationTravel
      ] = await Promise.all([
        pb.collection('blckbx_destinations').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_travellers').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_accommodations').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_activities').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_dining').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_bars').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }),
        pb.collection('blckbx_outbound_travel').getFirstListItem(`project = "${project.id}"`).catch(() => null),
        pb.collection('blckbx_return_travel').getFirstListItem(`project = "${project.id}"`).catch(() => null),
        pb.collection('blckbx_helpful_information').getFirstListItem(`project = "${project.id}"`).catch(() => null),
        pb.collection('blckbx_inter_destination_travel').getFullList({
          filter: `project = "${project.id}"`,
          sort: 'displayOrder'
        }).catch(() => []),
      ]);

      console.log('Related collections fetched:', {
        destinations: destinations.length,
        travellers: travellers.length,
        accommodations: accommodations.length,
        activities: activities.length,
        dining: dining.length,
        bars: bars.length,
        interDestinationTravel: interDestinationTravel.length,
      });

      // Load additional travel segments from project or fallback to outbound travel
      let additionalTravelSegments: any[] = [];
      if (project.additionalTravelSegments && Array.isArray(project.additionalTravelSegments)) {
        console.log('=== LOADING ADDITIONAL TRAVEL FROM PROJECT (VIEW) ===');
        console.log('additionalTravelSegments:', project.additionalTravelSegments);
        additionalTravelSegments = project.additionalTravelSegments;
      } else if (outboundTravel?.additionalSegments && Array.isArray(outboundTravel.additionalSegments)) {
        console.log('=== LOADING ADDITIONAL TRAVEL FROM OUTBOUND (VIEW FALLBACK) ===');
        console.log('additionalSegments:', outboundTravel.additionalSegments);
        additionalTravelSegments = outboundTravel.additionalSegments;
      } else {
        console.log('=== NO ADDITIONAL TRAVEL DATA FOUND (VIEW) ===');
      }

      // Build travelDetails from the first destination
      const firstDest = destinations[0];
      const travelDetails = firstDest ? {
        dates: firstDest.dates || (firstDest.startDate && firstDest.endDate
          ? `${new Date(firstDest.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(firstDest.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : null),
        location: firstDest.location || firstDest.name || null,
        weather: firstDest.weather || null,
        weatherUrl: firstDest.weatherUrl || null,
      } : null;

      console.log('=== TRAVEL DETAILS BUILT ===');
      console.log('travelDetails:', travelDetails);

      return {
        itinerary: project,
        destinations,
        travelDetails,
        travellers,
        accommodations,
        activities,
        dining,
        bars,
        additionalTravel: additionalTravelSegments,
        outboundTravel,
        returnTravel,
        interDestinationTravel,
        // Migrate legacy data to segments for PDF rendering
        outboundJourney: outboundTravel ? outboundToSegments(outboundTravel as any) : [],
        returnJourney: returnTravel ? returnToSegments(returnTravel as any) : [],
        helpfulInformation,
        customSectionItems: [],
      };
    },
    enabled: !!slug && isAuthResolved,
    staleTime: 0,
    gcTime: 0,
  });

  // Logged-in users have team-wide edit access.
  const isAccessDetermined = isAuthResolved && !isLoading;

  // Pre-process images for PDF (convert to data URIs)
  const { processedItinerary, isLoading: isProcessingImages } = useImagePreprocessor(data);

  // State for additional travel items (for drag-and-drop reordering)
  const [additionalTravelItems, setAdditionalTravelItems] = useState<any[]>([]);
  
  // Sync additional travel items from query data
  useEffect(() => {
    if (data?.additionalTravel) {
      setAdditionalTravelItems(
        data.additionalTravel.map((item: any, index: number) => ({
          ...item,
          id: item?.id || `additional-${index}`,
        }))
      );
    }
  }, [data?.additionalTravel]);

  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for additional travel reordering
  const handleAdditionalTravelDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAdditionalTravelItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "The itinerary link has been copied to your clipboard.",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!data) return;

    const text = encodeURIComponent(
      `Check out this travel itinerary!\n\n` +
      `${data.itinerary.name}\n\n` +
      `View full details: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isAuthResolved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" data-testid="loader-auth-resolve" />
          <p className="text-lg text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" data-testid="loader-itinerary" />
          <p className="text-lg text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <img 
            src={logoUrl} 
            alt="BlckBx" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-serif font-semibold text-foreground">Itinerary Not Found</h1>
          <p className="text-muted-foreground">
            We couldn't load this itinerary. Please check the link or contact support.
          </p>
          {isLoggedIn && (
            <Link href="/itinerary">
              <Button data-testid="button-back-home">
                Return to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { 
    itinerary, 
    destinations, 
    travelDetails, 
    travellers, 
    accommodations: allAccommodations, 
    activities: allActivities, 
    dining: allDining, 
    bars: allBars,
    interDestinationTravel,
    returnTravel,
    helpfulInformation,
    outboundJourney,
    returnJourney,
  } = data;

  // Filter out hidden items
  const accommodations = allAccommodations?.filter(item => item.visible !== 0) || [];
  const activities = allActivities?.filter(item => item.visible !== 0) || [];
  const dining = allDining?.filter(item => item.visible !== 0) || [];
  const bars = allBars?.filter(item => item.visible !== 0) || [];

  // Sort destinations by displayOrder
  const sortedDestinations = [...destinations].sort((a, b) => {
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    return orderA - orderB;
  });

  // Helper: Get items for a specific destination
  const getItemsForDestination = (items: any[], destinationId: string | null) => {
    if (!destinationId) {
      return items.filter(item => !item.destination);
    }
    return items.filter(item => item.destination === destinationId);
  };

  // Helper: Normalize PocketBase relation-ish values into comparable ids/names.
  const getRelationValues = (value: any): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.flatMap((v) => getRelationValues(v));
    }
    if (typeof value === 'object') {
      return [value.id, value.name].filter(Boolean).map(String);
    }
    return [String(value)];
  };

  const matchesDestination = (ref: any, destination: any): boolean => {
    const refs = getRelationValues(ref);
    if (refs.length === 0) return false;
    return refs.includes(String(destination.id)) || refs.includes(String(destination.name));
  };

  const hasSegmentContent = (segment: TravelSegment): boolean => {
    return !!(
      segment.fromLocation ||
      segment.toLocation ||
      segment.date ||
      segment.departureTime ||
      segment.arrivalTime ||
      segment.flightNumber ||
      segment.bookingReference ||
      segment.company ||
      segment.notes
    );
  };

  // Helper: Get travel segments for a destination
  const parseInterDestinationTravel = (travelRecord: any): TravelSegment[] => {
    let details: any;
    if (travelRecord?.travelDetails) {
      try {
        details = typeof travelRecord.travelDetails === 'string'
          ? JSON.parse(travelRecord.travelDetails)
          : travelRecord.travelDetails;
      } catch {
        details = undefined;
      }
    }

    // Truthy check for isMultiLeg by design: supports bool/number/string-y values from stored JSON.
    if (details && details.isMultiLeg && Array.isArray(details.legs) && details.legs.length > 0) {
      return details.legs.map((leg: any, idx: number): TravelSegment => ({
        id: `${travelRecord.id || 'travel'}-leg-${idx}`,
        type: travelRecord.travelType || 'flight',
        fromLocation: leg.departureAirport || leg.fromLocation || details.departureAirport || details.fromLocation || '',
        toLocation: leg.arrivalAirport || leg.toLocation || details.arrivalAirport || details.toLocation || '',
        date: leg.date || details.date || '',
        departureTime: leg.departureTime || '',
        arrivalTime: leg.arrivalTime || '',
        flightNumber: leg.flightNumber || details.flightNumber || '',
        airline: leg.airline || details.airline || '',
        bookingReference: leg.bookingReference || details.bookingReference || '',
        notes: leg.layoverDuration ? `Layover: ${leg.layoverDuration}` : (leg.notes || details.notes || ''),
      })).filter(hasSegmentContent);
    }

    const singleSegment: TravelSegment = {
      id: travelRecord.id || `travel-${travelRecord.displayOrder ?? 0}`,
      type: travelRecord.travelType || 'flight',
      fromLocation: details?.departureAirport || details?.fromLocation || travelRecord.fromLocation || '',
      toLocation: details?.arrivalAirport || details?.toLocation || travelRecord.toLocation || '',
      date: details?.date || travelRecord.date || '',
      departureTime: details?.departureTime || travelRecord.departureTime || '',
      arrivalTime: details?.arrivalTime || travelRecord.arrivalTime || '',
      flightNumber: details?.flightNumber || travelRecord.flightNumber || '',
      airline: details?.airline || travelRecord.airline || '',
      bookingReference: details?.bookingReference || travelRecord.bookingReference || '',
      notes: details?.notes || travelRecord.notes || '',
    };

    return hasSegmentContent(singleSegment) ? [singleSegment] : [];
  };

  const parseAdditionalTravelItem = (item: any, fallbackId: string): TravelSegment[] => {
    if (!item) return [];

    const type = item.type || item.travelType || 'flight';
    if (item.isConnecting && Array.isArray(item.legs) && item.legs.length > 0) {
      return item.legs.map((leg: any, idx: number): TravelSegment => ({
        id: `${item.id || fallbackId}-leg-${idx}`,
        type,
        fromLocation: leg.departureAirport || leg.departureStation || item.fromLocation || '',
        toLocation: leg.arrivalAirport || leg.arrivalStation || item.toLocation || '',
        date: item.date || item.flightDate || '',
        departureTime: leg.departureTime || item.departureTime || '',
        arrivalTime: leg.arrivalTime || item.arrivalTime || '',
        flightNumber: leg.flightNumber || item.flightNumber || '',
        airline: leg.airline || item.airline || '',
        company: leg.company || item.company || '',
        bookingReference: item.bookingReference || '',
        notes: item.notes || '',
      })).filter(hasSegmentContent);
    }

    const segment: TravelSegment = {
      id: item.id || fallbackId,
      type,
      fromLocation: item.fromLocation || item.flightDepartureAirport || item.trainDepartingFrom || item.ferryDepartingFrom || '',
      toLocation: item.toLocation || item.flightArrivalAirport || item.trainDestination || item.ferryDestination || '',
      date: item.date || item.flightDate || item.trainDate || item.ferryDate || '',
      departureTime: item.departureTime || item.flightDepartureTime || '',
      arrivalTime: item.arrivalTime || item.flightArrivalTime || '',
      flightNumber: item.flightNumber || '',
      airline: item.airline || '',
      company: item.company || '',
      bookingReference: item.bookingReference || item.trainBookingReference || item.ferryBookingReference || '',
      notes: item.notes || item.flightThingsToRemember || item.trainAdditionalNotes || item.ferryAdditionalNotes || '',
    };

    return hasSegmentContent(segment) ? [segment] : [];
  };

  const getTravelForDestination = (destination: any, destIndex: number): TravelSegment[] => {
    const additionalDestinationSegments = (additionalTravelItems || [])
      .filter((item, idx) =>
        matchesDestination(item?.destinationId, destination) ||
        matchesDestination(item?.toDestination, destination)
      )
      .flatMap((item, idx) => parseAdditionalTravelItem(item, `additional-${idx}`));

    if (destIndex === 0) {
      // First destination: show outbound journey
      return [...(outboundJourney || []), ...additionalDestinationSegments];
    }

    // Subsequent destinations: include all inter-destination records that arrive at this destination.
    const interDestinationSegments = (interDestinationTravel || [])
      .filter((t: any) => matchesDestination(t.toDestination, destination))
      .flatMap((record: any) => parseInterDestinationTravel(record));

    return [...interDestinationSegments, ...additionalDestinationSegments];
  };

  // Get unassigned items
  const unassignedAccommodations = accommodations.filter(item => !item.destination);
  const unassignedActivities = activities.filter(item => !item.destination);
  const unassignedDining = dining.filter(item => !item.destination);
  const unassignedBars = bars.filter(item => !item.destination);
  
  const hasUnassignedItems = 
    unassignedAccommodations.length > 0 ||
    unassignedActivities.length > 0 ||
    unassignedDining.length > 0 ||
    unassignedBars.length > 0;

  const isListProject = itinerary?.projectType === 'list';
  const defaultProjectTitle = isListProject ? 'Travel List' : 'Travel Itinerary';
  const pageTitle = `${itinerary?.name || defaultProjectTitle} | BlckBx Tools`;
  const listSummaryCategories = [
    { key: 'restaurants', label: 'Restaurants', count: dining.length, Icon: UtensilsCrossed },
    { key: 'bars', label: 'Bars', count: bars.length, Icon: Martini },
    { key: 'activities', label: 'Activities', count: activities.length, Icon: Compass },
    { key: 'accommodation', label: 'Accommodation', count: accommodations.length, Icon: Bed },
  ].filter((entry) => entry.count > 0);
  const totalListItems = listSummaryCategories.reduce((sum, entry) => sum + entry.count, 0);

  // Calculate full date range for multi-destination
  const getFullDateRange = () => {
    if (!sortedDestinations.length) return travelDetails?.dates || '';
    const first = sortedDestinations[0];
    const last = sortedDestinations[sortedDestinations.length - 1];
    
    const start = first.startDate || first.dates?.split(' - ')[0];
    const end = last.endDate || last.dates?.split(' - ')[1];
    
    if (start && end) {
      const startStr = new Date(start).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      const endStr = new Date(end).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
      return `${startStr} - ${endStr}`;
    }
    return travelDetails?.dates || '';
  };

  // Helper to check if return travel has meaningful content
  const hasReturnTravelContent = (travel: any) => {
    if (!travel) return false;
    return !!(
      travel.flightNumber?.trim() ||
      travel.departureAirport?.trim() ||
      travel.arrivalAirport?.trim() ||
      travel.departureTime?.trim() ||
      travel.arrivalTime?.trim() ||
      travel.transferToAirportTaxiBooked ||
      travel.transferToAirportType === "taxi" ||
      travel.transferToAirportType === "train" ||
      (travel.transferToAirportTaxis && (travel.transferToAirportTaxis as any[])?.length > 0) ||
      (travel.transferToAirportTrains && (travel.transferToAirportTrains as any[])?.length > 0) ||
      travel.transferToAirportCompany?.trim() ||
      travel.transferHomeTaxiBooked ||
      travel.transferHomeType === "taxi" ||
      travel.transferHomeType === "train" ||
      (travel.transferHomeTaxis && (travel.transferHomeTaxis as any[])?.length > 0) ||
      (travel.transferHomeTrains && (travel.transferHomeTrains as any[])?.length > 0) ||
      travel.transferHomeCompany?.trim()
    );
  };

  const destinationAssignedAdditionalIds = new Set(
    (additionalTravelItems || [])
      .filter((item) =>
        sortedDestinations.some((destination) =>
          matchesDestination(item?.destinationId, destination) ||
          matchesDestination(item?.toDestination, destination)
        )
      )
      .map((item) => String(item.id))
  );

  const fallbackAdditionalTravelItems = (additionalTravelItems || []).filter((item) => {
    if (!item) return false;
    if (!item.id) return true;
    return !destinationAssignedAdditionalIds.has(String(item.id));
  });

  const parseCustomFields = (fields: any): Array<{ label: string; value: string }> => {
    const parsed = typeof fields === 'string' ? (() => {
      try {
        return JSON.parse(fields);
      } catch {
        return [];
      }
    })() : fields;

    if (!Array.isArray(parsed)) return [];
    return parsed.filter((field: any) => field?.label && field?.value);
  };

  const resolvedReturnJourney = (returnJourney && returnJourney.length > 0)
    ? returnJourney
    : (returnTravel ? returnToSegments(returnTravel as any) : []);

  const fallbackReturnSegments: TravelSegment[] = (() => {
    if (!returnTravel) return [];
    if (resolvedReturnJourney.length > 0) return [];

    if (returnTravel.isMultiLeg && Array.isArray(returnTravel.legs) && returnTravel.legs.length > 0) {
      return returnTravel.legs.map((leg: any, idx: number) => ({
        id: `return-leg-${idx}`,
        type: 'flight',
        fromLocation: leg.departureAirport || '',
        toLocation: leg.arrivalAirport || '',
        date: returnTravel.flightDate || '',
        departureTime: leg.departureTime || '',
        arrivalTime: leg.arrivalTime || '',
        flightNumber: leg.flightNumber || '',
        airline: leg.airline || '',
        notes: returnTravel.thingsToRemember || '',
      }));
    }

    if (!hasReturnTravelContent(returnTravel)) return [];

    return [{
      id: 'return-main',
      type: 'flight',
      fromLocation: returnTravel.departureAirport || '',
      toLocation: returnTravel.arrivalAirport || '',
      date: returnTravel.flightDate || '',
      departureTime: returnTravel.departureTime || '',
      arrivalTime: returnTravel.arrivalTime || '',
      flightNumber: returnTravel.flightNumber || '',
      notes: returnTravel.thingsToRemember || '',
    }];
  })();

  const returnSegmentsToRender = resolvedReturnJourney.length > 0
    ? resolvedReturnJourney
    : fallbackReturnSegments;

  const customHelpfulFields = parseCustomFields(helpfulInformation?.customFields);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`View your personalized ${itinerary?.name || 'travel'} itinerary with accommodations, activities, dining, and travel arrangements.`}
        />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content={`View your personalized ${itinerary?.name || 'travel'} itinerary with detailed travel planning.`} 
        />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-[#FAF9F8]">
        <header className="sticky top-0 z-40 bg-[#FAF9F8]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9F8]/80 border-b border-border">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isAccessDetermined && canEdit ? (
                  <Link href="/itinerary">
                    <img
                      src={logoUrl}
                      alt="BlckBx"
                      className="h-12 w-auto cursor-pointer hover-elevate active-elevate-2 rounded p-1"
                      data-testid="img-logo"
                    />
                  </Link>
                ) : (
                  <img 
                    src={logoUrl} 
                    alt="BlckBx" 
                    className="h-12 w-auto"
                    data-testid="img-logo"
                  />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {isAccessDetermined && canEdit && (
                  <Link href={`/itinerary/edit/${itinerary.id}`}>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-testid="button-edit"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  </Link>
                )}
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleWhatsAppShare}
                  data-testid="button-share-whatsapp"
                >
                  <SiWhatsapp className="w-4 h-4" />
                  Share
                </Button>
                
                <PDFDownloadLink
                  document={processedItinerary ? <ItineraryPDFTemplate data={processedItinerary} /> : <></>}
                  fileName={`${data.itinerary.customUrlSlug}_BlckBx_${Date.now()}.pdf`}
                >
                  {({ loading }) => (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={loading || isProcessingImages}
                      data-testid="button-download-pdf"
                    >
                      {(loading || isProcessingImages) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isProcessingImages ? 'Processing images...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          PDF
                        </>
                      )}
                    </Button>
                  )}
                </PDFDownloadLink>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
          <div id="itinerary-content" className="space-y-12">
            {/* Header */}
            <div className="text-center space-y-4 pb-8 border-b">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground" data-testid="text-title">
                {itinerary.name}
              </h1>
              
              {/* Share URL */}
              <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg max-w-2xl mx-auto">
                <p className="text-sm text-muted-foreground truncate flex-1 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  {window.location.href}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  data-testid="button-copy-link"
                >
                  {linkCopied ? (
                    <><Check className="w-4 h-4 mr-2" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                  )}
                </Button>
              </div>
              
              {/* Multi-destination display */}
              {sortedDestinations.length > 1 ? (
                <div className="space-y-2 text-lg text-muted-foreground">
                  <p data-testid="text-dates" className="flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {getFullDateRange()}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {sortedDestinations.map((dest, idx) => (
                      <span key={dest.id} className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                        <MapPin className="w-4 h-4" />
                        {dest.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : travelDetails && (
                <div className="space-y-2 text-lg text-muted-foreground">
                  {travelDetails.dates && (
                    <p data-testid="text-dates" className="flex items-center justify-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {travelDetails.dates}
                    </p>
                  )}
                  {travelDetails.location && (
                    <p data-testid="text-location" className="flex items-center justify-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {travelDetails.location}
                    </p>
                  )}
                  {travelDetails.weather && (
                    <p data-testid="text-weather" className="flex items-center justify-center gap-2">
                      {travelDetails.weather}
                    </p>
                  )}
                  {travelDetails.weatherUrl && (
                    <p>
                      <a 
                        href={travelDetails.weatherUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#E07A5F] underline hover:opacity-80"
                        data-testid="link-weather"
                      >
                        Click here to see live weather
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>

            {isListProject && listSummaryCategories.length > 0 && (
              <div className="max-w-2xl mx-auto pt-6 mt-2 border-t border-[#E8E4DE]">
                <p className="text-xs tracking-wide uppercase text-[#C1B9AE] mb-3">What&apos;s Inside</p>
                <div className="space-y-2">
                  {listSummaryCategories.map(({ key, label, count, Icon }) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-[#232220]">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </div>
                      <span className="font-semibold text-[#232220]">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 mt-3 border-t border-[#E8E4DE] text-sm text-muted-foreground">
                  {totalListItems} {totalListItems === 1 ? 'place' : 'places'} in this guide
                </div>
              </div>
            )}

            {/* Travellers */}
            {travellers && travellers.length > 0 && (
              <Card id="section-travellers">
                <CardHeader>
                  <CardTitle className="text-2xl">Travellers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {travellers.map((traveller, index) => {
                      const isChild = traveller.type?.toLowerCase?.()?.includes?.('child') || false;
                      return (
                        <div key={traveller.id} className="flex items-center justify-between p-4 rounded-[12px] bg-white shadow-sm">
                          <div>
                            <p className="font-medium" data-testid={`text-traveller-name-${index}`}>{traveller.name}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-traveller-type-${index}`}>
                              {isChild ? 'Child' : 'Adult'}
                              {isChild && traveller.ageAtTravel != null && traveller.ageAtTravel > 0 && ` (Age: ${traveller.ageAtTravel})`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Destination Sections */}
            {sortedDestinations.map((destination, destIndex) => (
              <DestinationSection
                key={destination.id}
                destination={destination}
                destIndex={destIndex}
                travelSegments={getTravelForDestination(destination, destIndex)}
                accommodations={getItemsForDestination(accommodations, destination.id)}
                activities={getItemsForDestination(activities, destination.id)}
                dining={getItemsForDestination(dining, destination.id)}
                bars={getItemsForDestination(bars, destination.id)}
                travellers={travellers}
              />
            ))}

            {/* Unassigned Items Section */}
            {hasUnassignedItems && (
              <Card id="section-unassigned">
                <CardHeader>
                  <CardTitle className="text-2xl">Additional Items</CardTitle>
                  <p className="text-muted-foreground">Not assigned to a specific destination</p>
                </CardHeader>
                <CardContent className="space-y-8">
                  {unassignedAccommodations.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Accommodation</h3>
                      <div className="space-y-4">
                        {unassignedAccommodations.map((accom) => (
                          <AccommodationCard key={accom.id} accommodation={accom} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {unassignedActivities.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Activities & Experiences</h3>
                      <div className="space-y-4">
                        {unassignedActivities.map((activity) => (
                          <ActivityCard key={activity.id} activity={activity} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {unassignedDining.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Restaurants & Dining</h3>
                      <div className="space-y-4">
                        {unassignedDining.map((restaurant) => (
                          <DiningCard key={restaurant.id} dining={restaurant} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {unassignedBars.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Bars & Nightlife</h3>
                      <div className="space-y-4">
                        {unassignedBars.map((bar) => (
                          <BarCard key={bar.id} bar={bar} />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Travel (legacy fallback only) */}
            {fallbackAdditionalTravelItems.length > 0 && (
              <Card id="section-additional-travel">
                <CardHeader>
                  <CardTitle className="text-2xl">Additional Travel</CardTitle>
                </CardHeader>
                <CardContent>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={canEdit ? handleAdditionalTravelDragEnd : undefined}
                  >
                    <SortableContext
                      items={fallbackAdditionalTravelItems.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {fallbackAdditionalTravelItems.map((travel) => (
                          <SortableTravelItem
                            key={travel.id}
                            travel={travel}
                            canReorder={canEdit}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>
            )}

            {/* Return Travel */}
            {returnSegmentsToRender.length > 0 && (
              <Card id="section-return">
                <CardHeader>
                  <CardTitle className="text-2xl">Return Travel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {returnSegmentsToRender.length > 0 && (
                    <div className="space-y-4">
                      {returnSegmentsToRender.map((segment, idx) => (
                        <TravelSegmentCard 
                          key={idx} 
                          segment={segment} 
                          travellers={travellers}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Helpful Information */}
            {(() => {
              const hasHelpfulInfoData = helpfulInformation && (
                helpfulInformation.localEmergency ||
                helpfulInformation.nearestEmbassy ||
                helpfulInformation.travelInsurance ||
                helpfulInformation.airlineCustomerService ||
                helpfulInformation.localMedicalClinic ||
                helpfulInformation.transportContacts ||
                customHelpfulFields.length > 0
              );

              return hasHelpfulInfoData && (
                <Card id="section-helpful">
                  <CardHeader>
                    <CardTitle className="text-2xl">Helpful Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {helpfulInformation.localEmergency && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Local Emergency</p>
                          <p className="text-sm">{helpfulInformation.localEmergency}</p>
                        </div>
                      )}
                      {helpfulInformation.nearestEmbassy && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Nearest Embassy</p>
                          <p className="text-sm">{helpfulInformation.nearestEmbassy}</p>
                        </div>
                      )}
                      {helpfulInformation.travelInsurance && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Travel Insurance</p>
                          <p className="text-sm">{helpfulInformation.travelInsurance}</p>
                        </div>
                      )}
                      {helpfulInformation.airlineCustomerService && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Airline Customer Service</p>
                          <p className="text-sm">{helpfulInformation.airlineCustomerService}</p>
                        </div>
                      )}
                      {helpfulInformation.localMedicalClinic && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Local Medical Clinic</p>
                          <p className="text-sm">{helpfulInformation.localMedicalClinic}</p>
                        </div>
                      )}
                      {helpfulInformation.transportContacts && (
                        <div className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">Transport Contacts</p>
                          <p className="text-sm">{helpfulInformation.transportContacts}</p>
                        </div>
                      )}
                      {customHelpfulFields.map((field, idx) => (
                        <div key={`helpful-custom-${idx}`} className="p-4 rounded-[12px] bg-white shadow-sm">
                          <p className="font-medium text-sm mb-1">{field.label}</p>
                          <p className="text-sm whitespace-pre-wrap">{field.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Footer - Assistant Info */}
            <div className="pt-8 border-t text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Prepared by <span className="font-semibold text-foreground">{itinerary.assistantName}</span>
              </p>
              <a
                href={`mailto:${itinerary.assistantEmail}`}
                className="block text-sm text-[#E07A5F] underline hover:opacity-80"
                data-testid="link-assistant-email"
              >
                {itinerary.assistantEmail}
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
