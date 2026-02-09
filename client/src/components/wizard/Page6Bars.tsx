import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Sparkles, ChevronDown, ChevronUp, MapPin, Info, Martini } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { WizardData } from "@/pages/CreateItinerary";
import { AutofillInput, type ExtractedData } from "@/components/AutofillInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getImageFormatFromUrl, isImageFormatSupportedForPdf } from "@/lib/imageFormatSupport";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page6Bars({ data, updateData }: Props) {
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
    data.bars.forEach((item) => {
      const originalIndex = data.bars.indexOf(item);
      const currentUrl = item.primaryImage || "";
      // Only update if different to avoid unnecessary re-renders
      if (imagePreviewUrls[originalIndex] !== currentUrl) {
        setImagePreviewUrls(prev => ({ ...prev, [originalIndex]: currentUrl }));
      }
    });
  }, [data.bars]);

  // Filter bars by selected destination
  const filteredBars = data.bars.filter(
    (item) => !selectedDestinationId || item.destinationId === selectedDestinationId
  );

  const hasDestinations = data.destinations.length > 0;

  const addBar = () => {
    if (!selectedDestinationId && hasDestinations) {
      return;
    }
    const newBar = {
      destinationId: selectedDestinationId || undefined,
      name: "",
      description: "",
      barType: "",
      priceRange: "",
      images: [],
      primaryImage: "",
      contactDetails: "",
      address: "",
      googleMapsLink: "",
      websiteUrl: "",
      notes: "",
      displayOrder: data.bars.length,
    };
    updateData({ bars: [...data.bars, newBar] });
  };

  const removeBar = (index: number) => {
    const newBars = data.bars.filter((_, i) => i !== index);
    updateData({ bars: newBars });
  };

  const updateBar = (index: number, field: string, value: string | string[]) => {
    const newBars = [...data.bars];
    newBars[index] = { ...newBars[index], [field]: value };
    updateData({ bars: newBars });
  };

  // Debounced image URL update
  const updateImageWithDebounce = (index: number, url: string) => {
    // Update immediately
    updateBar(index, "primaryImage", url);

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
    console.log("=== BAR AUTOFILL ===");
    console.log("Index:", index);
    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    const updates: Partial<typeof data.bars[0]> = {};

    if (extractedData.name) updates.name = extractedData.name;
    if (extractedData.barType) updates.barType = extractedData.barType;
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

    const newBars = [...data.bars];
    newBars[index] = { ...newBars[index], ...updates };
    updateData({ bars: newBars });

    console.log("Bar updated:", newBars[index]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Bars</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Recommend bars and nightlife experiences (optional)
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
                  You need to add destinations on the Destinations page before adding bars.
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
              onClick={addBar}
              disabled={!selectedDestinationId}
              data-testid="button-add-bar"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bar
            </Button>
          </div>
        )}
      </div>

      {filteredBars.length === 0 && hasDestinations ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Martini className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No bars added yet</p>
          <p className="text-sm text-muted-foreground mt-2">Click "Add Bar" to recommend nightlife</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredBars.map((item) => {
            const originalIndex = data.bars.findIndex(b => b === item);

            return (
              <div
                key={originalIndex}
                className="bg-card border border-border rounded-xl overflow-hidden animate-slide-up shadow-sm hover-scale"
                data-testid={`bar-item-${originalIndex}`}
              >
                {/* Header with Auto-fill Toggle */}
                <Collapsible
                  open={autofillOpen === originalIndex}
                  onOpenChange={(open) => setAutofillOpen(open ? originalIndex : null)}
                >
                  <div className="p-6 border-b border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg font-serif">{item.name || `Bar`}</h4>
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
                          onClick={() => removeBar(originalIndex)}
                          data-testid={`button-remove-bar-${originalIndex}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="space-y-4">
                      <AutofillInput
                        itemType="bar"
                        onExtracted={(data) => handleAutofill(originalIndex, data)}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Form Fields */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`bar-name-${originalIndex}`}>Bar Name</Label>
                    <Input
                      id={`bar-name-${originalIndex}`}
                      value={item.name}
                      onChange={(e) => updateBar(originalIndex, "name", e.target.value)}
                      placeholder="e.g., Skyline Bar"
                      data-testid={`input-bar-name-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-type-${originalIndex}`}>Bar Type</Label>
                    <Input
                      id={`bar-type-${originalIndex}`}
                      value={item.barType}
                      onChange={(e) => updateBar(originalIndex, "barType", e.target.value)}
                      placeholder="e.g., Rooftop, Speakeasy, Cocktail Bar, Pub"
                      data-testid={`input-bar-type-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-price-${originalIndex}`}>Price Range</Label>
                    <Input
                      id={`bar-price-${originalIndex}`}
                      value={item.priceRange}
                      onChange={(e) => updateBar(originalIndex, "priceRange", e.target.value)}
                      placeholder="e.g., €€ (€12-20 per cocktail)"
                      data-testid={`input-bar-price-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-contact-${originalIndex}`}>Contact Details (Optional)</Label>
                    <Input
                      id={`bar-contact-${originalIndex}`}
                      value={item.contactDetails || ""}
                      onChange={(e) => updateBar(originalIndex, "contactDetails", e.target.value)}
                      placeholder="Phone, email, or contact details"
                      data-testid={`input-bar-contact-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-address-${originalIndex}`}>Address (Optional)</Label>
                    <Input
                      id={`bar-address-${originalIndex}`}
                      value={item.address || ""}
                      onChange={(e) => updateBar(originalIndex, "address", e.target.value)}
                      placeholder="e.g., 123 Main Street, City"
                      data-testid={`input-bar-address-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-maps-${originalIndex}`}>Google Maps Link (Optional)</Label>
                    <Input
                      id={`bar-maps-${originalIndex}`}
                      type="url"
                      value={item.googleMapsLink || ""}
                      onChange={(e) => updateBar(originalIndex, "googleMapsLink", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      data-testid={`input-bar-maps-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-website-${originalIndex}`}>Website URL (Optional)</Label>
                    <Input
                      id={`bar-website-${originalIndex}`}
                      type="url"
                      value={item.websiteUrl || ""}
                      onChange={(e) => updateBar(originalIndex, "websiteUrl", e.target.value)}
                      placeholder="https://..."
                      data-testid={`input-bar-website-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-image-${originalIndex}`}>Image</Label>
                    <Input
                      id={`bar-image-${originalIndex}`}
                      type="url"
                      value={item.primaryImage || ""}
                      onChange={(e) => updateImageWithDebounce(originalIndex, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      data-testid={`input-bar-image-${originalIndex}`}
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
                    <Label htmlFor={`bar-description-${originalIndex}`}>Description</Label>
                    <Textarea
                      id={`bar-description-${originalIndex}`}
                      value={item.description || ""}
                      onChange={(e) => updateBar(originalIndex, "description", e.target.value)}
                      placeholder="Bar description, ambiance, signature drinks..."
                      rows={3}
                      data-testid={`textarea-bar-description-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`bar-notes-${originalIndex}`}>Notes (Optional)</Label>
                    <Textarea
                      id={`bar-notes-${originalIndex}`}
                      value={item.notes || ""}
                      onChange={(e) => updateBar(originalIndex, "notes", e.target.value)}
                      placeholder="e.g., Great views, reservations recommended, dress code..."
                      rows={3}
                      data-testid={`textarea-bar-notes-${originalIndex}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Another button - appears when there are items */}
      {filteredBars.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addBar}
            disabled={!selectedDestinationId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Bar
          </Button>
        </div>
      )}
    </div>
  );
}
