/**
 * EditTransferModal - Modal for adding/editing a transfer
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Car, Train, Bus } from "lucide-react";
import type { TransferSegment, TransferType } from "@/lib/travel-types";
import { generateId } from "@/lib/travel-types";

interface EditTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transfer: TransferSegment) => void;
  transfer: TransferSegment | null;
}

const TRANSFER_TYPES: { value: TransferType; label: string; icon: React.ReactNode }[] = [
  { value: 'taxi', label: 'Taxi', icon: <Car className="w-4 h-4" /> },
  { value: 'private_car', label: 'Private Car', icon: <Car className="w-4 h-4" /> },
  { value: 'shuttle', label: 'Shuttle', icon: <Car className="w-4 h-4" /> },
  { value: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" /> },
  { value: 'train', label: 'Train', icon: <Train className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Car className="w-4 h-4" /> },
];

const TRANSFER_FIELD_CONFIG: Record<
  TransferType,
  {
    pickupLabel: string;
    pickupPlaceholder: string;
    timeLabel: string;
    dropoffLabel: string;
    dropoffPlaceholder: string;
    operatorLabel: string;
    operatorPlaceholder: string;
    bookingLabel: string;
    bookingPlaceholder: string;
    showContact: boolean;
    contactLabel: string;
    contactPlaceholder: string;
    showPrice: boolean;
    showVehicleRegistration: boolean;
  }
> = {
  taxi: {
    pickupLabel: "Pickup Location",
    pickupPlaceholder: "e.g., Home, Hotel lobby",
    timeLabel: "Pickup Time",
    dropoffLabel: "Drop-off Location",
    dropoffPlaceholder: "e.g., Airport Terminal 2",
    operatorLabel: "Company / Driver",
    operatorPlaceholder: "e.g., Uber, Local Taxi Co.",
    bookingLabel: "Booking Reference",
    bookingPlaceholder: "e.g., ABC123",
    showContact: true,
    contactLabel: "Contact",
    contactPlaceholder: "e.g., +44 123 456 7890",
    showPrice: true,
    showVehicleRegistration: false,
  },
  private_car: {
    pickupLabel: "Pickup Address",
    pickupPlaceholder: "e.g., 12 King St, Paris",
    timeLabel: "Pickup Time",
    dropoffLabel: "Drop-off Address",
    dropoffPlaceholder: "e.g., 8 Rue de Rivoli, Paris",
    operatorLabel: "Driver",
    operatorPlaceholder: "e.g., John Smith",
    bookingLabel: "Booking Reference",
    bookingPlaceholder: "e.g., CAR-9482",
    showContact: true,
    contactLabel: "Driver Contact",
    contactPlaceholder: "e.g., +44 123 456 7890",
    showPrice: true,
    showVehicleRegistration: true,
  },
  shuttle: {
    pickupLabel: "Pickup Point",
    pickupPlaceholder: "e.g., Hotel reception",
    timeLabel: "Pickup Time",
    dropoffLabel: "Drop-off Point",
    dropoffPlaceholder: "e.g., Airport Departures",
    operatorLabel: "Shuttle Provider",
    operatorPlaceholder: "e.g., Hilton Shuttle",
    bookingLabel: "Shuttle Reference",
    bookingPlaceholder: "e.g., SHUT-2241",
    showContact: true,
    contactLabel: "Contact",
    contactPlaceholder: "e.g., +44 123 456 7890",
    showPrice: true,
    showVehicleRegistration: false,
  },
  bus: {
    pickupLabel: "Departure Stop",
    pickupPlaceholder: "e.g., Victoria Coach Station",
    timeLabel: "Departure Time",
    dropoffLabel: "Arrival Stop",
    dropoffPlaceholder: "e.g., Charles de Gaulle Bus Terminal",
    operatorLabel: "Bus Operator",
    operatorPlaceholder: "e.g., FlixBus",
    bookingLabel: "Ticket Number",
    bookingPlaceholder: "e.g., BUS-1918",
    showContact: false,
    contactLabel: "Contact",
    contactPlaceholder: "",
    showPrice: false,
    showVehicleRegistration: false,
  },
  train: {
    pickupLabel: "Departure Station",
    pickupPlaceholder: "e.g., Gare du Nord",
    timeLabel: "Departure Time",
    dropoffLabel: "Arrival Station",
    dropoffPlaceholder: "e.g., Lyon Part-Dieu",
    operatorLabel: "Train Operator",
    operatorPlaceholder: "e.g., SNCF",
    bookingLabel: "Ticket Reference",
    bookingPlaceholder: "e.g., TGV-9021",
    showContact: false,
    contactLabel: "Contact",
    contactPlaceholder: "",
    showPrice: false,
    showVehicleRegistration: false,
  },
  other: {
    pickupLabel: "From",
    pickupPlaceholder: "e.g., City Center",
    timeLabel: "Departure Time",
    dropoffLabel: "To",
    dropoffPlaceholder: "e.g., Conference Venue",
    operatorLabel: "Operator / Provider",
    operatorPlaceholder: "e.g., Local Transport",
    bookingLabel: "Reference",
    bookingPlaceholder: "e.g., REF-1002",
    showContact: true,
    contactLabel: "Contact",
    contactPlaceholder: "e.g., +44 123 456 7890",
    showPrice: false,
    showVehicleRegistration: false,
  },
};

export function EditTransferModal({
  isOpen,
  onClose,
  onSave,
  transfer,
}: EditTransferModalProps) {
  const [formData, setFormData] = useState<TransferSegment>({
    id: generateId(),
    order: 0,
    type: 'taxi',
    pickupLocation: '',
    pickupTime: '',
    dropoffLocation: '',
  });

  useEffect(() => {
    if (transfer) {
      setFormData(transfer);
    } else {
      setFormData({
        id: generateId(),
        order: 0,
        type: 'taxi',
        pickupLocation: '',
        pickupTime: '',
        dropoffLocation: '',
      });
    }
  }, [transfer, isOpen]);

  const handleChange = (field: keyof TransferSegment, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: TransferType) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const isEditing = transfer && transfer.pickupLocation;
  const config = TRANSFER_FIELD_CONFIG[formData.type];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transfer' : 'Add Transfer'}
          </DialogTitle>
          <DialogDescription>
            Add transfer details for this journey segment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transfer Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Transfer Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSFER_TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={formData.type === t.value ? "default" : "outline"}
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

          {/* Pickup Location and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{config.pickupLabel}</Label>
              <Input
                value={formData.pickupLocation}
                onChange={(e) => handleChange('pickupLocation', e.target.value)}
                placeholder={config.pickupPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{config.timeLabel}</Label>
              <Input
                type="time"
                value={formData.pickupTime}
                onChange={(e) => handleChange('pickupTime', e.target.value)}
              />
            </div>
          </div>

          {/* Drop-off Location */}
          <div className="space-y-2">
            <Label className="text-sm">{config.dropoffLabel}</Label>
            <Input
              value={formData.dropoffLocation}
              onChange={(e) => handleChange('dropoffLocation', e.target.value)}
              placeholder={config.dropoffPlaceholder}
            />
          </div>

          {/* Company and Contact */}
          <div className={`grid gap-4 ${config.showContact ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2">
              <Label className="text-sm">{config.operatorLabel}</Label>
              <Input
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder={config.operatorPlaceholder}
              />
            </div>
            {config.showContact && (
              <div className="space-y-2">
                <Label className="text-sm">{config.contactLabel}</Label>
                <Input
                  value={formData.contact || ''}
                  onChange={(e) => handleChange('contact', e.target.value)}
                  placeholder={config.contactPlaceholder}
                />
              </div>
            )}
          </div>

          {config.showVehicleRegistration && (
            <div className="space-y-2">
              <Label className="text-sm">Number Plate</Label>
              <Input
                value={formData.vehicleRegistration || ''}
                onChange={(e) => handleChange('vehicleRegistration', e.target.value)}
                placeholder="e.g., AB12 CDE"
              />
            </div>
          )}

          {/* Booking Reference and Price */}
          <div className={`grid gap-4 ${config.showPrice ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-2">
              <Label className="text-sm">{config.bookingLabel}</Label>
              <Input
                value={formData.bookingReference || ''}
                onChange={(e) => handleChange('bookingReference', e.target.value)}
                placeholder={config.bookingPlaceholder}
              />
            </div>
            {config.showPrice && (
              <div className="space-y-2">
                <Label className="text-sm">Price</Label>
                <Input
                  value={formData.price || ''}
                  onChange={(e) => handleChange('price', e.target.value)}
                  placeholder="e.g., £25"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Add Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
