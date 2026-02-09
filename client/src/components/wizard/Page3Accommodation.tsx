import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp, Sparkles, MapPin, Info } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { AutofillInput, type ExtractedData } from "@/components/AutofillInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { WizardData } from "@/pages/CreateItinerary";
import { getImageFormatFromUrl, isImageFormatSupportedForPdf } from "@/lib/imageFormatSupport";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page3Accommodation({ data, updateData }: Props) {
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  // Track preview URLs with debounce
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});

  // Defensive checks: arrays might be undefined during initialization
  const safeDestinations = data.destinations || [];
  const safeAccommodations = data.accommodations || [];

  // Auto-select first destination when destinations change
  useMemo(() => {
    if (safeDestinations.length > 0 && !selectedDestinationId) {
      setSelectedDestinationId(safeDestinations[0].name);
    }
  }, [safeDestinations, selectedDestinationId]);

  // Sync image preview URLs with actual form data (for auto-fill updates)
  useEffect(() => {
    safeAccommodations.forEach((acc, idx) => {
      const originalIndex = safeAccommodations.indexOf(acc);
      const currentUrl = acc.primaryImage || "";
      // Only update if different to avoid unnecessary re-renders
      if (imagePreviewUrls[originalIndex] !== currentUrl) {
        setImagePreviewUrls(prev => ({ ...prev, [originalIndex]: currentUrl }));
      }
    });
  }, [safeAccommodations]);

  // Filter accommodations by selected destination
  const filteredAccommodations = safeAccommodations.filter(
    (acc) => !selectedDestinationId || acc.destinationId === selectedDestinationId
  );

  const hasDestinations = safeDestinations.length > 0;

  // Debounced image URL update
  const updateImageWithDebounce = (index: number, url: string) => {
    // Update immediately
    updateAccommodation(index, "primaryImage", url);

    // Clear previous timeout and set new one for preview
    if ((imagePreviewUrls as any)[index]) {
      clearTimeout((imagePreviewUrls as any)[index].timeout);
    }

    const timeoutId = setTimeout(() => {
      setImagePreviewUrls(prev => ({ ...prev, [index]: url }));
    }, 300);

    setImagePreviewUrls(prev => ({ ...prev, [index]: url }));
    (imagePreviewUrls as any)[index] = { timeout: timeoutId };
  };

  const addAccommodation = () => {
    if (!selectedDestinationId && hasDestinations) {
      // Should not happen due to auto-selection, but safeguard
      return;
    }
    const newAccommodation = {
      destinationId: selectedDestinationId || undefined,
      name: "",
      description: "",
      address: "",
      googleMapsLink: "",
      checkInDetails: "",
      images: [],
      primaryImage: "",
      websiteUrl: "",
      bookingReference: "",
      contactInfo: "",
      notes: "",
      displayOrder: safeAccommodations.length,
    };
    updateData({ accommodations: [...safeAccommodations, newAccommodation] });
  };

  const removeAccommodation = (index: number) => {
    const newAccommodations = safeAccommodations.filter((_, i) => i !== index);
    updateData({ accommodations: newAccommodations });
  };

  const updateAccommodation = (index: number, field: string, value: any) => {
    const newAccommodations = [...safeAccommodations];
    newAccommodations[index] = { ...newAccommodations[index], [field]: value };
    updateData({ accommodations: newAccommodations });
  };

  const handleAutofill = (index: number, extractedData: ExtractedData) => {
    console.log("=== AUTOFILL DATA RECEIVED ===");
    console.log("Index:", index);
    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));
    console.log("==============================");

    // Collect all updates into a single object
    const updates: Partial<typeof data.accommodations[0]> = {};

    if (extractedData.name) {
      console.log("Setting name:", extractedData.name);
      updates.name = extractedData.name;
    }
    if (extractedData.address) {
      console.log("Setting address:", extractedData.address);
      updates.address = extractedData.address;
    }
    if (extractedData.googleMapsLink) {
      console.log("Setting googleMapsLink:", extractedData.googleMapsLink);
      updates.googleMapsLink = extractedData.googleMapsLink;
    }
    if (extractedData.checkInDetails) {
      console.log("Setting checkInDetails:", extractedData.checkInDetails);
      updates.checkInDetails = extractedData.checkInDetails;
    }
    if (extractedData.bookingReference) {
      console.log("Setting bookingReference:", extractedData.bookingReference);
      updates.bookingReference = extractedData.bookingReference;
    }
    if (extractedData.websiteUrl) {
      console.log("Setting websiteUrl:", extractedData.websiteUrl);
      updates.websiteUrl = extractedData.websiteUrl;
    }
    if (extractedData.contactInfo) {
      console.log("Setting contactInfo:", extractedData.contactInfo);
      updates.contactInfo = extractedData.contactInfo;
    }
    if (extractedData.description) {
      console.log("Setting description:", extractedData.description);
      updates.description = extractedData.description;
    }
    // Notes field is for additional manual notes only
    if (extractedData.notes && extractedData.notes !== extractedData.description) {
      console.log("Setting notes:", extractedData.notes);
      updates.notes = extractedData.notes;
    }
    if (extractedData.primaryImage) {
      console.log("Setting primaryImage:", extractedData.primaryImage);
      // Store primaryImage separately and also as first image in the array
      updates.primaryImage = extractedData.primaryImage;
      const images = extractedData.images || [];
      // Remove primaryImage from images array if it exists there to avoid duplicates
      const filteredImages = images.filter(img => img !== extractedData.primaryImage);
      // Put primaryImage first
      updates.images = [extractedData.primaryImage, ...filteredImages];
    } else if (extractedData.images && extractedData.images.length > 0) {
      console.log("Setting images:", extractedData.images);
      updates.images = extractedData.images;
    }

    console.log("Updates to apply:", JSON.stringify(updates, null, 2));
    console.log("==============================");

    // Apply ALL updates in a single state update (not multiple calls!)
    const newAccommodations = [...safeAccommodations];
    newAccommodations[index] = { ...newAccommodations[index], ...updates };
    updateData({ accommodations: newAccommodations });

    console.log("Updated accommodation at index", index, ":", JSON.stringify(newAccommodations[index], null, 2));
    console.log("=== AUTOFILL COMPLETE ===");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Accommodations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add accommodation details for your itinerary. Include maps and images to help your clients.
            </p>
          </div>
        </div>

        {/* Destination Selector */}
        {!hasDestinations ? (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Add destinations first
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  You need to add destinations on the Destinations page before adding accommodations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="destination-select" className="text-sm font-medium">
                Destination
              </Label>
              <Select
                value={selectedDestinationId || ""}
                onValueChange={setSelectedDestinationId}
              >
                <SelectTrigger id="destination-select" className="w-full">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {safeDestinations.map((dest) => (
                    <SelectItem key={dest.name} value={dest.name}>
                      {dest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={addAccommodation}
              disabled={!selectedDestinationId}
              data-testid="button-add-accommodation"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Accommodation
            </Button>
          </div>
        )}
      </div>

      {filteredAccommodations.length === 0 && hasDestinations ? (
        <div className="text-center py-12 border-2 border-dashed border-[hsl(var(--sand-300))] rounded-lg animate-fade-in">
          <p className="text-foreground-subtle">No accommodations added yet</p>
          <p className="text-sm text-foreground-muted mt-2">Click "Add Accommodation" to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAccommodations.map((accommodation) => {
            // Find the original index in the full array
            const originalIndex = safeAccommodations.findIndex(acc => acc === accommodation);

            return (
              <div
                key={originalIndex}
                className="bg-card border border-[hsl(var(--border))] rounded-xl overflow-hidden animate-slide-up shadow-sm hover-scale"
                data-testid={`accommodation-item-${originalIndex}`}
              >
                {/* Header with Auto-fill Toggle */}
                <Collapsible
                  open={autofillOpen === originalIndex}
                  onOpenChange={(open) => setAutofillOpen(open ? originalIndex : null)}
                >
                  <div className="p-6 border-b border-[hsl(var(--border))] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg font-serif">{accommodation.name || `Accommodation`}</h4>
                        {accommodation.destinationId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {safeDestinations.find(d => d.name === accommodation.destinationId)?.name || accommodation.destinationId}
                          </p>
                        )}
                      </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Sparkles className="w-4 h-4 text-[hsl(var(--cta))]" />
                          {autofillOpen === originalIndex ? 'Hide' : 'Auto-fill from URL'}
                          {autofillOpen === originalIndex ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAccommodation(originalIndex)}
                        className="text-[hsl(var(--error))] hover:bg-[hsl(var(--error-light))]"
                        data-testid={`button-remove-accommodation-${originalIndex}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent className="space-y-4">
                    <AutofillInput
                      itemType="accommodation"
                      onExtracted={(data) => handleAutofill(originalIndex, data)}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Form Fields */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`accommodation-name-${originalIndex}`}>Name *</Label>
                  <Input
                    id={`accommodation-name-${originalIndex}`}
                    value={accommodation.name}
                    onChange={(e) => updateAccommodation(originalIndex, "name", e.target.value)}
                    placeholder="e.g., Grand Hotel Riga"
                    data-testid={`input-accommodation-name-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-address-${originalIndex}`}>Address</Label>
                  <Textarea
                    id={`accommodation-address-${originalIndex}`}
                    value={accommodation.address}
                    onChange={(e) => updateAccommodation(originalIndex, "address", e.target.value)}
                    placeholder="Full address"
                    rows={2}
                    data-testid={`textarea-accommodation-address-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-maps-${originalIndex}`}>Google Maps Link</Label>
                  <Input
                    id={`accommodation-maps-${originalIndex}`}
                    value={accommodation.googleMapsLink}
                    onChange={(e) => updateAccommodation(originalIndex, "googleMapsLink", e.target.value)}
                    placeholder="Paste Google Maps link here"
                    data-testid={`input-accommodation-maps-${originalIndex}`}
                  />
                  {accommodation.googleMapsLink && (
                    <p className="text-xs text-foreground-subtle">
                      Map preview will be generated when saved
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-image-${originalIndex}`}>Image</Label>
                  <Input
                    id={`accommodation-image-${originalIndex}`}
                    type="url"
                    value={accommodation.primaryImage || ""}
                    onChange={(e) => updateImageWithDebounce(originalIndex, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    data-testid={`input-accommodation-image-${originalIndex}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from website. Paste a different image URL if needed.
                  </p>
                  {accommodation.primaryImage &&
                    !isImageFormatSupportedForPdf(accommodation.primaryImage) && (
                      <p className="text-amber-700 text-xs mt-1">
                        This image format ({getImageFormatFromUrl(accommodation.primaryImage) || "UNKNOWN"}) may not display in PDF exports. For best results, use JPEG or PNG images.
                      </p>
                    )}
                  {imagePreviewUrls[originalIndex] && (
                    <div className="mt-2">
                      <img
                        src={imagePreviewUrls[originalIndex]}
                        alt="Preview"
                        className="w-[150px] h-auto object-cover rounded border border-border"
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23f3f4f6' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'%3EFailed%20to%20load%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-checkin-${originalIndex}`}>Check-in Details</Label>
                  <Textarea
                    id={`accommodation-checkin-${originalIndex}`}
                    value={accommodation.checkInDetails}
                    onChange={(e) => updateAccommodation(originalIndex, "checkInDetails", e.target.value)}
                    placeholder="Check-in time, instructions, etc."
                    rows={2}
                    data-testid={`textarea-accommodation-checkin-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-website-${originalIndex}`}>Website URL</Label>
                  <Input
                    id={`accommodation-website-${originalIndex}`}
                    type="url"
                    value={accommodation.websiteUrl}
                    onChange={(e) => updateAccommodation(originalIndex, "websiteUrl", e.target.value)}
                    placeholder="https://..."
                    data-testid={`input-accommodation-website-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-booking-${originalIndex}`}>Booking Reference</Label>
                  <Input
                    id={`accommodation-booking-${originalIndex}`}
                    value={accommodation.bookingReference}
                    onChange={(e) => updateAccommodation(originalIndex, "bookingReference", e.target.value)}
                    placeholder="Booking confirmation number"
                    data-testid={`input-accommodation-booking-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-contact-${originalIndex}`}>Contact Information</Label>
                  <Input
                    id={`accommodation-contact-${originalIndex}`}
                    value={accommodation.contactInfo}
                    onChange={(e) => updateAccommodation(originalIndex, "contactInfo", e.target.value)}
                    placeholder="Phone, email, or contact details"
                    data-testid={`input-accommodation-contact-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-description-${originalIndex}`}>Description</Label>
                  <Textarea
                    id={`accommodation-description-${originalIndex}`}
                    value={accommodation.description || ""}
                    onChange={(e) => updateAccommodation(originalIndex, "description", e.target.value)}
                    placeholder="Property description, amenities, highlights..."
                    rows={3}
                    data-testid={`textarea-accommodation-description-${originalIndex}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`accommodation-notes-${originalIndex}`}>Notes</Label>
                  <Textarea
                    id={`accommodation-notes-${originalIndex}`}
                    value={accommodation.notes || ""}
                    onChange={(e) => updateAccommodation(originalIndex, "notes", e.target.value)}
                    placeholder="e.g., Check-in after 3pm, late checkout available, breakfast included..."
                    rows={3}
                    data-testid={`textarea-accommodation-notes-${originalIndex}`}
                  />
                </div>

                {accommodation.sourceUrl && (
                  <div className="flex items-center gap-2 text-xs text-[hsl(var(--success))] bg-[hsl(var(--success-light))] p-2 rounded">
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-filled from: {accommodation.sourceUrl}</span>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add Another button - appears when there are items */}
      {filteredAccommodations.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addAccommodation}
            disabled={!selectedDestinationId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Accommodation
          </Button>
        </div>
      )}
    </div>
  );
}
