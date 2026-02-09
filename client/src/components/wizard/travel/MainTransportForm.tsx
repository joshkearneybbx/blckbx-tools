/**
 * MainTransportForm - Form for main transport with connecting leg support
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plane, Train, Bus, Ship, Plus, Trash2, ArrowRight, Clock } from "lucide-react";
import type { MainTransport, MainTransportType, TransportLeg } from "@/lib/travel-types";
import { createEmptyLeg, calculateLayover, getTransportHubName } from "@/lib/travel-types";

interface MainTransportFormProps {
  transport: MainTransport | undefined;
  onChange: (transport: MainTransport) => void;
}

const TRANSPORT_TYPES: { value: MainTransportType; label: string; icon: React.ReactNode }[] = [
  { value: 'flight', label: 'Flight', icon: <Plane className="w-4 h-4" /> },
  { value: 'train', label: 'Train', icon: <Train className="w-4 h-4" /> },
  { value: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" /> },
  { value: 'ferry', label: 'Ferry', icon: <Ship className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <ArrowRight className="w-4 h-4" /> },
];

export function MainTransportForm({ transport, onChange }: MainTransportFormProps) {
  if (!transport) return null;

  const handleFieldChange = (field: keyof MainTransport, value: any) => {
    onChange({ ...transport, [field]: value });
  };

  const handleTypeChange = (type: MainTransportType) => {
    // Reset legs when changing type
    onChange({
      ...transport,
      type,
      legs: [createEmptyLeg(1)],
      isConnecting: false,
    });
  };

  const handleConnectingChange = (checked: boolean) => {
    if (checked && transport.legs.length === 1) {
      // Add a second leg when enabling connecting
      onChange({
        ...transport,
        isConnecting: checked,
        legs: [...transport.legs, createEmptyLeg(2)],
      });
    } else {
      // Keep only first leg when disabling
      onChange({
        ...transport,
        isConnecting: checked,
        legs: checked ? transport.legs : [transport.legs[0]],
      });
    }
  };

  const handleLegChange = (legIndex: number, field: keyof TransportLeg, value: string) => {
    const newLegs = [...transport.legs];
    newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };
    onChange({ ...transport, legs: newLegs });
  };

  const addLeg = () => {
    const newLegNumber = transport.legs.length + 1;
    onChange({
      ...transport,
      legs: [...transport.legs, createEmptyLeg(newLegNumber)],
    });
  };

  const removeLeg = (index: number) => {
    if (transport.legs.length <= 1) return;
    const newLegs = transport.legs
      .filter((_, i) => i !== index)
      .map((leg, i) => ({ ...leg, legNumber: i + 1 }));
    onChange({
      ...transport,
      legs: newLegs,
      isConnecting: newLegs.length > 1,
    });
  };

  const hubName = getTransportHubName(transport.type);
  const isFlight = transport.type === 'flight';
  const transportIcon = TRANSPORT_TYPES.find(t => t.value === transport.type)?.icon;

  return (
    <Card className="border-stone-200 dark:border-stone-800">
      <CardHeader className="py-3 px-4 bg-stone-900 text-white rounded-t-lg">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {transportIcon}
          Main Transport
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 pb-4 px-4 space-y-4">
        {/* Transport Type Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Transport Type</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_TYPES.map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={transport.type === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeChange(t.value)}
                className="h-8"
              >
                {t.icon}
                <span className="ml-1.5">{t.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs font-medium">Date</Label>
          <Input
            id="date"
            type="date"
            value={transport.date}
            onChange={(e) => handleFieldChange('date', e.target.value)}
          />
        </div>

        {/* Connecting toggle */}
        <div className="flex items-center space-x-2 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <Checkbox
            id="isConnecting"
            checked={transport.isConnecting}
            onCheckedChange={handleConnectingChange}
          />
          <Label htmlFor="isConnecting" className="text-sm cursor-pointer">
            {isFlight ? 'Connecting flight (multiple legs with layovers)' : 'Multiple legs / connections'}
          </Label>
        </div>

        {/* Transport Legs */}
        <div className="space-y-3">
          {transport.legs.map((leg, index) => (
            <div key={leg.id}>
              {/* Layover indicator between legs */}
              {index > 0 && (
                <div className="flex items-center justify-center py-3">
                  <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-xs font-medium mx-3">
                    <Clock className="w-3.5 h-3.5" />
                    {calculateLayover(
                      transport.legs[index - 1].arrivalTime,
                      leg.departureTime
                    ) || '—'} layover
                  </div>
                  <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                </div>
              )}

              <div className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
                {/* Leg Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-stone-50 dark:bg-stone-800/50">
                  <div className="flex items-center gap-2">
                    {transportIcon}
                    <span className="text-sm font-medium">
                      {transport.isConnecting ? `Leg ${leg.legNumber}` : (isFlight ? 'Flight Details' : 'Journey Details')}
                    </span>
                  </div>
                  {transport.legs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLeg(index)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Leg Content */}
                <div className="p-4 space-y-4">
                  {/* Flight-specific fields */}
                  {isFlight && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Flight Number</Label>
                        <Input
                          value={leg.flightNumber || ''}
                          onChange={(e) => handleLegChange(index, 'flightNumber', e.target.value)}
                          placeholder="e.g., BA123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Airline</Label>
                        <Input
                          value={leg.airline || ''}
                          onChange={(e) => handleLegChange(index, 'airline', e.target.value)}
                          placeholder="e.g., British Airways"
                        />
                      </div>
                    </div>
                  )}

                  {/* Non-flight company field */}
                  {!isFlight && (
                    <div className="space-y-2">
                      <Label className="text-xs">Company / Operator</Label>
                      <Input
                        value={leg.company || ''}
                        onChange={(e) => handleLegChange(index, 'company', e.target.value)}
                        placeholder={`e.g., ${transport.type === 'train' ? 'Eurostar' : transport.type === 'ferry' ? 'P&O Ferries' : 'National Express'}`}
                      />
                    </div>
                  )}

                  {/* Departure */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                        placeholder={isFlight ? 'e.g., London Heathrow (LHR)' : `e.g., London ${hubName}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Departure Time</Label>
                      <Input
                        type="time"
                        value={leg.departureTime}
                        onChange={(e) => handleLegChange(index, 'departureTime', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
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
                        placeholder={isFlight ? 'e.g., New York JFK (JFK)' : `e.g., Paris ${hubName}`}
                      />
                    </div>
                    <div className="space-y-2">
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
            </div>
          ))}
        </div>

        {/* Add Another Leg button */}
        {transport.isConnecting && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLeg}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another {isFlight ? 'Flight' : ''} Leg
          </Button>
        )}

        {/* Common fields */}
        <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Passengers & Seats</Label>
              <Input
                value={transport.passengersAndSeats || ''}
                onChange={(e) => handleFieldChange('passengersAndSeats', e.target.value)}
                placeholder="e.g., 2 Adults, Seats 12A & 12B"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Booking Reference</Label>
              <Input
                value={transport.bookingReference || ''}
                onChange={(e) => handleFieldChange('bookingReference', e.target.value)}
                placeholder="e.g., ABC123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Contact</Label>
            <Input
              value={transport.contact || ''}
              onChange={(e) => handleFieldChange('contact', e.target.value)}
              placeholder="e.g., Airline customer service number"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Things to Remember / Notes</Label>
            <Textarea
              value={transport.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="e.g., Check-in opens 24h before, bring printed boarding pass"
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
