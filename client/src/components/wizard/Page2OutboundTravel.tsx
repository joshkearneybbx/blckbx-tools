import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Car, Train } from "lucide-react";
import type { WizardData, FlightLeg, TaxiTransfer, TrainTransfer } from "@/pages/CreateItinerary";
import { nanoid } from "nanoid";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page2OutboundTravel({ data, updateData }: Props) {
  const updateOutbound = (field: string, value: string | number | FlightLeg[] | TaxiTransfer[] | TrainTransfer[]) => {
    updateData({
      outboundTravel: {
        ...data.outboundTravel,
        [field]: value,
      },
    });
  };

  const transferToAirportType = data.outboundTravel.transferToAirportType || "none";
  const transferToAccomType = data.outboundTravel.transferToAccomType || "none";
  const isMultiLeg = !!data.outboundTravel.isMultiLeg;

  const addFlightLeg = () => {
    const newLeg: FlightLeg = {
      departureAirport: "",
      departureTime: "",
      arrivalAirport: "",
      arrivalTime: "",
      flightNumber: "",
      layoverDuration: "",
    };
    updateOutbound("legs", [...(data.outboundTravel.legs || []), newLeg]);
  };

  const updateFlightLeg = (index: number, field: keyof FlightLeg, value: string) => {
    const updatedLegs = [...(data.outboundTravel.legs || [])];
    updatedLegs[index] = { ...updatedLegs[index], [field]: value };
    updateOutbound("legs", updatedLegs);
  };

  const removeFlightLeg = (index: number) => {
    const updatedLegs = (data.outboundTravel.legs || []).filter((_, i) => i !== index);
    updateOutbound("legs", updatedLegs);
  };

  const toggleMultiLeg = (checked: boolean) => {
    if (checked) {
      const existingLegs = data.outboundTravel.legs || [];
      if (existingLegs.length === 0) {
        const firstLeg: FlightLeg = {
          departureAirport: data.outboundTravel.departureAirport || "",
          departureTime: data.outboundTravel.departureTime || "",
          arrivalAirport: "",
          arrivalTime: "",
          flightNumber: data.outboundTravel.flightNumber || "",
          layoverDuration: "",
        };
        const secondLeg: FlightLeg = {
          departureAirport: "",
          departureTime: "",
          arrivalAirport: data.outboundTravel.arrivalAirport || "",
          arrivalTime: data.outboundTravel.arrivalTime || "",
          flightNumber: "",
          layoverDuration: "",
        };
        updateData({
          outboundTravel: {
            ...data.outboundTravel,
            isMultiLeg: 1,
            legs: [firstLeg, secondLeg],
          },
        });
      } else {
        updateOutbound("isMultiLeg", 1);
      }
    } else {
      updateOutbound("isMultiLeg", 0);
    }
  };

  // Helper functions for multiple taxis (Transfer to Airport)
  const addAirportTaxi = () => {
    const newTaxi: TaxiTransfer = { id: nanoid(8) };
    updateOutbound("transferToAirportTaxis", [...(data.outboundTravel.transferToAirportTaxis || []), newTaxi]);
  };

  const updateAirportTaxi = (index: number, field: keyof TaxiTransfer, value: string) => {
    const updated = [...(data.outboundTravel.transferToAirportTaxis || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateOutbound("transferToAirportTaxis", updated);
  };

  const removeAirportTaxi = (index: number) => {
    const updated = (data.outboundTravel.transferToAirportTaxis || []).filter((_, i) => i !== index);
    updateOutbound("transferToAirportTaxis", updated);
  };

  // Helper functions for multiple trains (Transfer to Airport)
  const addAirportTrain = () => {
    const newTrain: TrainTransfer = { id: nanoid(8) };
    updateOutbound("transferToAirportTrains", [...(data.outboundTravel.transferToAirportTrains || []), newTrain]);
  };

  const updateAirportTrain = (index: number, field: keyof TrainTransfer, value: string) => {
    const updated = [...(data.outboundTravel.transferToAirportTrains || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateOutbound("transferToAirportTrains", updated);
  };

  const removeAirportTrain = (index: number) => {
    const updated = (data.outboundTravel.transferToAirportTrains || []).filter((_, i) => i !== index);
    updateOutbound("transferToAirportTrains", updated);
  };

  // Helper functions for multiple taxis (Transfer to Accommodation)
  const addAccomTaxi = () => {
    const newTaxi: TaxiTransfer = { id: nanoid(8) };
    updateOutbound("transferToAccomTaxis", [...(data.outboundTravel.transferToAccomTaxis || []), newTaxi]);
  };

  const updateAccomTaxi = (index: number, field: keyof TaxiTransfer, value: string) => {
    const updated = [...(data.outboundTravel.transferToAccomTaxis || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateOutbound("transferToAccomTaxis", updated);
  };

  const removeAccomTaxi = (index: number) => {
    const updated = (data.outboundTravel.transferToAccomTaxis || []).filter((_, i) => i !== index);
    updateOutbound("transferToAccomTaxis", updated);
  };

  // Helper functions for multiple trains (Transfer to Accommodation)
  const addAccomTrain = () => {
    const newTrain: TrainTransfer = { id: nanoid(8) };
    updateOutbound("transferToAccomTrains", [...(data.outboundTravel.transferToAccomTrains || []), newTrain]);
  };

  const updateAccomTrain = (index: number, field: keyof TrainTransfer, value: string) => {
    const updated = [...(data.outboundTravel.transferToAccomTrains || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateOutbound("transferToAccomTrains", updated);
  };

  const removeAccomTrain = (index: number) => {
    const updated = (data.outboundTravel.transferToAccomTrains || []).filter((_, i) => i !== index);
    updateOutbound("transferToAccomTrains", updated);
  };

  return (
    <div className="space-y-8">
      {/* Transfer to Airport */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Transfer to Airport</h3>
        
        <div className="space-y-2">
          <Label htmlFor="transferToAirportType">Transport Type</Label>
          <Select
            value={transferToAirportType}
            onValueChange={(value) => updateOutbound("transferToAirportType", value)}
          >
            <SelectTrigger data-testid="select-transfer-airport-type">
              <SelectValue placeholder="Select transport type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (no transfer booked)</SelectItem>
              <SelectItem value="taxi">
                <span className="flex items-center gap-2"><Car className="h-4 w-4" /> Taxi</span>
              </SelectItem>
              <SelectItem value="train">
                <span className="flex items-center gap-2"><Train className="h-4 w-4" /> Train</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {transferToAirportType === "taxi" && (
          <div className="space-y-4">
            {(data.outboundTravel.transferToAirportTaxis || []).map((taxi, index) => (
              <Card key={taxi.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Taxi {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAirportTaxi(index)}
                    data-testid={`button-remove-airport-taxi-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={taxi.company || ""}
                      onChange={(e) => updateAirportTaxi(index, "company", e.target.value)}
                      data-testid={`input-airport-taxi-company-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Input
                      value={taxi.contact || ""}
                      onChange={(e) => updateAirportTaxi(index, "contact", e.target.value)}
                      data-testid={`input-airport-taxi-contact-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Collection Time</Label>
                    <Input
                      value={taxi.collectionTime || ""}
                      onChange={(e) => updateAirportTaxi(index, "collectionTime", e.target.value)}
                      placeholder="e.g., 08:00"
                      data-testid={`input-airport-taxi-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={taxi.pickupLocation || ""}
                      onChange={(e) => updateAirportTaxi(index, "pickupLocation", e.target.value)}
                      data-testid={`input-airport-taxi-pickup-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={taxi.paymentStatus || ""}
                      onValueChange={(value) => updateAirportTaxi(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-airport-taxi-payment-${index}`}>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-paid">Pre-paid</SelectItem>
                        <SelectItem value="Need to pay">Need to pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAirportTaxi}
              className="w-full"
              data-testid="button-add-airport-taxi"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Taxi
            </Button>
          </div>
        )}

        {transferToAirportType === "train" && (
          <div className="space-y-4">
            {(data.outboundTravel.transferToAirportTrains || []).map((train, index) => (
              <Card key={train.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Train {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAirportTrain(index)}
                    data-testid={`button-remove-airport-train-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departing Station</Label>
                    <Input
                      value={train.departingStation || ""}
                      onChange={(e) => updateAirportTrain(index, "departingStation", e.target.value)}
                      placeholder="e.g., London St Pancras"
                      data-testid={`input-airport-train-departing-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Station</Label>
                    <Input
                      value={train.arrivalStation || ""}
                      onChange={(e) => updateAirportTrain(index, "arrivalStation", e.target.value)}
                      placeholder="e.g., Gatwick Airport"
                      data-testid={`input-airport-train-arrival-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={train.departureTime || ""}
                      onChange={(e) => updateAirportTrain(index, "departureTime", e.target.value)}
                      placeholder="e.g., 08:30"
                      data-testid={`input-airport-train-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Train Provider</Label>
                    <Input
                      value={train.provider || ""}
                      onChange={(e) => updateAirportTrain(index, "provider", e.target.value)}
                      placeholder="e.g., Eurostar, GWR"
                      data-testid={`input-airport-train-provider-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Booking Reference</Label>
                    <Input
                      value={train.bookingRef || ""}
                      onChange={(e) => updateAirportTrain(index, "bookingRef", e.target.value)}
                      data-testid={`input-airport-train-booking-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={train.paymentStatus || ""}
                      onValueChange={(value) => updateAirportTrain(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-airport-train-payment-${index}`}>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-paid">Pre-paid</SelectItem>
                        <SelectItem value="Need to pay">Need to pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={train.notes || ""}
                    onChange={(e) => updateAirportTrain(index, "notes", e.target.value)}
                    placeholder="Any additional notes"
                    data-testid={`textarea-airport-train-notes-${index}`}
                  />
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAirportTrain}
              className="w-full"
              data-testid="button-add-airport-train"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Train
            </Button>
          </div>
        )}
      </div>

      {/* Flight Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Outbound Flight</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isMultiLeg"
              checked={isMultiLeg}
              onCheckedChange={toggleMultiLeg}
              data-testid="checkbox-multi-leg-outbound"
            />
            <Label htmlFor="isMultiLeg" className="cursor-pointer text-sm">
              Connecting Flight
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="flightDate">Flight Date</Label>
          <Input
            id="flightDate"
            value={data.outboundTravel.flightDate}
            onChange={(e) => updateOutbound("flightDate", e.target.value)}
            placeholder="e.g., 15th June 2024"
            data-testid="input-flight-date"
          />
        </div>

        {!isMultiLeg ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight Number</Label>
              <Input
                id="flightNumber"
                value={data.outboundTravel.flightNumber}
                onChange={(e) => updateOutbound("flightNumber", e.target.value)}
                placeholder="e.g., BA123"
                data-testid="input-flight-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureAirport">Departure Airport</Label>
              <Input
                id="departureAirport"
                value={data.outboundTravel.departureAirport}
                onChange={(e) => updateOutbound("departureAirport", e.target.value)}
                placeholder="e.g., London Heathrow"
                data-testid="input-departure-airport"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureTime">Departure Time</Label>
              <Input
                id="departureTime"
                value={data.outboundTravel.departureTime}
                onChange={(e) => updateOutbound("departureTime", e.target.value)}
                placeholder="e.g., 10:30"
                data-testid="input-departure-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalAirport">Arrival Airport</Label>
              <Input
                id="arrivalAirport"
                value={data.outboundTravel.arrivalAirport}
                onChange={(e) => updateOutbound("arrivalAirport", e.target.value)}
                placeholder="e.g., Faro Airport"
                data-testid="input-arrival-airport"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalTime">Arrival Time</Label>
              <Input
                id="arrivalTime"
                value={data.outboundTravel.arrivalTime}
                onChange={(e) => updateOutbound("arrivalTime", e.target.value)}
                placeholder="e.g., 15:45"
                data-testid="input-arrival-time"
              />
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Add each flight leg in your journey. The layover duration will be shown between legs.
            </p>
            
            {(data.outboundTravel.legs || []).map((leg, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    Flight Leg {index + 1}
                    {index > 0 && leg.layoverDuration && (
                      <span className="ml-2 text-sm text-muted-foreground font-normal">
                        (after {leg.layoverDuration} layover)
                      </span>
                    )}
                  </h4>
                  {(data.outboundTravel.legs || []).length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFlightLeg(index)}
                      data-testid={`button-remove-leg-${index}`}
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
                      onChange={(e) => updateFlightLeg(index, "flightNumber", e.target.value)}
                      placeholder="e.g., BA123"
                      data-testid={`input-leg-flight-number-${index}`}
                    />
                  </div>
                  {index > 0 && (
                    <div className="space-y-2">
                      <Label>Layover Duration</Label>
                      <Input
                        value={leg.layoverDuration || ""}
                        onChange={(e) => updateFlightLeg(index, "layoverDuration", e.target.value)}
                        placeholder="e.g., 2h 30m"
                        data-testid={`input-leg-layover-${index}`}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Airport</Label>
                    <Input
                      value={leg.departureAirport}
                      onChange={(e) => updateFlightLeg(index, "departureAirport", e.target.value)}
                      placeholder="e.g., London Heathrow"
                      data-testid={`input-leg-departure-airport-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={leg.departureTime}
                      onChange={(e) => updateFlightLeg(index, "departureTime", e.target.value)}
                      placeholder="e.g., 10:30"
                      data-testid={`input-leg-departure-time-${index}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Arrival Airport</Label>
                    <Input
                      value={leg.arrivalAirport}
                      onChange={(e) => updateFlightLeg(index, "arrivalAirport", e.target.value)}
                      placeholder="e.g., Madrid Barajas"
                      data-testid={`input-leg-arrival-airport-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival Time</Label>
                    <Input
                      value={leg.arrivalTime}
                      onChange={(e) => updateFlightLeg(index, "arrivalTime", e.target.value)}
                      placeholder="e.g., 13:45"
                      data-testid={`input-leg-arrival-time-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addFlightLeg}
              className="w-full"
              data-testid="button-add-flight-leg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Flight Leg
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="passengersSeats">Passengers & Seats</Label>
          <Textarea
            id="passengersSeats"
            value={data.outboundTravel.passengersSeats}
            onChange={(e) => updateOutbound("passengersSeats", e.target.value)}
            placeholder="e.g., Seat 12A - John Smith, Seat 12B - Jane Smith"
            data-testid="textarea-passengers-seats"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thingsToRemember">Things to Remember</Label>
          <Textarea
            id="thingsToRemember"
            value={data.outboundTravel.thingsToRemember}
            onChange={(e) => updateOutbound("thingsToRemember", e.target.value)}
            placeholder="e.g., Bring passport, visa required, check-in 3 hours early"
            data-testid="textarea-things-to-remember"
          />
        </div>
      </div>

      {/* Transfer to Accommodation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Transfer to Accommodation</h3>
        
        <div className="space-y-2">
          <Label htmlFor="transferToAccomType">Transport Type</Label>
          <Select
            value={transferToAccomType}
            onValueChange={(value) => updateOutbound("transferToAccomType", value)}
          >
            <SelectTrigger data-testid="select-transfer-accom-type">
              <SelectValue placeholder="Select transport type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (no transfer booked)</SelectItem>
              <SelectItem value="taxi">
                <span className="flex items-center gap-2"><Car className="h-4 w-4" /> Taxi</span>
              </SelectItem>
              <SelectItem value="train">
                <span className="flex items-center gap-2"><Train className="h-4 w-4" /> Train</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {transferToAccomType === "taxi" && (
          <div className="space-y-4">
            {(data.outboundTravel.transferToAccomTaxis || []).map((taxi, index) => (
              <Card key={taxi.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Taxi {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAccomTaxi(index)}
                    data-testid={`button-remove-accom-taxi-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={taxi.company || ""}
                      onChange={(e) => updateAccomTaxi(index, "company", e.target.value)}
                      data-testid={`input-accom-taxi-company-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Input
                      value={taxi.contact || ""}
                      onChange={(e) => updateAccomTaxi(index, "contact", e.target.value)}
                      data-testid={`input-accom-taxi-contact-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Collection Time</Label>
                    <Input
                      value={taxi.collectionTime || ""}
                      onChange={(e) => updateAccomTaxi(index, "collectionTime", e.target.value)}
                      data-testid={`input-accom-taxi-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={taxi.pickupLocation || ""}
                      onChange={(e) => updateAccomTaxi(index, "pickupLocation", e.target.value)}
                      placeholder="e.g., Airport Arrivals Hall"
                      data-testid={`input-accom-taxi-pickup-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={taxi.paymentStatus || ""}
                      onValueChange={(value) => updateAccomTaxi(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-accom-taxi-payment-${index}`}>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-paid">Pre-paid</SelectItem>
                        <SelectItem value="Need to pay">Need to pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAccomTaxi}
              className="w-full"
              data-testid="button-add-accom-taxi"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Taxi
            </Button>
          </div>
        )}

        {transferToAccomType === "train" && (
          <div className="space-y-4">
            {(data.outboundTravel.transferToAccomTrains || []).map((train, index) => (
              <Card key={train.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Train {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAccomTrain(index)}
                    data-testid={`button-remove-accom-train-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departing Station</Label>
                    <Input
                      value={train.departingStation || ""}
                      onChange={(e) => updateAccomTrain(index, "departingStation", e.target.value)}
                      placeholder="e.g., Faro Airport Station"
                      data-testid={`input-accom-train-departing-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Station</Label>
                    <Input
                      value={train.arrivalStation || ""}
                      onChange={(e) => updateAccomTrain(index, "arrivalStation", e.target.value)}
                      placeholder="e.g., Albufeira-Ferreiras"
                      data-testid={`input-accom-train-arrival-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={train.departureTime || ""}
                      onChange={(e) => updateAccomTrain(index, "departureTime", e.target.value)}
                      placeholder="e.g., 16:30"
                      data-testid={`input-accom-train-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Train Provider</Label>
                    <Input
                      value={train.provider || ""}
                      onChange={(e) => updateAccomTrain(index, "provider", e.target.value)}
                      placeholder="e.g., CP (Comboios de Portugal)"
                      data-testid={`input-accom-train-provider-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Booking Reference</Label>
                    <Input
                      value={train.bookingRef || ""}
                      onChange={(e) => updateAccomTrain(index, "bookingRef", e.target.value)}
                      data-testid={`input-accom-train-booking-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={train.paymentStatus || ""}
                      onValueChange={(value) => updateAccomTrain(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-accom-train-payment-${index}`}>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pre-paid">Pre-paid</SelectItem>
                        <SelectItem value="Need to pay">Need to pay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={train.notes || ""}
                    onChange={(e) => updateAccomTrain(index, "notes", e.target.value)}
                    placeholder="Any additional notes"
                    data-testid={`textarea-accom-train-notes-${index}`}
                  />
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAccomTrain}
              className="w-full"
              data-testid="button-add-accom-train"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Train
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
