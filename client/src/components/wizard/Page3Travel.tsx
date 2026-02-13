/**
 * Page3Travel - Travel details with new structured approach
 *
 * Supports:
 * - Connecting flights (multi-leg journeys)
 * - Multiple transfers to/from airports/stations
 * - Additional travel during the trip
 */

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plane, ArrowRight, Plus, MapPin } from "lucide-react";
import type { WizardData } from "@/pages/CreateItinerary";
import type {
  JourneyTravel,
  TransferSegment,
  MainTransport,
  AdditionalTravelSegment,
} from "@/lib/travel-types";
import {
  generateId,
  createEmptyMainTransport,
  createEmptyJourneyTravel,
  getTransferSectionLabel,
} from "@/lib/travel-types";
import {
  outboundToSegments,
  returnToSegments,
  segmentsToOutbound,
  segmentsToReturn,
} from "@/lib/travel-migration";
import {
  TransfersSection,
  MainTransportForm,
  AdditionalTravelCard,
  AddAdditionalTravelModal,
} from "./travel";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  isEditMode?: boolean;
  isLoadingEdit?: boolean;
};

const debugLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export default function Page3Travel({
  data,
  updateData,
  isEditMode = false,
  isLoadingEdit = false,
}: Props) {
  const isTransferType = (type: string): type is TransferSegment['type'] =>
    ['taxi', 'private_car', 'shuttle', 'bus', 'train', 'other'].includes(type);

  const safeDestinations = data.destinations || [];

  // State for the three tabs using the new JourneyTravel structure
  const [outbound, setOutbound] = useState<JourneyTravel>(createEmptyJourneyTravel());
  const [returnTravel, setReturnTravel] = useState<JourneyTravel>(createEmptyJourneyTravel());
  const [additionalTravel, setAdditionalTravel] = useState<AdditionalTravelSegment[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'outbound' | 'additional' | 'return'>('outbound');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<AdditionalTravelSegment | null>(null);

  // Track if data has been initialized from loaded data
  const initialized = useRef(false);
  // Track if we've loaded data (to prevent overwriting user edits)
  const hasLoadedData = useRef(false);

  // Initialize from wizard data when it becomes available
  // This handles both initial mount AND when data arrives from PocketBase in edit mode
  useEffect(() => {
    // In edit mode, wait until parent has finished fetching DB data
    // so we do not sync empty defaults back into parent state.
    if (isEditMode && isLoadingEdit) return;

    const outboundSegments =
      data.outboundJourney && data.outboundJourney.length > 0
        ? data.outboundJourney
        : outboundToSegments(data.outboundTravel);
    const returnSegments =
      data.returnJourney && data.returnJourney.length > 0
        ? data.returnJourney
        : returnToSegments(data.returnTravel);
    const hasOutboundData = outboundSegments.length > 0;
    const hasReturnData = returnSegments.length > 0;
    const hasAdditionalData = data.additionalTravel && Array.isArray(data.additionalTravel) && data.additionalTravel.length > 0;

    // If we've already loaded real data, don't overwrite user edits
    if (hasLoadedData.current) return;

    // If data is available, load it
    if (hasOutboundData || hasReturnData || hasAdditionalData) {
      debugLog('=== LOADING TRAVEL DATA INTO FORM ===');
      debugLog('outboundJourney:', data.outboundJourney);
      debugLog('returnJourney:', data.returnJourney);
      debugLog('additionalTravel:', data.additionalTravel);

      hasLoadedData.current = true;
      initialized.current = true;

      if (hasOutboundData) {
        const converted = convertSegmentsToJourney(outboundSegments);
        debugLog('Converted outbound:', converted);
        setOutbound(converted);
      }

      if (hasReturnData) {
        const converted = convertSegmentsToJourney(returnSegments);
        debugLog('Converted return:', converted);
        setReturnTravel(converted);
      }

      if (hasAdditionalData) {
        const converted = data.additionalTravel!.map((item: any) => {
          if (item.type && item.fromLocation !== undefined) {
            return item as AdditionalTravelSegment;
          }
          return convertLegacyAdditional(item);
        });
        setAdditionalTravel(converted);
      }
    } else {
      // No data to load, mark as initialized so sync effects can run
      initialized.current = true;
    }
  }, [data.outboundJourney, data.returnJourney, data.additionalTravel, data.outboundTravel, data.returnTravel, isEditMode, isLoadingEdit]);

  // Sync outbound changes back to wizard data
  useEffect(() => {
    if (!initialized.current) return;
    const segments = convertJourneyToSegments(outbound);

    // Update legacy format for PocketBase saving (synchronously)
    const legacy = segmentsToOutbound(segments);

    debugLog('=== OUTBOUND SYNC ===');
    debugLog('Segments:', segments);
    debugLog('Legacy format:', legacy);

    // Update both formats together
    updateData({
      outboundJourney: segments,
      outboundTravel: legacy
    });
  }, [outbound]);

  // Sync return changes back to wizard data
  useEffect(() => {
    if (!initialized.current) return;
    const segments = convertJourneyToSegments(returnTravel);

    // Update legacy format for PocketBase saving (synchronously)
    const legacy = segmentsToReturn(segments);

    debugLog('=== RETURN SYNC ===');
    debugLog('Segments:', segments);
    debugLog('Legacy format:', legacy);

    // Update both formats together
    updateData({
      returnJourney: segments,
      returnTravel: legacy
    });
  }, [returnTravel]);

  // Sync additional travel changes
  useEffect(() => {
    if (!initialized.current) return;
    updateData({ additionalTravel: additionalTravel as any });
  }, [additionalTravel]);

  // Convert segment array to JourneyTravel structure
  const convertSegmentsToJourney = (segments: any[]): JourneyTravel => {
    debugLog('=== convertSegmentsToJourney INPUT ===');
    debugLog('Input segments count:', segments?.length);
    debugLog('Input segments:', JSON.stringify(segments, null, 2));

    const result: JourneyTravel = {
      transfersTo: [],
      mainTransport: undefined,
      transfersFrom: [],
    };

    const mainTypes = ['flight', 'train', 'bus', 'ferry', 'other'];
    const explicitMainSegments = segments.filter((s) => s.role === 'main');
    const flightSegments = segments.filter((s) => s.type === 'flight');
    const mainSegments =
      explicitMainSegments.length > 0
        ? explicitMainSegments
        : (flightSegments.length > 0
          ? flightSegments
          : segments.filter((s) => mainTypes.includes(s.type) && !['taxi', 'private_car', 'shuttle'].includes(s.type)));

    debugLog('Main segments found:', mainSegments.length);
    debugLog('Main segments:', JSON.stringify(mainSegments, null, 2));

    if (mainSegments.length > 0) {
      const firstMain = mainSegments[0];
      const isMultiLeg = mainSegments.length > 1;
      const isFlight = firstMain.type === 'flight';

      debugLog('isMultiLeg detected:', isMultiLeg);
      debugLog('isFlight:', isFlight);

      // Build legs from all main segments of the same type
      const legs = mainSegments
        .filter(s => s.type === firstMain.type)
        .map((seg, idx) => ({
          id: seg.id || generateId(),
          legNumber: idx + 1,
          flightNumber: seg.flightNumber,
          airline: seg.airline,
          departureAirport: isFlight ? seg.fromLocation : undefined,
          arrivalAirport: isFlight ? seg.toLocation : undefined,
          departureStation: !isFlight ? seg.fromLocation : undefined,
          arrivalStation: !isFlight ? seg.toLocation : undefined,
          company: seg.company,
          departureTime: seg.departureTime || '',
          arrivalTime: seg.arrivalTime || '',
        }));

      debugLog('Built legs:', JSON.stringify(legs, null, 2));

      result.mainTransport = {
        id: firstMain.id || generateId(),
        type: firstMain.type,
        date: firstMain.date || '',
        isConnecting: isMultiLeg,
        legs: legs,
        passengersAndSeats: firstMain.confirmationNumber,
        bookingReference: firstMain.bookingReference,
        contact: firstMain.contactDetails,
        notes: firstMain.notes,
      };

      debugLog('Result mainTransport:', JSON.stringify(result.mainTransport, null, 2));
    } else {
      result.mainTransport = createEmptyMainTransport();
    }

    // Find transfer segments (taxis and trains used as transfers, not main transport)
    // Transfers are taxi type or train type that appear before/after the main transport
    const firstMainIndex = mainSegments.length > 0 ? segments.indexOf(mainSegments[0]) : -1;
    const lastMainIndex = mainSegments.length > 0 ? segments.indexOf(mainSegments[mainSegments.length - 1]) : -1;

    // Get transfer-type segments that aren't part of main transport
    const transferSegments = segments.filter((s) => {
      if (s.role === 'transfer') return true;
      if (s.role === 'main') return false;
      if (['taxi', 'private_car', 'shuttle', 'bus', 'other'].includes(s.type)) return true;
      // Train could be a transfer or main transport
      if (s.type === 'train' && !mainSegments.includes(s)) return true;
      return false;
    });

    transferSegments.forEach((seg, idx) => {
      const transfer: TransferSegment = {
        id: seg.id || generateId(),
        order: idx,
        type: isTransferType(seg.type) ? seg.type : 'taxi',
        pickupLocation: seg.fromLocation || '',
        pickupTime: seg.departureTime || '',
        dropoffLocation: seg.toLocation || '',
        company: seg.company,
        contact: seg.contactDetails,
        vehicleRegistration: seg.confirmationNumber,
        bookingReference: seg.bookingReference,
        price: seg.price,
        notes: seg.notes,
      };

      // Determine if this is a "to" or "from" transfer based on position
      const segIndex = segments.indexOf(seg);
      if (firstMainIndex === -1 || segIndex < firstMainIndex) {
        result.transfersTo.push(transfer);
      } else if (lastMainIndex === -1 || segIndex > lastMainIndex) {
        result.transfersFrom.push(transfer);
      }
    });

    return result;
  };

  // Convert JourneyTravel structure to segment array
  const convertJourneyToSegments = (journey: JourneyTravel): any[] => {
    const segments: any[] = [];

    // Add transfers to
    journey.transfersTo
      .sort((a, b) => a.order - b.order)
      .forEach((transfer) => {
        segments.push({
          id: transfer.id,
          role: 'transfer',
          type: transfer.type,
          fromLocation: transfer.pickupLocation,
          toLocation: transfer.dropoffLocation,
          date: journey.mainTransport?.date || '',
          departureTime: transfer.pickupTime,
          company: transfer.company,
          contactDetails: transfer.contact,
          confirmationNumber: transfer.vehicleRegistration,
          bookingReference: transfer.bookingReference,
          price: transfer.price,
          notes: transfer.notes,
        });
      });

    // Add main transport - one segment per leg for multi-leg journeys
    if (journey.mainTransport) {
      const mt = journey.mainTransport;
      const isFlight = mt.type === 'flight';

      // For multi-leg/connecting journeys, create a segment for each leg
      // This is needed for proper round-trip with segmentsToOutbound/segmentsToReturn
      mt.legs.forEach((leg, idx) => {
        segments.push({
          id: leg.id || generateId(),
          role: 'main',
          type: mt.type,
          date: mt.date,
          fromLocation: isFlight ? leg.departureAirport : leg.departureStation,
          toLocation: isFlight ? leg.arrivalAirport : leg.arrivalStation,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
          flightNumber: leg.flightNumber,
          airline: leg.airline,
          company: leg.company,
          // Only include booking/notes on first leg to avoid duplication
          confirmationNumber: idx === 0 ? mt.passengersAndSeats : undefined,
          bookingReference: idx === 0 ? mt.bookingReference : undefined,
          contactDetails: idx === 0 ? mt.contact : undefined,
          notes: idx === 0 ? mt.notes : undefined,
        });
      });
    }

    // Add transfers from
    journey.transfersFrom
      .sort((a, b) => a.order - b.order)
      .forEach((transfer) => {
        segments.push({
          id: transfer.id,
          role: 'transfer',
          type: transfer.type,
          fromLocation: transfer.pickupLocation,
          toLocation: transfer.dropoffLocation,
          date: journey.mainTransport?.date || '',
          departureTime: transfer.pickupTime,
          company: transfer.company,
          contactDetails: transfer.contact,
          confirmationNumber: transfer.vehicleRegistration,
          bookingReference: transfer.bookingReference,
          price: transfer.price,
          notes: transfer.notes,
        });
      });

    return segments;
  };

  // Convert legacy additional travel format
  const convertLegacyAdditional = (item: any): AdditionalTravelSegment => {
    return {
      id: generateId(),
      type: item.travelType || 'flight',
      date: item.flightDate || item.ferryDate || item.trainDate || '',
      fromLocation:
        item.flightDepartureAirport ||
        item.ferryDepartingFrom ||
        item.trainDepartingFrom ||
        '',
      toLocation:
        item.flightArrivalAirport ||
        item.ferryDestination ||
        item.trainDestination ||
        '',
      departureTime: item.flightDepartureTime || '',
      arrivalTime: item.flightArrivalTime || '',
      company: item.ferryContactDetails || item.trainContactDetails || '',
      bookingReference:
        item.ferryBookingReference || item.trainBookingReference || '',
      notes:
        item.flightThingsToRemember ||
        item.ferryAdditionalNotes ||
        item.trainAdditionalNotes ||
        '',
    };
  };

  // Handlers for outbound
  const handleOutboundTransfersToChange = (transfers: TransferSegment[]) => {
    setOutbound((prev) => ({ ...prev, transfersTo: transfers }));
  };

  const handleOutboundMainChange = (transport: MainTransport) => {
    setOutbound((prev) => ({ ...prev, mainTransport: transport }));
  };

  const handleOutboundTransfersFromChange = (transfers: TransferSegment[]) => {
    setOutbound((prev) => ({ ...prev, transfersFrom: transfers }));
  };

  // Handlers for return
  const handleReturnTransfersToChange = (transfers: TransferSegment[]) => {
    setReturnTravel((prev) => ({ ...prev, transfersTo: transfers }));
  };

  const handleReturnMainChange = (transport: MainTransport) => {
    setReturnTravel((prev) => ({ ...prev, mainTransport: transport }));
  };

  const handleReturnTransfersFromChange = (transfers: TransferSegment[]) => {
    setReturnTravel((prev) => ({ ...prev, transfersFrom: transfers }));
  };

  // Additional travel handlers
  const handleAddAdditional = (segment: AdditionalTravelSegment) => {
    if (editingSegment) {
      setAdditionalTravel((prev) =>
        prev.map((s) => (s.id === segment.id ? segment : s))
      );
    } else {
      setAdditionalTravel((prev) => [...prev, segment]);
    }
    setEditingSegment(null);
  };

  const handleEditAdditional = (segment: AdditionalTravelSegment) => {
    setEditingSegment(segment);
    setShowAddModal(true);
  };

  const handleRemoveAdditional = (id: string) => {
    setAdditionalTravel((prev) => prev.filter((s) => s.id !== id));
  };

  // Sort additional travel by date
  const sortedAdditionalTravel = [...additionalTravel].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Get destination name by ID
  const getDestinationName = (id?: string) => {
    if (!id) return undefined;
    const dest = safeDestinations.find((d: any) => d.id === id || d.name === id);
    return dest?.name;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Travel Details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add travel details for your trip including outbound, additional travel, and return journeys.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outbound">
            <Plane className="w-4 h-4 mr-2" />
            Outbound
          </TabsTrigger>
          <TabsTrigger value="additional">
            <ArrowRight className="w-4 h-4 mr-2" />
            Additional Travel
          </TabsTrigger>
          <TabsTrigger value="return">
            <Plane className="w-4 h-4 mr-2 rotate-180" />
            Return
          </TabsTrigger>
        </TabsList>

        {/* Outbound Tab */}
        <TabsContent value="outbound" className="space-y-4 mt-6">
          <div>
            <h4 className="font-semibold text-base">Outbound Journey</h4>
            <p className="text-sm text-muted-foreground">
              Travel from home to your first destination
            </p>
          </div>

          <div className="space-y-4">
            {/* Transfers To */}
            <TransfersSection
              title={getTransferSectionLabel(outbound.mainTransport?.type || 'flight', 'to')}
              transfers={outbound.transfersTo}
              onChange={handleOutboundTransfersToChange}
            />

            {/* Main Transport */}
            <MainTransportForm
              transport={outbound.mainTransport}
              onChange={handleOutboundMainChange}
            />

            {/* Transfers From */}
            <TransfersSection
              title={getTransferSectionLabel(outbound.mainTransport?.type || 'flight', 'from')}
              transfers={outbound.transfersFrom}
              onChange={handleOutboundTransfersFromChange}
            />
          </div>
        </TabsContent>

        {/* Additional Travel Tab */}
        <TabsContent value="additional" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-base">Additional Travel</h4>
              <p className="text-sm text-muted-foreground">
                Add any travel during your trip (internal flights, trains, ferries, day trips, etc.)
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingSegment(null);
                setShowAddModal(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Travel
            </Button>
          </div>

          {sortedAdditionalTravel.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">No additional travel added</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Add Travel" to add travel segments during your trip
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAdditionalTravel.map((segment) => (
                <AdditionalTravelCard
                  key={segment.id}
                  segment={segment}
                  destinationName={getDestinationName(segment.destinationId)}
                  onEdit={() => handleEditAdditional(segment)}
                  onRemove={() => handleRemoveAdditional(segment.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Return Tab */}
        <TabsContent value="return" className="space-y-4 mt-6">
          <div>
            <h4 className="font-semibold text-base">Return Journey</h4>
            <p className="text-sm text-muted-foreground">
              Travel from your last destination back home
            </p>
          </div>

          <div className="space-y-4">
            {/* Transfers To */}
            <TransfersSection
              title={getTransferSectionLabel(returnTravel.mainTransport?.type || 'flight', 'to')}
              transfers={returnTravel.transfersTo}
              onChange={handleReturnTransfersToChange}
            />

            {/* Main Transport */}
            <MainTransportForm
              transport={returnTravel.mainTransport}
              onChange={handleReturnMainChange}
            />

            {/* Transfers From */}
            <TransfersSection
              title={getTransferSectionLabel(returnTravel.mainTransport?.type || 'flight', 'from')}
              transfers={returnTravel.transfersFrom}
              onChange={handleReturnTransfersFromChange}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Additional Travel Modal */}
      <AddAdditionalTravelModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSegment(null);
        }}
        onSave={handleAddAdditional}
        editSegment={editingSegment}
        destinations={safeDestinations.map((d: any) => ({
          id: d.id || d.name,
          name: d.name,
        }))}
      />
    </div>
  );
}
