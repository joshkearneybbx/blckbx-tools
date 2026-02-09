/**
 * EditTransferModal - Modal for adding/editing a transfer
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transfer' : 'Add Transfer'}
          </DialogTitle>
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
              <Label className="text-sm">Pickup Location</Label>
              <Input
                value={formData.pickupLocation}
                onChange={(e) => handleChange('pickupLocation', e.target.value)}
                placeholder="e.g., Home, Hotel lobby"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pickup Time</Label>
              <Input
                type="time"
                value={formData.pickupTime}
                onChange={(e) => handleChange('pickupTime', e.target.value)}
              />
            </div>
          </div>

          {/* Drop-off Location */}
          <div className="space-y-2">
            <Label className="text-sm">Drop-off Location</Label>
            <Input
              value={formData.dropoffLocation}
              onChange={(e) => handleChange('dropoffLocation', e.target.value)}
              placeholder="e.g., Airport Terminal 2, Train Station"
            />
          </div>

          {/* Company and Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Company / Driver</Label>
              <Input
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="e.g., Uber, Local Taxi Co."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Contact</Label>
              <Input
                value={formData.contact || ''}
                onChange={(e) => handleChange('contact', e.target.value)}
                placeholder="e.g., +44 123 456 7890"
              />
            </div>
          </div>

          {/* Booking Reference and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Booking Reference</Label>
              <Input
                value={formData.bookingReference || ''}
                onChange={(e) => handleChange('bookingReference', e.target.value)}
                placeholder="e.g., ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Price</Label>
              <Input
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="e.g., £25"
              />
            </div>
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
