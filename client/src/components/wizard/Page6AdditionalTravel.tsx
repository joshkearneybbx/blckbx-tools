import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Car, Plane, Ship, Train, Trash2 } from "lucide-react";
import type { WizardData, FlightLeg } from "@/pages/CreateItinerary";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page6AdditionalTravel({ data, updateData }: Props) {
  const addTravel = () => {
    const newTravel = {
      travelType: "",
      vehicleDetails: "",
      vehicleRegistration: "",
      carContactDetails: "",
      carBookingDetails: "",
      flightNumber: "",
      flightDate: "",
      flightDepartureAirport: "",
      flightArrivalAirport: "",
      flightDepartureTime: "",
      flightArrivalTime: "",
      flightPassengersSeats: "",
      flightThingsToRemember: "",
      flightIsMultiLeg: 0,
      flightLegs: [] as FlightLeg[],
      ferryDepartingFrom: "",
      ferryDestination: "",
      ferryDate: "",
      ferryPrice: "",
      ferryContactDetails: "",
      ferryBookingReference: "",
      ferryAdditionalNotes: "",
      trainDepartingFrom: "",
      trainDestination: "",
      trainDate: "",
      trainPrice: "",
      trainContactDetails: "",
      trainBookingReference: "",
      trainAdditionalNotes: "",
      displayOrder: data.additionalTravel.length,
    };
    updateData({ additionalTravel: [...data.additionalTravel, newTravel] });
  };

  const removeTravel = (index: number) => {
    const newTravel = data.additionalTravel.filter((_, i) => i !== index);
    updateData({ additionalTravel: newTravel });
  };

  const updateTravel = (index: number, field: string, value: string | number | FlightLeg[]) => {
    const newTravel = [...data.additionalTravel];
    newTravel[index] = { ...newTravel[index], [field]: value };
    updateData({ additionalTravel: newTravel });
  };

  const addFlightLegToTravel = (travelIndex: number) => {
    const newLeg: FlightLeg = {
      departureAirport: "",
      departureTime: "",
      arrivalAirport: "",
      arrivalTime: "",
      flightNumber: "",
      layoverDuration: "",
    };
    const travel = data.additionalTravel[travelIndex];
    updateTravel(travelIndex, "flightLegs", [...(travel.flightLegs || []), newLeg]);
  };

  const updateFlightLegInTravel = (travelIndex: number, legIndex: number, field: keyof FlightLeg, value: string) => {
    const travel = data.additionalTravel[travelIndex];
    const updatedLegs = [...(travel.flightLegs || [])];
    updatedLegs[legIndex] = { ...updatedLegs[legIndex], [field]: value };
    updateTravel(travelIndex, "flightLegs", updatedLegs);
  };

  const removeFlightLegFromTravel = (travelIndex: number, legIndex: number) => {
    const travel = data.additionalTravel[travelIndex];
    const updatedLegs = (travel.flightLegs || []).filter((_, i) => i !== legIndex);
    updateTravel(travelIndex, "flightLegs", updatedLegs);
  };

  const toggleMultiLegForTravel = (travelIndex: number, checked: boolean) => {
    const travel = data.additionalTravel[travelIndex];
    if (checked) {
      const existingLegs = travel.flightLegs || [];
      if (existingLegs.length === 0) {
        const firstLeg: FlightLeg = {
          departureAirport: travel.flightDepartureAirport || "",
          departureTime: travel.flightDepartureTime || "",
          arrivalAirport: "",
          arrivalTime: "",
          flightNumber: travel.flightNumber || "",
          layoverDuration: "",
        };
        const secondLeg: FlightLeg = {
          departureAirport: "",
          departureTime: "",
          arrivalAirport: travel.flightArrivalAirport || "",
          arrivalTime: travel.flightArrivalTime || "",
          flightNumber: "",
          layoverDuration: "",
        };
        const newTravel = [...data.additionalTravel];
        newTravel[travelIndex] = {
          ...newTravel[travelIndex],
          flightIsMultiLeg: 1,
          flightLegs: [firstLeg, secondLeg],
        };
        updateData({ additionalTravel: newTravel });
      } else {
        updateTravel(travelIndex, "flightIsMultiLeg", 1);
      }
    } else {
      updateTravel(travelIndex, "flightIsMultiLeg", 0);
    }
  };

  const getTravelIcon = (type: string) => {
    switch (type) {
      case "car":
        return <Car className="w-4 h-4" />;
      case "flight":
        return <Plane className="w-4 h-4" />;
      case "ferry":
        return <Ship className="w-4 h-4" />;
      case "train":
        return <Train className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTravelLabel = (type: string) => {
    switch (type) {
      case "car":
        return "Car Rental";
      case "flight":
        return "Flight";
      case "ferry":
        return "Ferry";
      case "train":
        return "Train";
      default:
        return "Travel Segment";
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm">
          <strong>Optional Section:</strong> Add any additional travel during the trip such as car rentals, ferries, trains, or internal flights. 
          If not applicable, you can skip this page entirely.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add additional travel segments
        </p>
        <Button
          type="button"
          onClick={addTravel}
          data-testid="button-add-travel"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Travel
        </Button>
      </div>

      {data.additionalTravel.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No additional travel added</p>
          <p className="text-sm text-muted-foreground mt-2">You can skip this section if not needed</p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.additionalTravel.map((travel, index) => (
            <div
              key={index}
              className="p-6 border rounded-lg space-y-4 relative"
              data-testid={`travel-item-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTravelIcon(travel.travelType)}
                  <h4 className="font-semibold">
                    {travel.travelType ? getTravelLabel(travel.travelType) : `Travel Segment ${index + 1}`}
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTravel(index)}
                  data-testid={`button-remove-travel-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`travel-type-${index}`}>Travel Type *</Label>
                <Select
                  value={travel.travelType}
                  onValueChange={(value) => updateTravel(index, "travelType", value)}
                >
                  <SelectTrigger 
                    id={`travel-type-${index}`}
                    data-testid={`select-travel-type-${index}`}
                  >
                    <SelectValue placeholder="Select travel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car" data-testid={`select-option-car-${index}`}>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        <span>Car Rental</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="flight" data-testid={`select-option-flight-${index}`}>
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4" />
                        <span>Flight</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ferry" data-testid={`select-option-ferry-${index}`}>
                      <div className="flex items-center gap-2">
                        <Ship className="w-4 h-4" />
                        <span>Ferry</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="train" data-testid={`select-option-train-${index}`}>
                      <div className="flex items-center gap-2">
                        <Train className="w-4 h-4" />
                        <span>Train</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Car Fields */}
              {travel.travelType === "car" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor={`vehicle-details-${index}`}>Vehicle Details</Label>
                    <Input
                      id={`vehicle-details-${index}`}
                      value={travel.vehicleDetails}
                      onChange={(e) => updateTravel(index, "vehicleDetails", e.target.value)}
                      placeholder="e.g., Toyota Corolla, Automatic, 5 seats"
                      data-testid={`input-vehicle-details-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`vehicle-registration-${index}`}>Vehicle Registration</Label>
                    <Input
                      id={`vehicle-registration-${index}`}
                      value={travel.vehicleRegistration}
                      onChange={(e) => updateTravel(index, "vehicleRegistration", e.target.value)}
                      placeholder="e.g., ABC 1234"
                      data-testid={`input-vehicle-registration-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`car-contact-details-${index}`}>Rental Company Contact</Label>
                    <Input
                      id={`car-contact-details-${index}`}
                      value={travel.carContactDetails}
                      onChange={(e) => updateTravel(index, "carContactDetails", e.target.value)}
                      placeholder="e.g., +351 123 456 789 or company@email.com"
                      data-testid={`input-car-contact-details-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`car-booking-details-${index}`}>Booking Details & Notes</Label>
                    <Textarea
                      id={`car-booking-details-${index}`}
                      value={travel.carBookingDetails}
                      onChange={(e) => updateTravel(index, "carBookingDetails", e.target.value)}
                      placeholder="Include booking reference, pickup/dropoff location, times, insurance details, etc."
                      rows={4}
                      data-testid={`textarea-car-booking-details-${index}`}
                    />
                  </div>
                </div>
              )}

              {/* Flight Fields */}
              {travel.travelType === "flight" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`flight-date-${index}`}>Flight Date</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`flight-multi-leg-${index}`}
                        checked={travel.flightIsMultiLeg === 1}
                        onCheckedChange={(checked) => toggleMultiLegForTravel(index, !!checked)}
                        data-testid={`checkbox-multi-leg-additional-${index}`}
                      />
                      <Label htmlFor={`flight-multi-leg-${index}`} className="cursor-pointer text-sm">
                        Connecting Flight
                      </Label>
                    </div>
                  </div>
                  
                  <Input
                    id={`flight-date-${index}`}
                    value={travel.flightDate}
                    onChange={(e) => updateTravel(index, "flightDate", e.target.value)}
                    placeholder="e.g., 15th June 2024"
                    data-testid={`input-flight-date-${index}`}
                  />

                  {travel.flightIsMultiLeg !== 1 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`flight-number-${index}`}>Flight Number</Label>
                          <Input
                            id={`flight-number-${index}`}
                            value={travel.flightNumber}
                            onChange={(e) => updateTravel(index, "flightNumber", e.target.value)}
                            placeholder="e.g., BA123"
                            data-testid={`input-flight-number-${index}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`flight-departure-airport-${index}`}>Departure Airport</Label>
                          <Input
                            id={`flight-departure-airport-${index}`}
                            value={travel.flightDepartureAirport}
                            onChange={(e) => updateTravel(index, "flightDepartureAirport", e.target.value)}
                            placeholder="e.g., Lisbon (LIS)"
                            data-testid={`input-flight-departure-airport-${index}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`flight-departure-time-${index}`}>Departure Time</Label>
                          <Input
                            id={`flight-departure-time-${index}`}
                            value={travel.flightDepartureTime}
                            onChange={(e) => updateTravel(index, "flightDepartureTime", e.target.value)}
                            placeholder="e.g., 14:30"
                            data-testid={`input-flight-departure-time-${index}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`flight-arrival-airport-${index}`}>Arrival Airport</Label>
                          <Input
                            id={`flight-arrival-airport-${index}`}
                            value={travel.flightArrivalAirport}
                            onChange={(e) => updateTravel(index, "flightArrivalAirport", e.target.value)}
                            placeholder="e.g., Faro (FAO)"
                            data-testid={`input-flight-arrival-airport-${index}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`flight-arrival-time-${index}`}>Arrival Time</Label>
                          <Input
                            id={`flight-arrival-time-${index}`}
                            value={travel.flightArrivalTime}
                            onChange={(e) => updateTravel(index, "flightArrivalTime", e.target.value)}
                            placeholder="e.g., 16:45"
                            data-testid={`input-flight-arrival-time-${index}`}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Add each flight leg in your journey. The layover duration will be shown between legs.
                      </p>
                      
                      {(travel.flightLegs || []).map((leg, legIndex) => (
                        <div key={legIndex} className="border rounded-lg p-4 space-y-4 relative">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Flight Leg {legIndex + 1}
                              {legIndex > 0 && leg.layoverDuration && (
                                <span className="ml-2 text-sm text-muted-foreground font-normal">
                                  (after {leg.layoverDuration} layover)
                                </span>
                              )}
                            </h4>
                            {(travel.flightLegs || []).length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFlightLegFromTravel(index, legIndex)}
                                data-testid={`button-remove-additional-leg-${index}-${legIndex}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Flight Number</Label>
                              <Input
                                value={leg.flightNumber || ""}
                                onChange={(e) => updateFlightLegInTravel(index, legIndex, "flightNumber", e.target.value)}
                                placeholder="e.g., BA123"
                                data-testid={`input-additional-leg-flight-number-${index}-${legIndex}`}
                              />
                            </div>
                            {legIndex > 0 && (
                              <div className="space-y-2">
                                <Label>Layover Duration</Label>
                                <Input
                                  value={leg.layoverDuration || ""}
                                  onChange={(e) => updateFlightLegInTravel(index, legIndex, "layoverDuration", e.target.value)}
                                  placeholder="e.g., 2h 30m"
                                  data-testid={`input-additional-leg-layover-${index}-${legIndex}`}
                                />
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Departure Airport</Label>
                              <Input
                                value={leg.departureAirport}
                                onChange={(e) => updateFlightLegInTravel(index, legIndex, "departureAirport", e.target.value)}
                                placeholder="e.g., Lisbon (LIS)"
                                data-testid={`input-additional-leg-departure-airport-${index}-${legIndex}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Departure Time</Label>
                              <Input
                                value={leg.departureTime}
                                onChange={(e) => updateFlightLegInTravel(index, legIndex, "departureTime", e.target.value)}
                                placeholder="e.g., 10:30"
                                data-testid={`input-additional-leg-departure-time-${index}-${legIndex}`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Arrival Airport</Label>
                              <Input
                                value={leg.arrivalAirport}
                                onChange={(e) => updateFlightLegInTravel(index, legIndex, "arrivalAirport", e.target.value)}
                                placeholder="e.g., Madrid (MAD)"
                                data-testid={`input-additional-leg-arrival-airport-${index}-${legIndex}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Arrival Time</Label>
                              <Input
                                value={leg.arrivalTime}
                                onChange={(e) => updateFlightLegInTravel(index, legIndex, "arrivalTime", e.target.value)}
                                placeholder="e.g., 13:45"
                                data-testid={`input-additional-leg-arrival-time-${index}-${legIndex}`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addFlightLegToTravel(index)}
                        className="w-full"
                        data-testid={`button-add-additional-flight-leg-${index}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Flight Leg
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor={`flight-passengers-seats-${index}`}>Passengers & Seats</Label>
                    <Input
                      id={`flight-passengers-seats-${index}`}
                      value={travel.flightPassengersSeats}
                      onChange={(e) => updateTravel(index, "flightPassengersSeats", e.target.value)}
                      placeholder="e.g., 4 passengers, Seats 12A-12D"
                      data-testid={`input-flight-passengers-seats-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`flight-things-to-remember-${index}`}>Things to Remember</Label>
                    <Textarea
                      id={`flight-things-to-remember-${index}`}
                      value={travel.flightThingsToRemember}
                      onChange={(e) => updateTravel(index, "flightThingsToRemember", e.target.value)}
                      placeholder="Include booking reference, baggage allowance, check-in times, gate info, etc."
                      rows={4}
                      data-testid={`textarea-flight-things-to-remember-${index}`}
                    />
                  </div>
                </div>
              )}

              {/* Ferry Fields */}
              {travel.travelType === "ferry" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`ferry-departing-from-${index}`}>Departing From</Label>
                      <Input
                        id={`ferry-departing-from-${index}`}
                        value={travel.ferryDepartingFrom}
                        onChange={(e) => updateTravel(index, "ferryDepartingFrom", e.target.value)}
                        placeholder="e.g., Portsmouth Port"
                        data-testid={`input-ferry-departing-from-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`ferry-destination-${index}`}>Destination</Label>
                      <Input
                        id={`ferry-destination-${index}`}
                        value={travel.ferryDestination}
                        onChange={(e) => updateTravel(index, "ferryDestination", e.target.value)}
                        placeholder="e.g., Bilbao Port"
                        data-testid={`input-ferry-destination-${index}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`ferry-date-${index}`}>Date & Time</Label>
                      <Input
                        id={`ferry-date-${index}`}
                        value={travel.ferryDate}
                        onChange={(e) => updateTravel(index, "ferryDate", e.target.value)}
                        placeholder="e.g., 10th July 2024, 18:00"
                        data-testid={`input-ferry-date-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`ferry-price-${index}`}>Price</Label>
                      <Input
                        id={`ferry-price-${index}`}
                        value={travel.ferryPrice}
                        onChange={(e) => updateTravel(index, "ferryPrice", e.target.value)}
                        placeholder="e.g., £250"
                        data-testid={`input-ferry-price-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`ferry-contact-details-${index}`}>Ferry Company Contact</Label>
                    <Input
                      id={`ferry-contact-details-${index}`}
                      value={travel.ferryContactDetails}
                      onChange={(e) => updateTravel(index, "ferryContactDetails", e.target.value)}
                      placeholder="e.g., +44 123 456 7890"
                      data-testid={`input-ferry-contact-details-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`ferry-booking-reference-${index}`}>Booking Reference</Label>
                    <Input
                      id={`ferry-booking-reference-${index}`}
                      value={travel.ferryBookingReference}
                      onChange={(e) => updateTravel(index, "ferryBookingReference", e.target.value)}
                      placeholder="e.g., FERRY123456"
                      data-testid={`input-ferry-booking-reference-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`ferry-additional-notes-${index}`}>Additional Notes</Label>
                    <Textarea
                      id={`ferry-additional-notes-${index}`}
                      value={travel.ferryAdditionalNotes}
                      onChange={(e) => updateTravel(index, "ferryAdditionalNotes", e.target.value)}
                      placeholder="Include cabin details, meal arrangements, check-in times, parking info, etc."
                      rows={4}
                      data-testid={`textarea-ferry-additional-notes-${index}`}
                    />
                  </div>
                </div>
              )}

              {/* Train Fields */}
              {travel.travelType === "train" && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`train-departing-from-${index}`}>Departing From</Label>
                      <Input
                        id={`train-departing-from-${index}`}
                        value={travel.trainDepartingFrom}
                        onChange={(e) => updateTravel(index, "trainDepartingFrom", e.target.value)}
                        placeholder="e.g., London Paddington"
                        data-testid={`input-train-departing-from-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`train-destination-${index}`}>Destination</Label>
                      <Input
                        id={`train-destination-${index}`}
                        value={travel.trainDestination}
                        onChange={(e) => updateTravel(index, "trainDestination", e.target.value)}
                        placeholder="e.g., Bristol Temple Meads"
                        data-testid={`input-train-destination-${index}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`train-date-${index}`}>Date & Time</Label>
                      <Input
                        id={`train-date-${index}`}
                        value={travel.trainDate}
                        onChange={(e) => updateTravel(index, "trainDate", e.target.value)}
                        placeholder="e.g., 5th August 2024, 09:15"
                        data-testid={`input-train-date-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`train-price-${index}`}>Price</Label>
                      <Input
                        id={`train-price-${index}`}
                        value={travel.trainPrice}
                        onChange={(e) => updateTravel(index, "trainPrice", e.target.value)}
                        placeholder="e.g., £89"
                        data-testid={`input-train-price-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`train-contact-details-${index}`}>Train Company Contact</Label>
                    <Input
                      id={`train-contact-details-${index}`}
                      value={travel.trainContactDetails}
                      onChange={(e) => updateTravel(index, "trainContactDetails", e.target.value)}
                      placeholder="e.g., +44 345 700 0125"
                      data-testid={`input-train-contact-details-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`train-booking-reference-${index}`}>Booking Reference</Label>
                    <Input
                      id={`train-booking-reference-${index}`}
                      value={travel.trainBookingReference}
                      onChange={(e) => updateTravel(index, "trainBookingReference", e.target.value)}
                      placeholder="e.g., TRAIN789012"
                      data-testid={`input-train-booking-reference-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`train-additional-notes-${index}`}>Additional Notes</Label>
                    <Textarea
                      id={`train-additional-notes-${index}`}
                      value={travel.trainAdditionalNotes}
                      onChange={(e) => updateTravel(index, "trainAdditionalNotes", e.target.value)}
                      placeholder="Include seat reservations, carriage numbers, platform info, etc."
                      rows={4}
                      data-testid={`textarea-train-additional-notes-${index}`}
                    />
                  </div>
                </div>
              )}

              {/* Prompt to select travel type if none selected */}
              {!travel.travelType && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Please select a travel type to see relevant fields
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
