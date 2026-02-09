import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Sparkles, ChevronDown, ChevronUp, MapPin, Info, UtensilsCrossed } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { WizardData } from "@/pages/CreateItinerary";
import { AutofillInput, type ExtractedData } from "@/components/AutofillInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getImageFormatFromUrl, isImageFormatSupportedForPdf } from "@/lib/imageFormatSupport";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page5Dining({ data, updateData }: Props) {
  const [autofillOpen, setAutofillOpen] = useState<number | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  // Track preview URLs with debounce
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});

  // Auto-select first destination when destinations change
  useMemo(() => {
    if (data.destinations.length > 0 && !selectedDestinationId) {
      setSelectedDestinationId(data.destinations[0].name);
    }
  }, [data.destinations, selectedDestinationId]);

  // Sync image preview URLs with actual form data (for auto-fill updates)
  useEffect(() => {
    data.dining.forEach((item) => {
      const originalIndex = data.dining.indexOf(item);
      const currentUrl = item.primaryImage || "";
      // Only update if different to avoid unnecessary re-renders
      if (imagePreviewUrls[originalIndex] !== currentUrl) {
        setImagePreviewUrls(prev => ({ ...prev, [originalIndex]: currentUrl }));
      }
    });
  }, [data.dining]);

  // Filter dining by selected destination
  const filteredDining = data.dining.filter(
    (item) => !selectedDestinationId || item.destinationId === selectedDestinationId
  );

  const hasDestinations = data.destinations.length > 0;

  const addDining = () => {
    if (!selectedDestinationId && hasDestinations) {
      return;
    }
    const newDining = {
      destinationId: selectedDestinationId || undefined,
      name: "",
      description: "",
      cuisineType: "",
      priceRange: "",
      images: [],
      primaryImage: "",
      contactDetails: "",
      address: "",
      googleMapsLink: "",
      websiteUrl: "",
      notes: "",
      displayOrder: data.dining.length,
    };
    updateData({ dining: [...data.dining, newDining] });
  };

  const removeDining = (index: number) => {
    const newDining = data.dining.filter((_, i) => i !== index);
    updateData({ dining: newDining });
  };

  const updateDining = (index: number, field: string, value: string | string[]) => {
    const newDining = [...data.dining];
    newDining[index] = { ...newDining[index], [field]: value };
    updateData({ dining: newDining });
  };

  // Debounced image URL update
  const updateImageWithDebounce = (index: number, url: string) => {
    // Update immediately
    updateDining(index, "primaryImage", url);

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

  const handleAutofill = (index: number, extractedData: ExtractedData) => {
    console.log("=== DINING AUTOFILL ===");
    console.log("Index:", index);
    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    const updates: Partial<typeof data.dining[0]> = {};

    if (extractedData.name) updates.name = extractedData.name;
    if (extractedData.cuisineType) updates.cuisineType = extractedData.cuisineType;
    if (extractedData.priceRange) updates.priceRange = extractedData.priceRange;
    if (extractedData.contactDetails || extractedData.contactInfo) updates.contactDetails = extractedData.contactDetails || extractedData.contactInfo || "";
    if (extractedData.address) updates.address = extractedData.address;
    if (extractedData.googleMapsLink) updates.googleMapsLink = extractedData.googleMapsLink;
    if (extractedData.websiteUrl) updates.websiteUrl = extractedData.websiteUrl;
    if (extractedData.description) {
      updates.description = extractedData.description;
    }
    // Notes field is for additional manual notes only
    if (extractedData.notes && extractedData.notes !== extractedData.description) {
      updates.notes = extractedData.notes;
    }
    if (extractedData.primaryImage) {
      updates.primaryImage = extractedData.primaryImage;
      const images = extractedData.images || [];
      const filteredImages = images.filter(img => img !== extractedData.primaryImage);
      updates.images = [extractedData.primaryImage, ...filteredImages];
    } else if (extractedData.images && extractedData.images.length > 0) {
      updates.images = extractedData.images;
    }

    console.log("Updates:", updates);

    const newDining = [...data.dining];
    newDining[index] = { ...newDining[index], ...updates };
    updateData({ dining: newDining });

    console.log("Dining updated:", newDining[index]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Restaurants</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recommend restaurants and dining experiences (optional)
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
                  You need to add destinations on the Destinations page before adding restaurants.
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
                  {data.destinations.map((dest) => (
                    <SelectItem key={dest.name} value={dest.name}>
                      {dest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              onClick={addDining}
              disabled={!selectedDestinationId}
              data-testid="button-add-dining"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Restaurant
            </Button>
          </div>
        )}
      </div>

      {filteredDining.length === 0 && hasDestinations ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No restaurants added yet</p>
          <p className="text-sm text-muted-foreground mt-2">Click "Add Restaurant" to recommend dining</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDining.map((item) => {
            const originalIndex = data.dining.findIndex(d => d === item);

            return (
              <div
                key={originalIndex}
                className="bg-card border border-border rounded-xl overflow-hidden animate-slide-up shadow-sm hover-scale"
                data-testid={`dining-item-${originalIndex}`}
              >
                {/* Header with Auto-fill Toggle */}
                <Collapsible
                  open={autofillOpen === originalIndex}
                  onOpenChange={(open) => setAutofillOpen(open ? originalIndex : null)}
                >
                  <div className="p-6 border-b border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg font-serif">{item.name || `Restaurant`}</h4>
                        {item.destinationId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.destinations.find(d => d.name === item.destinationId)?.name || item.destinationId}
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
                            <Sparkles className="w-4 h-4 text-primary" />
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
                          onClick={() => removeDining(originalIndex)}
                          data-testid={`button-remove-dining-${originalIndex}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="space-y-4">
                      <AutofillInput
                        itemType="dining"
                        onExtracted={(data) => handleAutofill(originalIndex, data)}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Form Fields */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`dining-name-${originalIndex}`}>Restaurant Name</Label>
                    <Input
                      id={`dining-name-${originalIndex}`}
                      value={item.name}
                      onChange={(e) => updateDining(originalIndex, "name", e.target.value)}
                      placeholder="e.g., Villa Rozā"
                      data-testid={`input-dining-name-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-cuisine-${originalIndex}`}>Cuisine Type</Label>
                    <Input
                      id={`dining-cuisine-${originalIndex}`}
                      value={item.cuisineType}
                      onChange={(e) => updateDining(originalIndex, "cuisineType", e.target.value)}
                      placeholder="e.g., Modern Latvian, Italian, Fusion"
                      data-testid={`input-dining-cuisine-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-price-${originalIndex}`}>Price Range</Label>
                    <Input
                      id={`dining-price-${originalIndex}`}
                      value={item.priceRange}
                      onChange={(e) => updateDining(originalIndex, "priceRange", e.target.value)}
                      placeholder="e.g., €€€ (€30-50 per person)"
                      data-testid={`input-dining-price-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-contact-${originalIndex}`}>Contact Details (Optional)</Label>
                    <Input
                      id={`dining-contact-${originalIndex}`}
                      value={item.contactDetails || ""}
                      onChange={(e) => updateDining(originalIndex, "contactDetails", e.target.value)}
                      placeholder="Phone, email, or contact details"
                      data-testid={`input-dining-contact-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-address-${originalIndex}`}>Address (Optional)</Label>
                    <Input
                      id={`dining-address-${originalIndex}`}
                      value={item.address || ""}
                      onChange={(e) => updateDining(originalIndex, "address", e.target.value)}
                      placeholder="e.g., 123 Main Street, City"
                      data-testid={`input-dining-address-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-maps-${originalIndex}`}>Google Maps Link (Optional)</Label>
                    <Input
                      id={`dining-maps-${originalIndex}`}
                      type="url"
                      value={item.googleMapsLink || ""}
                      onChange={(e) => updateDining(originalIndex, "googleMapsLink", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      data-testid={`input-dining-maps-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-website-${originalIndex}`}>Website URL (Optional)</Label>
                    <Input
                      id={`dining-website-${originalIndex}`}
                      type="url"
                      value={item.websiteUrl || ""}
                      onChange={(e) => updateDining(originalIndex, "websiteUrl", e.target.value)}
                      placeholder="https://..."
                      data-testid={`input-dining-website-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-image-${originalIndex}`}>Image</Label>
                    <Input
                      id={`dining-image-${originalIndex}`}
                      type="url"
                      value={item.primaryImage || ""}
                      onChange={(e) => updateImageWithDebounce(originalIndex, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      data-testid={`input-dining-image-${originalIndex}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from website. Paste a different image URL if needed.
                    </p>
                    {item.primaryImage &&
                      !isImageFormatSupportedForPdf(item.primaryImage) && (
                        <p className="text-amber-700 text-xs mt-1">
                          This image format ({getImageFormatFromUrl(item.primaryImage) || "UNKNOWN"}) may not display in PDF exports. For best results, use JPEG or PNG images.
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
                    <Label htmlFor={`dining-description-${originalIndex}`}>Description</Label>
                    <Textarea
                      id={`dining-description-${originalIndex}`}
                      value={item.description || ""}
                      onChange={(e) => updateDining(originalIndex, "description", e.target.value)}
                      placeholder="Restaurant description, ambiance, highlights..."
                      rows={3}
                      data-testid={`textarea-dining-description-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`dining-notes-${originalIndex}`}>Notes (Optional)</Label>
                    <Textarea
                      id={`dining-notes-${originalIndex}`}
                      value={item.notes || ""}
                      onChange={(e) => updateDining(originalIndex, "notes", e.target.value)}
                      placeholder="e.g., Reservation recommended, try the tasting menu, great for groups..."
                      rows={3}
                      data-testid={`textarea-dining-notes-${originalIndex}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Another button - appears when there are items */}
      {filteredDining.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addDining}
            disabled={!selectedDestinationId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Restaurant
          </Button>
        </div>
      )}
    </div>
  );
}
