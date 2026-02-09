import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, Lock, GripVertical, Hotel, MapPin, UtensilsCrossed, Martini } from "lucide-react";
import type { FullItinerary, AdditionalTravel } from "@shared/schema";
import { collectLocationsFromItinerary } from "@/lib/collectLocations";
import logoUrl from "@assets/blckbx-logo.png";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/hooks/useAuth";
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

// Generic Sortable Item Card component
interface SortableItemProps<T> {
  item: T;
  index: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SortableItemCard<T extends { id: string }>({ item, index, icon, children }: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'shadow-xl ring-2 ring-[#E7C51C]' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:opacity-70 transition-opacity p-1 -m-1"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            {icon}
            <CardTitle className="text-base">
              {item.name || `Item ${index + 1}`}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}

// Sortable Additional Travel Item (with type-specific display)
function SortableAdditionalTravelCard({
  travel,
}: {
  travel: AdditionalTravel;
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
  };

  const getTravelIcon = () => {
    switch (travel.travelType) {
      case 'flight': return <MapPin className="w-4 h-4" />;
      case 'train': return <MapPin className="w-4 h-4" />;
      case 'car': return <MapPin className="w-4 h-4" />;
      case 'ferry': return <MapPin className="w-4 h-4" />;
      case 'bus': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'shadow-xl ring-2 ring-[#E7C51C]' : ''}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="flex flex-col gap-1 cursor-grab active:cursor-grabbing hover:opacity-70 transition-opacity p-1 -m-1"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            {getTravelIcon()}
            <CardTitle className="text-base">
              {travel.travelType.charAt(0).toUpperCase() + travel.travelType.slice(1)}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="space-y-2">
          {travel.travelType === 'car' && (
            <>
              {travel.vehicleDetails && <p><strong>Vehicle:</strong> {travel.vehicleDetails}</p>}
              {travel.vehicleRegistration && <p><strong>Registration:</strong> {travel.vehicleRegistration}</p>}
              {travel.carContactDetails && <p><strong>Contact:</strong> {travel.carContactDetails}</p>}
            </>
          )}
          {travel.travelType === 'flight' && (
            <>
              {travel.flightNumber && <p><strong>Flight Number:</strong> {travel.flightNumber}</p>}
              {travel.flightDate && <p><strong>Date:</strong> {travel.flightDate}</p>}
              {(travel.flightDepartureAirport || travel.flightDepartureTime) && (
                <p><strong>Departure:</strong> {travel.flightDepartureAirport} {travel.flightDepartureTime && `at ${travel.flightDepartureTime}`}</p>
              )}
              {(travel.flightArrivalAirport || travel.flightArrivalTime) && (
                <p><strong>Arrival:</strong> {travel.flightArrivalAirport} {travel.flightArrivalTime && `at ${travel.flightArrivalTime}`}</p>
              )}
            </>
          )}
          {travel.travelType === 'ferry' && (
            <>
              {travel.ferryDepartingFrom && <p><strong>From:</strong> {travel.ferryDepartingFrom}</p>}
              {travel.ferryDestination && <p><strong>To:</strong> {travel.ferryDestination}</p>}
              {travel.ferryDate && <p><strong>Date:</strong> {travel.ferryDate}</p>}
              {travel.ferryPrice && <p><strong>Price:</strong> {travel.ferryPrice}</p>}
            </>
          )}
          {travel.travelType === 'train' && (
            <>
              {travel.trainDepartingFrom && <p><strong>From:</strong> {travel.trainDepartingFrom}</p>}
              {travel.trainDestination && <p><strong>To:</strong> {travel.trainDestination}</p>}
              {travel.trainDate && <p><strong>Date:</strong> {travel.trainDate}</p>}
              {travel.trainPrice && <p><strong>Price:</strong> {travel.trainPrice}</p>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type SectionConfig = {
  id: string;
  type: string;
  title: string;
  order: number;
  content: React.ReactNode;
};

const FIXED_SECTION_ORDER: Record<string, number> = {
  'travellers': 10,
  'outboundTravel': 20,
  'accommodation': 30,
  'activity': 40,
  'dining': 50,
  'additionalTravel': 60,
  'returnTravel': 70,
  'helpfulInformation': 80,
  'locationOverview': 90,
};

export default function PreviewArrange() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Store items separately for drag-and-drop
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [dining, setDining] = useState<any[]>([]);
  const [bars, setBars] = useState<any[]>([]);
  const [additionalTravelItems, setAdditionalTravelItems] = useState<AdditionalTravel[]>([]);

  // Static sections (no drag)
  const [staticSections, setStaticSections] = useState<SectionConfig[]>([]);

  // Set up sensors for drag detection with activation constraint
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

  // Handle drag end for accommodations
  const handleAccommodationsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAccommodations((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update displayOrder values
        return reordered.map((item, idx) => ({ ...item, displayOrder: idx }));
      });
    }
  };

  // Handle drag end for activities
  const handleActivitiesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setActivities((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update displayOrder values
        return reordered.map((item, idx) => ({ ...item, displayOrder: idx }));
      });
    }
  };

  // Handle drag end for dining
  const handleDiningDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setDining((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update displayOrder values
        return reordered.map((item, idx) => ({ ...item, displayOrder: idx }));
      });
    }
  };

  // Handle drag end for bars
  const handleBarsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBars((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update displayOrder values
        return reordered.map((item, idx) => ({ ...item, displayOrder: idx }));
      });
    }
  };

  // Handle drag end for additional travel
  const handleAdditionalTravelDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAdditionalTravelItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update displayOrder values
        return reordered.map((item, idx) => ({ ...item, displayOrder: idx }));
      });
    }
  };

  const { data: itinerary, isLoading, error } = useQuery<FullItinerary>({
    queryKey: ['project', id, isAuthenticated],
    queryFn: async () => {
      if (!id) throw new Error('No project ID provided');

      console.log('=== PREVIEW FETCH START ===');
      console.log('Fetching project...', { id, isAuthenticated, userId: pb.authStore.model?.id });

      try {
        const project = await pb.collection('blckbx_projects').getOne(id);

        console.log('Project fetched successfully:', {
          id: project.id,
          name: project.name,
          status: project.status,
          user: project.user,
          customUrlSlug: project.customUrlSlug
        });

        if (project.status === 'draft' && project.user !== pb.authStore.model?.id) {
          console.error('Permission denied: draft owned by', project.user, 'but user is', pb.authStore.model?.id);
          throw new Error('You do not have permission to view this draft');
        }

        // Fetch all related data in parallel
        const [travellers, fetchedAccommodations, fetchedActivities, fetchedDining, fetchedBars, outboundTravel, returnTravel, helpfulInformation] = await Promise.all([
          pb.collection('blckbx_travellers').getFullList({
            filter: `project = "${id}"`,
            sort: 'displayOrder'
          }),
          pb.collection('blckbx_accommodations').getFullList({
            filter: `project = "${id}"`,
            sort: 'displayOrder'
          }),
          pb.collection('blckbx_activities').getFullList({
            filter: `project = "${id}"`,
            sort: 'displayOrder'
          }),
          pb.collection('blckbx_dining').getFullList({
            filter: `project = "${id}"`,
            sort: 'displayOrder'
          }),
          pb.collection('blckbx_bars').getFullList({
            filter: `project = "${id}"`,
            sort: 'displayOrder'
          }),
          pb.collection('blckbx_outbound_travel').getFirstListItem(`project = "${id}"`).catch(() => null),
          pb.collection('blckbx_return_travel').getFirstListItem(`project = "${id}"`).catch(() => null),
          pb.collection('blckbx_helpful_information').getFirstListItem(`project = "${id}"`).catch(() => null),
        ]);

        console.log('Related collections fetched:', {
          travellers: travellers.length,
          accommodations: fetchedAccommodations.length,
          activities: fetchedActivities.length,
          dining: fetchedDining.length,
          bars: fetchedBars.length,
          outboundTravel: outboundTravel ? 'found' : 'none',
          returnTravel: returnTravel ? 'found' : 'none',
          helpfulInformation: helpfulInformation ? 'found' : 'none'
        });

        const result = {
          itinerary: project,
          travelDetails: null,
          travellers,
          accommodations: fetchedAccommodations,
          activities: fetchedActivities,
          dining: fetchedDining,
          bars: fetchedBars,
          additionalTravel: [],
          outboundTravel,
          returnTravel,
          helpfulInformation,
          customSectionItems: [],
        };

        console.log('=== PREVIEW FETCH COMPLETE ===');
        return result;
      } catch (err: any) {
        console.error('=== PREVIEW FETCH ERROR ===');
        console.error('Error type:', err.constructor.name);
        console.error('Error message:', err.message);
        console.error('Error status:', err.status);
        console.error('Full error:', err);
        throw err;
      }
    },
    enabled: !!id && !authLoading,
    retry: (failureCount, error) => {
      const err = error as any;
      if (err?.status === 401 || err?.status === 403 || err?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Initialize state when itinerary data is loaded
  useEffect(() => {
    if (itinerary) {
      // Set draggable items
      setAccommodations(itinerary.accommodations || []);
      setActivities(itinerary.activities || []);
      setDining(itinerary.dining || []);
      setBars(itinerary.bars || []);
      setAdditionalTravelItems(itinerary.additionalTravel || []);

      // Build static sections (non-draggable)
      const initialSections: SectionConfig[] = [];

      if (itinerary?.travellers?.length > 0) {
        initialSections.push({
          id: 'travellers',
          type: 'travellers',
          title: 'Travellers',
          order: FIXED_SECTION_ORDER.travellers,
          content: (
            <div className="space-y-2">
              {itinerary.travellers.map((traveller, idx) => (
                <p key={idx}>{traveller.name} ({traveller.type === 'adult' ? 'Adult' : 'Child'}{traveller.ageAtTravel ? `, Age: ${traveller.ageAtTravel}` : ''})</p>
              ))}
            </div>
          ),
        });
      }

      if (itinerary.outboundTravel) {
        const ob = itinerary.outboundTravel;
        initialSections.push({
          id: 'outbound-travel',
          type: 'outboundTravel',
          title: 'Outbound Travel',
          order: FIXED_SECTION_ORDER.outboundTravel,
          content: (
            <div className="space-y-3">
              {ob.transferToAirportCompany && (
                <div>
                  <p className="font-semibold">Transfer to Airport</p>
                  <p>{ob.transferToAirportCompany} - {ob.transferToAirportContact}</p>
                  <p>Collection: {ob.transferToAirportCollectionTime}</p>
                </div>
              )}
              {ob.flightNumber && (
                <div>
                  <p className="font-semibold">Flight</p>
                  <p>{ob.flightNumber}: {ob.departureAirport} {ob.departureTime && `at ${ob.departureTime}`} → {ob.arrivalAirport} {ob.arrivalTime && `at ${ob.arrivalTime}`}</p>
                </div>
              )}
              {ob.transferToAccomCompany && (
                <div>
                  <p className="font-semibold">Transfer to Accommodation</p>
                  <p>{ob.transferToAccomCompany}</p>
                </div>
              )}
            </div>
          ),
        });
      }

      if (itinerary.returnTravel) {
        const rt = itinerary.returnTravel;
        initialSections.push({
          id: 'return-travel',
          type: 'returnTravel',
          title: 'Return Travel',
          order: FIXED_SECTION_ORDER.returnTravel,
          content: (
            <div className="space-y-3">
              {rt.transferToAirportCompany && (
                <div>
                  <p className="font-semibold">Transfer to Airport</p>
                  <p>{rt.transferToAirportCompany} - {rt.transferToAirportContact}</p>
                  <p>Collection: {rt.transferToAirportCollectionTime}</p>
                </div>
              )}
              {rt.flightNumber && (
                <div>
                  <p className="font-semibold">Return Flight</p>
                  <p>{rt.flightNumber}: {rt.departureAirport} {rt.departureTime && `at ${rt.departureTime}`} → {rt.arrivalAirport} {rt.arrivalTime && `at ${rt.arrivalTime}`}</p>
                </div>
              )}
              {rt.transferHomeCompany && (
                <div>
                  <p className="font-semibold">Transfer Home</p>
                  <p>{rt.transferHomeCompany}</p>
                </div>
              )}
            </div>
          ),
        });
      }

      if (itinerary.helpfulInformation) {
        const info = itinerary.helpfulInformation;
        initialSections.push({
          id: 'helpful-information',
          type: 'helpfulInformation',
          title: 'Helpful Information',
          order: FIXED_SECTION_ORDER.helpfulInformation,
          content: (
            <div className="space-y-2">
              {info.localEmergency && <p><strong>Local Emergency:</strong> {info.localEmergency}</p>}
              {info.nearestEmbassy && <p><strong>Nearest Embassy:</strong> {info.nearestEmbassy}</p>}
              {info.travelInsurance && <p><strong>Travel Insurance:</strong> {info.travelInsurance}</p>}
              {info.airlineCustomerService && <p><strong>Airline Customer Service:</strong> {info.airlineCustomerService}</p>}
            </div>
          ),
        });
      }

      const mapLocations = collectLocationsFromItinerary(itinerary);
      if (mapLocations.length > 0) {
        initialSections.push({
          id: 'location-overview',
          type: 'locationOverview',
          title: 'Location Overview',
          order: FIXED_SECTION_ORDER.locationOverview,
          content: (
            <div className="space-y-2">
              <p>Interactive map showing {mapLocations.length} location{mapLocations.length !== 1 ? 's' : ''} from your itinerary:</p>
              <ul className="list-disc list-inside space-y-1">
                {itinerary.accommodations && itinerary.accommodations.length > 0 && (
                  <li>{itinerary.accommodations.length} Accommodation{itinerary.accommodations.length !== 1 ? 's' : ''}</li>
                )}
                {itinerary.activities && itinerary.activities.length > 0 && (
                  <li>{itinerary.activities.length} Activit{itinerary.activities.length !== 1 ? 'ies' : 'y'}</li>
                )}
                {itinerary.dining && itinerary.dining.length > 0 && (
                  <li>{itinerary.dining.length} Dining Location{itinerary.dining.length !== 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>
          ),
        });
      }

      initialSections.sort((a, b) => a.order - b.order);
      setStaticSections(initialSections);
    }
  }, [itinerary]);

  const handlePublish = async () => {
    if (!id) return;

    try {
      // Save reordered items with new displayOrder values
      const updatePromises = [];

      // Update accommodations
      for (let i = 0; i < accommodations.length; i++) {
        const acc = accommodations[i];
        if (acc.displayOrder !== i) {
          updatePromises.push(
            pb.collection('blckbx_accommodations').update(acc.id, { displayOrder: i })
          );
        }
      }

      // Update activities
      for (let i = 0; i < activities.length; i++) {
        const act = activities[i];
        if (act.displayOrder !== i) {
          updatePromises.push(
            pb.collection('blckbx_activities').update(act.id, { displayOrder: i })
          );
        }
      }

      // Update dining
      for (let i = 0; i < dining.length; i++) {
        const din = dining[i];
        if (din.displayOrder !== i) {
          updatePromises.push(
            pb.collection('blckbx_dining').update(din.id, { displayOrder: i })
          );
        }
      }

      // Update bars
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (bar.displayOrder !== i) {
          updatePromises.push(
            pb.collection('blckbx_bars').update(bar.id, { displayOrder: i })
          );
        }
      }

      // Update additional travel
      for (let i = 0; i < additionalTravelItems.length; i++) {
        const travel = additionalTravelItems[i];
        if (travel.displayOrder !== i) {
          updatePromises.push(
            pb.collection('blckbx_inter_destination_travel').update(travel.id, { displayOrder: i })
          );
        }
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Publish the project
      const updatedProject = await pb.collection('blckbx_projects').update(id, {
        status: 'published',
      });

      setLocation(`/itinerary/${updatedProject.customUrlSlug}`);
    } catch (error) {
      console.error("Error publishing itinerary:", error);
      alert("Failed to publish itinerary. Please try again.");
    }
  };

  const handleBackToEdit = () => {
    setLocation(`/itinerary/edit/${id}`);
  };

  // Show loading while auth is being resolved
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading itinerary...</p>
      </div>
    );
  }

  // Handle authentication/authorization errors
  if (error) {
    const err = error as any;
    console.error('PreviewArrange error:', err);

    if (err.message?.includes('permission') || err.status === 403) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              You don't have permission to view this draft itinerary.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setLocation('/itinerary')}>
                Go to Dashboard
              </Button>
              <Button onClick={() => setLocation('/login')}>
                Login
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Itinerary Not Found</h1>
          <p className="text-muted-foreground">
            {err.message || 'This itinerary may have been deleted or you may not have access to it.'}
          </p>
          <Button onClick={() => setLocation('/itinerary')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!itinerary || !itinerary.itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Itinerary not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <Link href="/itinerary">
            <img
              src={logoUrl}
              alt="BlckBx"
              className="h-12 w-auto cursor-pointer hover-elevate active-elevate-2 rounded p-1"
              data-testid="img-logo"
            />
          </Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{itinerary.itinerary?.name || 'Itinerary'}</h1>
          <p className="text-muted-foreground">Drag items to reorder them in your itinerary</p>
        </div>

        <div className="space-y-6 mb-8">
          {/* Static Sections (Travellers, Outbound Travel, etc.) */}
          {staticSections.map((section) => (
            <Card key={section.id} data-testid={`section-${section.type}`}>
              <CardHeader className="pb-3">
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {section.content}
              </CardContent>
            </Card>
          ))}

          {/* Accommodations - Draggable */}
          {accommodations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Hotel className="w-5 h-5" />
                Accommodations ({accommodations.length})
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAccommodationsDragEnd}
              >
                <SortableContext
                  items={accommodations.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {accommodations.map((acc) => (
                      <SortableItemCard
                        key={acc.id}
                        item={acc}
                        index={accommodations.indexOf(acc)}
                        icon={<Hotel className="w-4 h-4 text-muted-foreground" />}
                      >
                        <div className="space-y-2">
                          {acc.address && <p><strong>Address:</strong> {acc.address}</p>}
                          {acc.checkInDetails && <p><strong>Check-in Details:</strong> {acc.checkInDetails}</p>}
                          {acc.googleMapsLink && (
                            <p><a href={acc.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View on Google Maps</a></p>
                          )}
                        </div>
                      </SortableItemCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Activities - Draggable */}
          {activities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Activities ({activities.length})
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleActivitiesDragEnd}
              >
                <SortableContext
                  items={activities.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <SortableItemCard
                        key={activity.id}
                        item={activity}
                        index={activities.indexOf(activity)}
                        icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                      >
                        <div className="space-y-2">
                          {activity.description && <p>{activity.description}</p>}
                          {activity.price && <p><strong>Price:</strong> {activity.price}</p>}
                        </div>
                      </SortableItemCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Dining - Draggable */}
          {dining.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5" />
                Restaurants ({dining.length})
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDiningDragEnd}
              >
                <SortableContext
                  items={dining.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {dining.map((restaurant) => (
                      <SortableItemCard
                        key={restaurant.id}
                        item={restaurant}
                        index={dining.indexOf(restaurant)}
                        icon={<UtensilsCrossed className="w-4 h-4 text-muted-foreground" />}
                      >
                        <div className="space-y-2">
                          {restaurant.cuisineType && <p><strong>Cuisine:</strong> {restaurant.cuisineType}</p>}
                          {restaurant.priceRange && <p><strong>Price:</strong> {restaurant.priceRange}</p>}
                        </div>
                      </SortableItemCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Bars - Draggable */}
          {bars.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Martini className="w-5 h-5" />
                Bars ({bars.length})
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBarsDragEnd}
              >
                <SortableContext
                  items={bars.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {bars.map((bar) => (
                      <SortableItemCard
                        key={bar.id}
                        item={bar}
                        index={bars.indexOf(bar)}
                        icon={<Martini className="w-4 h-4 text-muted-foreground" />}
                      >
                        <div className="space-y-2">
                          {bar.barType && <p><strong>Type:</strong> {bar.barType}</p>}
                          {bar.priceRange && <p><strong>Price:</strong> {bar.priceRange}</p>}
                        </div>
                      </SortableItemCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Additional Travel - Draggable */}
          {additionalTravelItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Inter-Destination Travel ({additionalTravelItems.length})
              </h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAdditionalTravelDragEnd}
              >
                <SortableContext
                  items={additionalTravelItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {additionalTravelItems.map((travel) => (
                      <SortableAdditionalTravelCard
                        key={travel.id}
                        travel={travel}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>

        <div className="flex gap-4 justify-between sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
          <Button
            variant="outline"
            onClick={handleBackToEdit}
            data-testid="button-back-to-edit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>
          <Button
            onClick={handlePublish}
            data-testid="button-publish"
          >
            <Send className="mr-2 h-4 w-4" />
            Publish Itinerary
          </Button>
        </div>
      </div>
    </div>
  );
}
