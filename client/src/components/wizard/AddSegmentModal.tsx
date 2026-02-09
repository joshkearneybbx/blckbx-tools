/**
 * AddSegmentModal - Modal for adding/editing travel segments
 *
 * Provides a form to create or modify travel segments with
 * dynamic fields based on segment type.
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TravelSegment, SegmentType } from '@/lib/travel-segments';

interface AddSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (segment: TravelSegment) => void;
  editSegment?: TravelSegment | null;
}

const SEGMENT_TYPES: { value: SegmentType; label: string; icon: string }[] = [
  { value: 'flight', label: 'Flight', icon: '✈️' },
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'ferry', label: 'Ferry', icon: '⛴️' },
  { value: 'taxi', label: 'Taxi', icon: '🚕' },
  { value: 'private_transfer', label: 'Private Transfer', icon: '🚗' },
  { value: 'shuttle', label: 'Shuttle', icon: '🚐' },
  { value: 'car_rental', label: 'Car Rental', icon: '🔑' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export function AddSegmentModal({ isOpen, onClose, onAdd, editSegment }: AddSegmentModalProps) {
  const [type, setType] = useState<SegmentType>('flight');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [company, setCompany] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when opening/closing or changing edit mode
  useEffect(() => {
    if (editSegment) {
      setType(editSegment.type);
      setFromLocation(editSegment.fromLocation || '');
      setToLocation(editSegment.toLocation || '');
      setDate(editSegment.date || '');
      setDepartureTime(editSegment.departureTime || '');
      setArrivalTime(editSegment.arrivalTime || '');
      setFlightNumber(editSegment.flightNumber || '');
      setAirline(editSegment.airline || '');
      setCompany(editSegment.company || '');
      setBookingReference(editSegment.bookingReference || '');
      setConfirmationNumber(editSegment.confirmationNumber || '');
      setContactDetails(editSegment.contactDetails || '');
      setPrice(editSegment.price || '');
      setNotes(editSegment.notes || '');
    } else {
      resetForm();
    }
  }, [editSegment, isOpen]);

  const resetForm = () => {
    setType('flight');
    setFromLocation('');
    setToLocation('');
    setDate('');
    setDepartureTime('');
    setArrivalTime('');
    setFlightNumber('');
    setAirline('');
    setCompany('');
    setBookingReference('');
    setConfirmationNumber('');
    setContactDetails('');
    setPrice('');
    setNotes('');
  };

  const handleSubmit = () => {
    const segment: TravelSegment = {
      id: editSegment?.id || `segment-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      fromLocation,
      toLocation,
      date,
      departureTime: departureTime || undefined,
      arrivalTime: arrivalTime || undefined,
      flightNumber: type === 'flight' ? flightNumber : undefined,
      airline: type === 'flight' ? airline : undefined,
      company: type !== 'flight' ? company : undefined,
      bookingReference: bookingReference || undefined,
      confirmationNumber: confirmationNumber || undefined,
      contactDetails: contactDetails || undefined,
      price: price || undefined,
      notes: notes || undefined,
    };

    onAdd(segment);
    resetForm();
    onClose();
  };

  const isFormValid = fromLocation && toLocation && date;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editSegment ? 'Edit' : 'Add'} Transport Segment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Segment Type */}
          <div>
            <Label htmlFor="type">Transport Type *</Label>
            <Select value={type} onValueChange={(value) => setType(value as SegmentType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select transport type" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_TYPES.map((segType) => (
                  <SelectItem key={segType.value} value={segType.value}>
                    <span className="mr-2">{segType.icon}</span>
                    {segType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fromLocation">From Location *</Label>
              <Input
                id="fromLocation"
                placeholder="e.g., London Heathrow (LHR)"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toLocation">To Location *</Label>
              <Input
                id="toLocation"
                placeholder="e.g., Paris Charles de Gaulle (CDG)"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="departureTime">Departure Time</Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arrivalTime">Arrival Time</Label>
              <Input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>
          </div>

          {/* Flight-specific fields */}
          {type === 'flight' && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flightNumber">Flight Number</Label>
                  <Input
                    id="flightNumber"
                    placeholder="e.g., BA1234"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="airline">Airline</Label>
                  <Input
                    id="airline"
                    placeholder="e.g., British Airways"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Company (for non-flight types) */}
          {type !== 'flight' && (
            <div>
              <Label htmlFor="company">Company / Provider</Label>
              <Input
                id="company"
                placeholder="e.g., Uber, National Rail, Enterprise"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          )}

          {/* Booking Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookingReference">Booking Reference</Label>
              <Input
                id="bookingReference"
                placeholder="e.g., ABC123"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmationNumber">Confirmation Number</Label>
              <Input
                id="confirmationNumber"
                placeholder="e.g., CONF789"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Contact and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactDetails">Contact Details</Label>
              <Input
                id="contactDetails"
                placeholder="e.g., +44 20 1234 5678"
                value={contactDetails}
                onChange={(e) => setContactDetails(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                placeholder="e.g., $150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes (e.g., seat number, terminal, special requirements)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid}>
              {editSegment ? 'Update' : 'Add'} Segment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
