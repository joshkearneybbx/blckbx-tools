import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Car, Train } from "lucide-react";
import { nanoid } from "nanoid";
import type { WizardData, FlightLeg, TaxiTransfer, TrainTransfer } from "@/pages/CreateItinerary";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page7ReturnTravel({ data, updateData }: Props) {
  const updateReturn = (field: string, value: string | number | FlightLeg[] | TaxiTransfer[] | TrainTransfer[]) => {
    updateData({
      returnTravel: {
        ...data.returnTravel,
        [field]: value,
      },
    });
  };

  const transferToAirportType = data.returnTravel.transferToAirportType || "none";
  const transferHomeType = data.returnTravel.transferHomeType || "none";
  const isMultiLeg = !!data.returnTravel.isMultiLeg;

  // Helper functions for multiple taxis (Transfer to Airport)
  const addAirportTaxi = () => {
    const newTaxi: TaxiTransfer = { id: nanoid(8), company: "", contact: "", collectionTime: "", pickupLocation: "", paymentStatus: "" };
    updateReturn("transferToAirportTaxis", [...(data.returnTravel.transferToAirportTaxis || []), newTaxi]);
  };
  const updateAirportTaxi = (index: number, field: keyof TaxiTransfer, value: string) => {
    const updated = [...(data.returnTravel.transferToAirportTaxis || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateReturn("transferToAirportTaxis", updated);
  };
  const removeAirportTaxi = (index: number) => {
    const updated = (data.returnTravel.transferToAirportTaxis || []).filter((_, i) => i !== index);
    updateReturn("transferToAirportTaxis", updated);
  };

  // Helper functions for multiple trains (Transfer to Airport)
  const addAirportTrain = () => {
    const newTrain: TrainTransfer = { id: nanoid(8), departingStation: "", arrivalStation: "", departureTime: "", provider: "", bookingRef: "", paymentStatus: "", notes: "" };
    updateReturn("transferToAirportTrains", [...(data.returnTravel.transferToAirportTrains || []), newTrain]);
  };
  const updateAirportTrain = (index: number, field: keyof TrainTransfer, value: string) => {
    const updated = [...(data.returnTravel.transferToAirportTrains || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateReturn("transferToAirportTrains", updated);
  };
  const removeAirportTrain = (index: number) => {
    const updated = (data.returnTravel.transferToAirportTrains || []).filter((_, i) => i !== index);
    updateReturn("transferToAirportTrains", updated);
  };

  // Helper functions for multiple taxis (Transfer Home)
  const addHomeTaxi = () => {
    const newTaxi: TaxiTransfer = { id: nanoid(8), company: "", contact: "", collectionTime: "", pickupLocation: "", paymentStatus: "" };
    updateReturn("transferHomeTaxis", [...(data.returnTravel.transferHomeTaxis || []), newTaxi]);
  };
  const updateHomeTaxi = (index: number, field: keyof TaxiTransfer, value: string) => {
    const updated = [...(data.returnTravel.transferHomeTaxis || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateReturn("transferHomeTaxis", updated);
  };
  const removeHomeTaxi = (index: number) => {
    const updated = (data.returnTravel.transferHomeTaxis || []).filter((_, i) => i !== index);
    updateReturn("transferHomeTaxis", updated);
  };

  // Helper functions for multiple trains (Transfer Home)
  const addHomeTrain = () => {
    const newTrain: TrainTransfer = { id: nanoid(8), departingStation: "", arrivalStation: "", departureTime: "", provider: "", bookingRef: "", paymentStatus: "", notes: "" };
    updateReturn("transferHomeTrains", [...(data.returnTravel.transferHomeTrains || []), newTrain]);
  };
  const updateHomeTrain = (index: number, field: keyof TrainTransfer, value: string) => {
    const updated = [...(data.returnTravel.transferHomeTrains || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateReturn("transferHomeTrains", updated);
  };
  const removeHomeTrain = (index: number) => {
    const updated = (data.returnTravel.transferHomeTrains || []).filter((_, i) => i !== index);
    updateReturn("transferHomeTrains", updated);
  };

  const addFlightLeg = () => {
    const newLeg: FlightLeg = {
      departureAirport: "",
      departureTime: "",
      arrivalAirport: "",
      arrivalTime: "",
      flightNumber: "",
      layoverDuration: "",
    };
    updateReturn("legs", [...(data.returnTravel.legs || []), newLeg]);
  };

  const updateFlightLeg = (index: number, field: keyof FlightLeg, value: string) => {
    const updatedLegs = [...(data.returnTravel.legs || [])];
    updatedLegs[index] = { ...updatedLegs[index], [field]: value };
    updateReturn("legs", updatedLegs);
  };

  const removeFlightLeg = (index: number) => {
    const updatedLegs = (data.returnTravel.legs || []).filter((_, i) => i !== index);
    updateReturn("legs", updatedLegs);
  };

  const toggleMultiLeg = (checked: boolean) => {
    if (checked) {
      const existingLegs = data.returnTravel.legs || [];
      if (existingLegs.length === 0) {
        const firstLeg: FlightLeg = {
          departureAirport: data.returnTravel.departureAirport || "",
          departureTime: data.returnTravel.departureTime || "",
          arrivalAirport: "",
          arrivalTime: "",
          flightNumber: data.returnTravel.flightNumber || "",
          layoverDuration: "",
        };
        const secondLeg: FlightLeg = {
          departureAirport: "",
          departureTime: "",
          arrivalAirport: data.returnTravel.arrivalAirport || "",
          arrivalTime: data.returnTravel.arrivalTime || "",
          flightNumber: "",
          layoverDuration: "",
        };
        updateData({
          returnTravel: {
            ...data.returnTravel,
            isMultiLeg: 1,
            legs: [firstLeg, secondLeg],
          },
        });
      } else {
        updateReturn("isMultiLeg", 1);
      }
    } else {
      updateReturn("isMultiLeg", 0);
    }
  };

  return (
    <div className="space-y-8">
      {/* Transfer to Airport */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Transfer to Airport</h3>
        
        <div className="space-y-2">
          <Label htmlFor="returnTransferToAirportType">Transport Type</Label>
          <Select
            value={transferToAirportType}
            onValueChange={(value) => updateReturn("transferToAirportType", value)}
          >
            <SelectTrigger data-testid="select-return-transfer-airport-type">
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
            {(data.returnTravel.transferToAirportTaxis || []).map((taxi, index) => (
              <Card key={taxi.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Taxi {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAirportTaxi(index)}
                    data-testid={`button-remove-return-airport-taxi-${index}`}
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
                      data-testid={`input-return-airport-taxi-company-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Input
                      value={taxi.contact || ""}
                      onChange={(e) => updateAirportTaxi(index, "contact", e.target.value)}
                      data-testid={`input-return-airport-taxi-contact-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Collection Time</Label>
                    <Input
                      value={taxi.collectionTime || ""}
                      onChange={(e) => updateAirportTaxi(index, "collectionTime", e.target.value)}
                      placeholder="e.g., 12:00"
                      data-testid={`input-return-airport-taxi-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={taxi.pickupLocation || ""}
                      onChange={(e) => updateAirportTaxi(index, "pickupLocation", e.target.value)}
                      data-testid={`input-return-airport-taxi-pickup-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={taxi.paymentStatus || ""}
                      onValueChange={(value) => updateAirportTaxi(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-return-airport-taxi-payment-${index}`}>
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
              data-testid="button-add-return-airport-taxi"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Taxi
            </Button>
          </div>
        )}

        {transferToAirportType === "train" && (
          <div className="space-y-4">
            {(data.returnTravel.transferToAirportTrains || []).map((train, index) => (
              <Card key={train.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Train {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAirportTrain(index)}
                    data-testid={`button-remove-return-airport-train-${index}`}
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
                      placeholder="e.g., Albufeira-Ferreiras"
                      data-testid={`input-return-airport-train-departing-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Station</Label>
                    <Input
                      value={train.arrivalStation || ""}
                      onChange={(e) => updateAirportTrain(index, "arrivalStation", e.target.value)}
                      placeholder="e.g., Faro Airport"
                      data-testid={`input-return-airport-train-arrival-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={train.departureTime || ""}
                      onChange={(e) => updateAirportTrain(index, "departureTime", e.target.value)}
                      placeholder="e.g., 10:00"
                      data-testid={`input-return-airport-train-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Train Provider</Label>
                    <Input
                      value={train.provider || ""}
                      onChange={(e) => updateAirportTrain(index, "provider", e.target.value)}
                      placeholder="e.g., CP (Comboios de Portugal)"
                      data-testid={`input-return-airport-train-provider-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Booking Reference</Label>
                    <Input
                      value={train.bookingRef || ""}
                      onChange={(e) => updateAirportTrain(index, "bookingRef", e.target.value)}
                      data-testid={`input-return-airport-train-booking-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={train.paymentStatus || ""}
                      onValueChange={(value) => updateAirportTrain(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-return-airport-train-payment-${index}`}>
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
                    data-testid={`textarea-return-airport-train-notes-${index}`}
                  />
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addAirportTrain}
              className="w-full"
              data-testid="button-add-return-airport-train"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Train
            </Button>
          </div>
        )}
      </div>

      {/* Return Flight */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Return Flight</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isMultiLegReturn"
              checked={isMultiLeg}
              onCheckedChange={toggleMultiLeg}
              data-testid="checkbox-multi-leg-return"
            />
            <Label htmlFor="isMultiLegReturn" className="cursor-pointer text-sm">
              Connecting Flight
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnFlightDate">Flight Date</Label>
          <Input
            id="returnFlightDate"
            value={data.returnTravel.flightDate}
            onChange={(e) => updateReturn("flightDate", e.target.value)}
            placeholder="e.g., 22nd June 2024"
            data-testid="input-return-flight-date"
          />
        </div>

        {!isMultiLeg ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="returnFlightNumber">Flight Number</Label>
              <Input
                id="returnFlightNumber"
                value={data.returnTravel.flightNumber}
                onChange={(e) => updateReturn("flightNumber", e.target.value)}
                placeholder="e.g., BA456"
                data-testid="input-return-flight-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDepartureAirport">Departure Airport</Label>
              <Input
                id="returnDepartureAirport"
                value={data.returnTravel.departureAirport}
                onChange={(e) => updateReturn("departureAirport", e.target.value)}
                placeholder="e.g., Faro Airport"
                data-testid="input-return-departure-airport"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDepartureTime">Departure Time</Label>
              <Input
                id="returnDepartureTime"
                value={data.returnTravel.departureTime}
                onChange={(e) => updateReturn("departureTime", e.target.value)}
                placeholder="e.g., 18:30"
                data-testid="input-return-departure-time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnArrivalAirport">Arrival Airport</Label>
              <Input
                id="returnArrivalAirport"
                value={data.returnTravel.arrivalAirport}
                onChange={(e) => updateReturn("arrivalAirport", e.target.value)}
                placeholder="e.g., London Heathrow"
                data-testid="input-return-arrival-airport"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnArrivalTime">Arrival Time</Label>
              <Input
                id="returnArrivalTime"
                value={data.returnTravel.arrivalTime}
                onChange={(e) => updateReturn("arrivalTime", e.target.value)}
                placeholder="e.g., 20:00"
                data-testid="input-return-arrival-time"
              />
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Add each flight leg in your journey. The layover duration will be shown between legs.
            </p>
            
            {(data.returnTravel.legs || []).map((leg, index) => (
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
                  {(data.returnTravel.legs || []).length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFlightLeg(index)}
                      data-testid={`button-remove-return-leg-${index}`}
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
                      placeholder="e.g., BA456"
                      data-testid={`input-return-leg-flight-number-${index}`}
                    />
                  </div>
                  {index > 0 && (
                    <div className="space-y-2">
                      <Label>Layover Duration</Label>
                      <Input
                        value={leg.layoverDuration || ""}
                        onChange={(e) => updateFlightLeg(index, "layoverDuration", e.target.value)}
                        placeholder="e.g., 2h 30m"
                        data-testid={`input-return-leg-layover-${index}`}
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
                      placeholder="e.g., Faro Airport"
                      data-testid={`input-return-leg-departure-airport-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={leg.departureTime}
                      onChange={(e) => updateFlightLeg(index, "departureTime", e.target.value)}
                      placeholder="e.g., 14:30"
                      data-testid={`input-return-leg-departure-time-${index}`}
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
                      data-testid={`input-return-leg-arrival-airport-${index}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Arrival Time</Label>
                    <Input
                      value={leg.arrivalTime}
                      onChange={(e) => updateFlightLeg(index, "arrivalTime", e.target.value)}
                      placeholder="e.g., 17:15"
                      data-testid={`input-return-leg-arrival-time-${index}`}
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
              data-testid="button-add-return-flight-leg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Flight Leg
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="returnPassengersSeats">Passengers & Seats</Label>
          <Textarea
            id="returnPassengersSeats"
            value={data.returnTravel.passengersSeats}
            onChange={(e) => updateReturn("passengersSeats", e.target.value)}
            placeholder="e.g., Seat 15A - John Smith, Seat 15B - Jane Smith"
            data-testid="textarea-return-passengers-seats"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnThingsToRemember">Things to Remember</Label>
          <Textarea
            id="returnThingsToRemember"
            value={data.returnTravel.thingsToRemember}
            onChange={(e) => updateReturn("thingsToRemember", e.target.value)}
            placeholder="e.g., Check-in opens 24 hours before departure"
            data-testid="textarea-return-things-to-remember"
          />
        </div>
      </div>

      {/* Transfer Home */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Transfer Home</h3>
        
        <div className="space-y-2">
          <Label htmlFor="transferHomeType">Transport Type</Label>
          <Select
            value={transferHomeType}
            onValueChange={(value) => updateReturn("transferHomeType", value)}
          >
            <SelectTrigger data-testid="select-transfer-home-type">
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

        {transferHomeType === "taxi" && (
          <div className="space-y-4">
            {(data.returnTravel.transferHomeTaxis || []).map((taxi, index) => (
              <Card key={taxi.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Taxi {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHomeTaxi(index)}
                    data-testid={`button-remove-home-taxi-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={taxi.company || ""}
                      onChange={(e) => updateHomeTaxi(index, "company", e.target.value)}
                      data-testid={`input-home-taxi-company-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Input
                      value={taxi.contact || ""}
                      onChange={(e) => updateHomeTaxi(index, "contact", e.target.value)}
                      data-testid={`input-home-taxi-contact-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Collection Time</Label>
                    <Input
                      value={taxi.collectionTime || ""}
                      onChange={(e) => updateHomeTaxi(index, "collectionTime", e.target.value)}
                      placeholder="e.g., 21:00"
                      data-testid={`input-home-taxi-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={taxi.pickupLocation || ""}
                      onChange={(e) => updateHomeTaxi(index, "pickupLocation", e.target.value)}
                      placeholder="e.g., Airport Arrivals Hall"
                      data-testid={`input-home-taxi-pickup-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={taxi.paymentStatus || ""}
                      onValueChange={(value) => updateHomeTaxi(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-home-taxi-payment-${index}`}>
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
              onClick={addHomeTaxi}
              className="w-full"
              data-testid="button-add-home-taxi"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Taxi
            </Button>
          </div>
        )}

        {transferHomeType === "train" && (
          <div className="space-y-4">
            {(data.returnTravel.transferHomeTrains || []).map((train, index) => (
              <Card key={train.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Train {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHomeTrain(index)}
                    data-testid={`button-remove-home-train-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departing Station</Label>
                    <Input
                      value={train.departingStation || ""}
                      onChange={(e) => updateHomeTrain(index, "departingStation", e.target.value)}
                      placeholder="e.g., Gatwick Airport"
                      data-testid={`input-home-train-departing-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Arrival Station</Label>
                    <Input
                      value={train.arrivalStation || ""}
                      onChange={(e) => updateHomeTrain(index, "arrivalStation", e.target.value)}
                      placeholder="e.g., London Victoria"
                      data-testid={`input-home-train-arrival-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input
                      value={train.departureTime || ""}
                      onChange={(e) => updateHomeTrain(index, "departureTime", e.target.value)}
                      placeholder="e.g., 21:30"
                      data-testid={`input-home-train-time-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Train Provider</Label>
                    <Input
                      value={train.provider || ""}
                      onChange={(e) => updateHomeTrain(index, "provider", e.target.value)}
                      placeholder="e.g., Gatwick Express"
                      data-testid={`input-home-train-provider-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Booking Reference</Label>
                    <Input
                      value={train.bookingRef || ""}
                      onChange={(e) => updateHomeTrain(index, "bookingRef", e.target.value)}
                      data-testid={`input-home-train-booking-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Status</Label>
                    <Select
                      value={train.paymentStatus || ""}
                      onValueChange={(value) => updateHomeTrain(index, "paymentStatus", value)}
                    >
                      <SelectTrigger data-testid={`select-home-train-payment-${index}`}>
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
                    onChange={(e) => updateHomeTrain(index, "notes", e.target.value)}
                    placeholder="Any additional notes"
                    data-testid={`textarea-home-train-notes-${index}`}
                  />
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addHomeTrain}
              className="w-full"
              data-testid="button-add-home-train"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Train
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
