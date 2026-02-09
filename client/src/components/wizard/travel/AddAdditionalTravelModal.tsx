/**
 * AddAdditionalTravelModal - Modal for adding/editing additional travel
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plane, Train, Bus, Ship, Car, Key, ArrowRight, Plus, Trash2, Clock } from "lucide-react";
import type {
  AdditionalTravelSegment,
  AdditionalTransportType,
  TransportLeg,
} from "@/lib/travel-types";
import {
  generateId,
  createEmptyLeg,
  calculateLayover,
  getTransportHubName,
} from "@/lib/travel-types";

interface AddAdditionalTravelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (segment: AdditionalTravelSegment) => void;
  editSegment?: AdditionalTravelSegment | null;
  destinations: Array<{ id?: string; name: string }>;
}

const TRANSPORT_TYPES: { value: AdditionalTransportType; label: string; icon: React.ReactNode }[] = [
  { value: 'flight', label: 'Flight', icon: <Plane className="w-4 h-4" /> },
  { value: 'train', label: 'Train', icon: <Train className="w-4 h-4" /> },
  { value: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" /> },
  { value: 'ferry', label: 'Ferry', icon: <Ship className="w-4 h-4" /> },
  { value: 'taxi', label: 'Taxi', icon: <Car className="w-4 h-4" /> },
  { value: 'private_transfer', label: 'Private Transfer', icon: <Car className="w-4 h-4" /> },
  { value: 'shuttle', label: 'Shuttle', icon: <Car className="w-4 h-4" /> },
  { value: 'car_rental', label: 'Car Rental', icon: <Key className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <ArrowRight className="w-4 h-4" /> },
];

const TYPES_WITH_CONNECTING = ['flight', 'train', 'bus', 'ferry'];

export function AddAdditionalTravelModal({
  isOpen,
  onClose,
  onSave,
  editSegment,
  destinations,
}: AddAdditionalTravelModalProps) {
  const [segment, setSegment] = useState<AdditionalTravelSegment>({
    id: generateId(),
    type: 'flight',
    date: '',
    fromLocation: '',
    toLocation: '',
  });

  useEffect(() => {
    if (editSegment) {
      setSegment(editSegment);
    } else {
      setSegment({
        id: generateId(),
        type: 'flight',
        date: '',
        fromLocation: '',
        toLocation: '',
      });
    }
  }, [editSegment, isOpen]);

  const handleFieldChange = (field: keyof AdditionalTravelSegment, value: any) => {
    setSegment((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: AdditionalTransportType) => {
    setSegment((prev) => ({
      ...prev,
      type,
      isConnecting: false,
      legs: undefined,
    }));
  };

  const handleConnectingChange = (checked: boolean) => {
    if (checked) {
      setSegment((prev) => ({
        ...prev,
        isConnecting: true,
        legs: [createEmptyLeg(1), createEmptyLeg(2)],
      }));
    } else {
      setSegment((prev) => ({
        ...prev,
        isConnecting: false,
        legs: undefined,
      }));
    }
  };

  const handleLegChange = (legIndex: number, field: keyof TransportLeg, value: string) => {
    if (!segment.legs) return;
    const newLegs = [...segment.legs];
    newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };
    setSegment((prev) => ({ ...prev, legs: newLegs }));
  };

  const addLeg = () => {
    const newLegNumber = (segment.legs?.length || 0) + 1;
    setSegment((prev) => ({
      ...prev,
      legs: [...(prev.legs || []), createEmptyLeg(newLegNumber)],
    }));
  };

  const removeLeg = (index: number) => {
    if (!segment.legs || segment.legs.length <= 2) return;
    const newLegs = segment.legs
      .filter((_, i) => i !== index)
      .map((leg, i) => ({ ...leg, legNumber: i + 1 }));
    setSegment((prev) => ({ ...prev, legs: newLegs }));
  };

  const handleSave = () => {
    onSave(segment);
    onClose();
  };

  const supportsConnecting = TYPES_WITH_CONNECTING.includes(segment.type);
  const isFlight = segment.type === 'flight';
  const hubName = getTransportHubName(segment.type);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editSegment ? 'Edit Travel' : 'Add Additional Travel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transport Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Transport Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSPORT_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={segment.type === t.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeChange(t.value)}
                  className="h-9 justify-start"
                >
                  {t.icon}
                  <span className="ml-2">{t.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Date and Destination Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Date</Label>
              <Input
                type="date"
                value={segment.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Assign to Destination (Optional)</Label>
              <select
                value={segment.destinationId || ''}
                onChange={(e) => handleFieldChange('destinationId', e.target.value || undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Unassigned</option>
                {destinations.map((dest, index) => (
                  <option key={dest.id || index} value={dest.id || dest.name}>
                    {dest.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Connecting toggle for supported types */}
          {supportsConnecting && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isConnecting"
                checked={segment.isConnecting || false}
                onCheckedChange={handleConnectingChange}
              />
              <Label htmlFor="isConnecting" className="text-sm cursor-pointer">
                {isFlight ? 'Connecting flight (multiple legs)' : 'Multiple legs / connections'}
              </Label>
            </div>
          )}

          {/* Route - Simple or Multi-leg */}
          {segment.isConnecting && segment.legs ? (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Journey Legs</Label>
              {segment.legs.map((leg, index) => (
                <div key={leg.id}>
                  {/* Layover indicator */}
                  {index > 0 && (
                    <div className="flex items-center justify-center py-2 my-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-xs">
                        <Clock className="w-3 h-3" />
                        {calculateLayover(
                          segment.legs![index - 1].arrivalTime,
                          leg.departureTime
                        ) || 'Layover'}
                      </div>
                    </div>
                  )}

                  <div className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Leg {leg.legNumber}</span>
                      {segment.legs!.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLeg(index)}
                          className="h-7 w-7 p-0 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {isFlight && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Flight Number</Label>
                          <Input
                            value={leg.flightNumber || ''}
                            onChange={(e) => handleLegChange(index, 'flightNumber', e.target.value)}
                            placeholder="e.g., BA123"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Airline</Label>
                          <Input
                            value={leg.airline || ''}
                            onChange={(e) => handleLegChange(index, 'airline', e.target.value)}
                            placeholder="e.g., British Airways"
                          />
                        </div>
                      </div>
                    )}

                    {!isFlight && (
                      <div className="space-y-1">
                        <Label className="text-xs">Company</Label>
                        <Input
                          value={leg.company || ''}
                          onChange={(e) => handleLegChange(index, 'company', e.target.value)}
                          placeholder="e.g., Eurostar"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isFlight ? 'Departure Airport' : `Departure ${hubName}`}
                        </Label>
                        <Input
                          value={isFlight ? (leg.departureAirport || '') : (leg.departureStation || '')}
                          onChange={(e) => handleLegChange(
                            index,
                            isFlight ? 'departureAirport' : 'departureStation',
                            e.target.value
                          )}
                          placeholder={isFlight ? 'e.g., LHR' : `e.g., London ${hubName}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Departure Time</Label>
                        <Input
                          type="time"
                          value={leg.departureTime}
                          onChange={(e) => handleLegChange(index, 'departureTime', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {isFlight ? 'Arrival Airport' : `Arrival ${hubName}`}
                        </Label>
                        <Input
                          value={isFlight ? (leg.arrivalAirport || '') : (leg.arrivalStation || '')}
                          onChange={(e) => handleLegChange(
                            index,
                            isFlight ? 'arrivalAirport' : 'arrivalStation',
                            e.target.value
                          )}
                          placeholder={isFlight ? 'e.g., JFK' : `e.g., Paris ${hubName}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Arrival Time</Label>
                        <Input
                          type="time"
                          value={leg.arrivalTime}
                          onChange={(e) => handleLegChange(index, 'arrivalTime', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLeg}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Leg
              </Button>
            </div>
          ) : (
            /* Simple route */
            <div className="space-y-4">
              {/* Flight-specific fields */}
              {isFlight && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Flight Number</Label>
                    <Input
                      value={segment.flightNumber || ''}
                      onChange={(e) => handleFieldChange('flightNumber', e.target.value)}
                      placeholder="e.g., BA123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Airline</Label>
                    <Input
                      value={segment.airline || ''}
                      onChange={(e) => handleFieldChange('airline', e.target.value)}
                      placeholder="e.g., British Airways"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">From</Label>
                  <Input
                    value={segment.fromLocation}
                    onChange={(e) => handleFieldChange('fromLocation', e.target.value)}
                    placeholder={isFlight ? 'e.g., London Heathrow (LHR)' : 'e.g., London'}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">To</Label>
                  <Input
                    value={segment.toLocation}
                    onChange={(e) => handleFieldChange('toLocation', e.target.value)}
                    placeholder={isFlight ? 'e.g., Paris CDG (CDG)' : 'e.g., Paris'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Departure Time</Label>
                  <Input
                    type="time"
                    value={segment.departureTime || ''}
                    onChange={(e) => handleFieldChange('departureTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Arrival Time</Label>
                  <Input
                    type="time"
                    value={segment.arrivalTime || ''}
                    onChange={(e) => handleFieldChange('arrivalTime', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Company / Operator</Label>
              <Input
                value={segment.company || ''}
                onChange={(e) => handleFieldChange('company', e.target.value)}
                placeholder="e.g., British Airways"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Booking Reference</Label>
              <Input
                value={segment.bookingReference || ''}
                onChange={(e) => handleFieldChange('bookingReference', e.target.value)}
                placeholder="e.g., ABC123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Contact</Label>
              <Input
                value={segment.contact || ''}
                onChange={(e) => handleFieldChange('contact', e.target.value)}
                placeholder="e.g., +44 123 456 7890"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Price</Label>
              <Input
                value={segment.price || ''}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                placeholder="e.g., £150"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={segment.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {editSegment ? 'Save Changes' : 'Add Travel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
