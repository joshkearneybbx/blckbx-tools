import { Pencil, MapPin, Users, Plane, Train, Car, Ship, Bus, Hotel, UtensilsCrossed, Martini, Calendar, AlertCircle } from "lucide-react";
import type { WizardData } from "@/pages/CreateItinerary";

type Props = {
  data: WizardData;
  setCurrentPage: (page: number) => void;
  onSave: (publish: boolean) => void;
  isSaving: boolean;
  projectType: 'itinerary' | 'list';
};

export default function Page9Review({ data, setCurrentPage, onSave, isSaving, projectType }: Props) {
  // Defensive checks: arrays might be undefined during initialization
  const safeDestinations = data.destinations || [];
  const safeTravellers = data.travellers || [];
  const safeAccommodations = data.accommodations || [];
  const safeActivities = data.activities || [];
  const safeDining = data.dining || [];
  const safeBars = data.bars || [];
  const safeOutboundTravel = data.outboundTravel;
  const safeReturnTravel = data.returnTravel;
  const safeHelpfulInformation = data.helpfulInformation || {};

  // Helper function to check if outbound travel has meaningful data
  const hasOutboundTravelData = () => {
    if (!safeOutboundTravel) return false;
    const travel = safeOutboundTravel;
    return !!(
      travel.flightNumber?.trim() ||
      travel.flightDate?.trim() ||
      travel.departureAirport?.trim() ||
      travel.arrivalAirport?.trim() ||
      travel.departureTime?.trim() ||
      travel.arrivalTime?.trim() ||
      travel.transferToAirportTaxiBooked === 1 ||
      travel.transferToAccomTaxiBooked === 1 ||
      (travel.isMultiLeg && travel.legs && travel.legs.length > 0)
    );
  };

  // Helper function to check if return travel has meaningful data
  const hasReturnTravelData = () => {
    if (!safeReturnTravel) return false;
    const travel = safeReturnTravel;
    return !!(
      travel.flightNumber?.trim() ||
      travel.flightDate?.trim() ||
      travel.departureAirport?.trim() ||
      travel.arrivalAirport?.trim() ||
      travel.departureTime?.trim() ||
      travel.arrivalTime?.trim() ||
      travel.transferHomeTaxiBooked === 1 ||
      (travel.isMultiLeg && travel.legs && travel.legs.length > 0)
    );
  };

  // Helper function to filter items by destination
  const getItemsForDestination = <T extends { destinationId?: string }>(
    items: T[],
    destinationName: string
  ): T[] => {
    return items.filter(item => item.destinationId === destinationName);
  };

  // Get travel icon based on type
  const getTravelIcon = (type: string) => {
    switch (type) {
      case 'flight': return Plane;
      case 'train': return Train;
      case 'car': return Car;
      case 'ferry': return Ship;
      case 'bus': return Bus;
      default: return Plane;
    }
  };

  // Check for warnings
  const warnings = [];
  if (safeDestinations.length === 0) {
    warnings.push("No destinations added");
  }
  if (safeDestinations.length > 0 && !data.title?.trim()) {
    warnings.push("No title set");
  }

  // Check if helpful info has content
  const hasHelpfulInfo = Object.values(safeHelpfulInformation).some(v => typeof v === 'string' && v.trim());

  // Section Card Component
  const SectionCard = ({
    title,
    editPage,
    children
  }: {
    title: string;
    editPage: number;
    children: React.ReactNode;
  }) => (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
      <div className="flex justify-between items-start mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button
          onClick={() => setCurrentPage(editPage)}
          className="text-sm text-[#E7C51C] hover:text-[#c9aa18] flex items-center gap-1.5 font-medium"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );

  // Label Component
  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1 font-medium">{children}</p>
  );

  // Value Component
  const Value = ({ children, secondary }: { children: React.ReactNode; secondary?: string }) => (
    <div>
      <p className="font-medium text-gray-900 dark:text-white">{children}</p>
      {secondary && <p className="text-sm text-gray-500 dark:text-gray-400">{secondary}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Review Your {projectType === 'list' ? 'List' : 'Itinerary'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Check everything looks correct before {projectType === 'list' ? 'saving' : 'publishing'}
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Please complete the following:</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details */}
      <SectionCard title="Trip Details" editPage={0}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <Label>Title</Label>
            <Value>{data.title || <span className="text-gray-400 italic">Not set</span>}</Value>
          </div>
          <div>
            <Label>Dates</Label>
            <Value>{data.dates || <span className="text-gray-400 italic">Not set</span>}</Value>
          </div>
          <div>
            <Label>Location</Label>
            <Value>{data.location || <span className="text-gray-400 italic">Not set</span>}</Value>
          </div>
          {safeDestinations[0]?.weather && (
            <div>
              <Label>Weather</Label>
              <Value>{safeDestinations[0].weather}</Value>
            </div>
          )}
          <div>
            <Label>Assistant</Label>
            <Value secondary={data.assistantEmail || undefined}>
              {data.assistantName || <span className="text-gray-400 italic">Not set</span>}
            </Value>
          </div>
        </div>
      </SectionCard>

      {/* Travellers */}
      {safeTravellers.length > 0 && (
        <SectionCard title={`Travellers (${safeTravellers.length})`} editPage={0}>
          <div className="flex flex-wrap gap-2">
            {safeTravellers.map((traveller, i) => {
              const isChild = traveller.type?.toLowerCase?.()?.includes?.('child') || false;
              return (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{traveller.name}</span>
                  <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-0.5 rounded-full font-bold">
                    {isChild
                      ? `Child${traveller.ageAtTravel != null && traveller.ageAtTravel > 0 ? ` (${traveller.ageAtTravel})` : ''}`
                      : 'Adult'
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Outbound Travel */}
      {hasOutboundTravelData() && (
        <SectionCard title="Outbound Travel" editPage={2}>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {safeOutboundTravel?.isMultiLeg && safeOutboundTravel.legs && safeOutboundTravel.legs.length > 1 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Connecting Flights</span>
                  <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-0.5 rounded-full font-bold">
                    {safeOutboundTravel.legs.length} legs
                  </span>
                </div>
                <div className="space-y-3 pl-7">
                  {safeOutboundTravel.legs.map((leg: any, index: number) => (
                    <div key={index} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{leg.departureAirport || 'TBC'}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium text-gray-900 dark:text-white">{leg.arrivalAirport || 'TBC'}</span>
                      </div>
                      {leg.flightNumber && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{leg.flightNumber}</span>
                      )}
                      <span className="text-sm text-gray-400">
                        {leg.departureTime || '--:--'} - {leg.arrivalTime || '--:--'}
                      </span>
                      {index < safeOutboundTravel.legs.length - 1 && leg.layoverDuration && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {leg.layoverDuration} layover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {safeOutboundTravel?.flightNumber || 'Flight'}
                  </span>
                  <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-0.5 rounded-full font-bold">
                    Direct
                  </span>
                </div>
                <div className="pl-7 text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{safeOutboundTravel?.departureAirport || 'TBC'}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900 dark:text-white">{safeOutboundTravel?.arrivalAirport || 'TBC'}</span>
                  <span className="ml-4 text-gray-400">
                    {safeOutboundTravel?.flightDate && `${safeOutboundTravel.flightDate} • `}
                    {safeOutboundTravel?.departureTime || '--:--'} - {safeOutboundTravel?.arrivalTime || '--:--'}
                  </span>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* Destinations */}
      {safeDestinations.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-12 mb-6 text-center">
          <MapPin className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No destinations added yet</p>
          <button
            onClick={() => setCurrentPage(1)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
          >
            Add Destinations
          </button>
        </div>
      ) : (
        safeDestinations.map((dest, destIndex) => {
          const accommodations = getItemsForDestination(safeAccommodations, dest.name);
          const activities = getItemsForDestination(safeActivities, dest.name);
          const dining = getItemsForDestination(safeDining, dest.name);
          const bars = getItemsForDestination(safeBars, dest.name);

          return (
            <SectionCard key={destIndex} title={dest.name} editPage={1}>
              {/* Destination meta */}
              {dest.dates && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-5 -mt-2">
                  <Calendar className="w-4 h-4" />
                  {dest.dates}
                </div>
              )}

              <div className="space-y-5">
                {/* Accommodation */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Hotel className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Accommodation {accommodations.length > 0 && `(${accommodations.length})`}
                    </p>
                    {accommodations.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">None added</p>
                    ) : (
                      <ul className="space-y-1 mt-1">
                        {accommodations.map((acc, i) => (
                          <li key={i}>
                            <p className="font-medium text-gray-900 dark:text-white">{acc.name}</p>
                            {acc.address && <p className="text-sm text-gray-500 dark:text-gray-400">{acc.address}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Activities */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Activities {activities.length > 0 && `(${activities.length})`}
                    </p>
                    {activities.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">None added</p>
                    ) : (
                      <ul className="space-y-1 mt-1">
                        {activities.map((act, i) => (
                          <li key={i} className="font-medium text-gray-900 dark:text-white">{act.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Dining */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Dining {dining.length > 0 && `(${dining.length})`}
                    </p>
                    {dining.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">None added</p>
                    ) : (
                      <ul className="space-y-1 mt-1">
                        {dining.map((d, i) => (
                          <li key={i} className="font-medium text-gray-900 dark:text-white">{d.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Bars */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Martini className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Bars {bars.length > 0 && `(${bars.length})`}
                    </p>
                    {bars.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">None added</p>
                    ) : (
                      <ul className="space-y-1 mt-1">
                        {bars.map((b, i) => (
                          <li key={i} className="font-medium text-gray-900 dark:text-white">{b.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          );
        })
      )}

      {/* Additional Travel */}
      {data.additionalTravel && data.additionalTravel.length > 0 && (
        <SectionCard title={`Additional Travel (${data.additionalTravel.length})`} editPage={2}>
          <div className="space-y-3">
            {[...data.additionalTravel]
              .sort((a: any, b: any) => {
                if (!a.date && !b.date) return 0;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(a.date).getTime() - new Date(b.date).getTime();
              })
              .map((segment: any, index: number) => {
                const segmentType = segment.type || segment.travelType || 'travel';
                const TravelIcon = getTravelIcon(segmentType);

                return (
                  <div key={segment.id || index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TravelIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {segmentType.replace(/_/g, ' ')}
                      </span>
                      {segment.date && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {segment.date}
                        </span>
                      )}
                    </div>
                    <div className="pl-6 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {segment.fromLocation || segment.flightDepartureAirport || segment.ferryDepartingFrom || segment.trainDepartingFrom || 'TBC'}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {segment.toLocation || segment.flightArrivalAirport || segment.ferryDestination || segment.trainDestination || 'TBC'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {/* Return Travel */}
      {hasReturnTravelData() && (
        <SectionCard title="Return Travel" editPage={7}>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {safeReturnTravel?.isMultiLeg && safeReturnTravel.legs && safeReturnTravel.legs.length > 1 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Plane className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
                  <span className="font-medium text-gray-900 dark:text-white">Connecting Flights</span>
                  <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-0.5 rounded-full font-bold">
                    {safeReturnTravel.legs.length} legs
                  </span>
                </div>
                <div className="space-y-3 pl-7">
                  {safeReturnTravel.legs.map((leg: any, index: number) => (
                    <div key={index} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{leg.departureAirport || 'TBC'}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium text-gray-900 dark:text-white">{leg.arrivalAirport || 'TBC'}</span>
                      </div>
                      {leg.flightNumber && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{leg.flightNumber}</span>
                      )}
                      <span className="text-sm text-gray-400">
                        {leg.departureTime || '--:--'} - {leg.arrivalTime || '--:--'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {safeReturnTravel?.flightNumber || 'Flight'}
                  </span>
                  <span className="text-xs bg-[#E7C51C] text-[#1a1a1a] px-2 py-0.5 rounded-full font-bold">
                    Direct
                  </span>
                </div>
                <div className="pl-7 text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{safeReturnTravel?.departureAirport || 'TBC'}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium text-gray-900 dark:text-white">{safeReturnTravel?.arrivalAirport || 'TBC'}</span>
                  <span className="ml-4 text-gray-400">
                    {safeReturnTravel?.flightDate && `${safeReturnTravel.flightDate} • `}
                    {safeReturnTravel?.departureTime || '--:--'} - {safeReturnTravel?.arrivalTime || '--:--'}
                  </span>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* Helpful Information */}
      {hasHelpfulInfo && (
        <SectionCard title="Helpful Information" editPage={8}>
          <div className="grid md:grid-cols-2 gap-4">
            {safeHelpfulInformation.localEmergency && (
              <div>
                <Label>Local Emergency Number</Label>
                <Value>{safeHelpfulInformation.localEmergency}</Value>
              </div>
            )}
            {safeHelpfulInformation.nearestEmbassy && (
              <div>
                <Label>Nearest Embassy/Consulate</Label>
                <Value>{safeHelpfulInformation.nearestEmbassy}</Value>
              </div>
            )}
            {safeHelpfulInformation.travelInsurance && (
              <div>
                <Label>Travel Insurance</Label>
                <Value>{safeHelpfulInformation.travelInsurance}</Value>
              </div>
            )}
            {safeHelpfulInformation.airlineCustomerService && (
              <div>
                <Label>Airline Customer Service</Label>
                <Value>{safeHelpfulInformation.airlineCustomerService}</Value>
              </div>
            )}
            {safeHelpfulInformation.localMedicalClinic && (
              <div>
                <Label>Local Medical Clinic</Label>
                <Value>{safeHelpfulInformation.localMedicalClinic}</Value>
              </div>
            )}
            {safeHelpfulInformation.transportContacts && (
              <div>
                <Label>Local Transport</Label>
                <Value>{safeHelpfulInformation.transportContacts}</Value>
              </div>
            )}
          </div>
        </SectionCard>
      )}

    </div>
  );
}
