import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Sparkles, ChevronDown, ChevronUp, MapPin, Info } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { WizardData } from "@/pages/CreateItinerary";
import { AutofillInput, type ExtractedData } from "@/components/AutofillInput";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getImageFormatFromUrl, isImageFormatSupportedForPdf } from "@/lib/imageFormatSupport";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page4Activities({ data, updateData }: Props) {
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
    data.activities.forEach((activity) => {
      const originalIndex = data.activities.indexOf(activity);
      const currentUrl = activity.primaryImage || "";
      // Only update if different to avoid unnecessary re-renders
      if (imagePreviewUrls[originalIndex] !== currentUrl) {
        setImagePreviewUrls(prev => ({ ...prev, [originalIndex]: currentUrl }));
      }
    });
  }, [data.activities]);

  // Filter activities by selected destination
  const filteredActivities = data.activities.filter(
    (act) => !selectedDestinationId || act.destinationId === selectedDestinationId
  );

  const hasDestinations = data.destinations.length > 0;

  const addActivity = () => {
    if (!selectedDestinationId && hasDestinations) {
      return;
    }
    const newActivity = {
      destinationId: selectedDestinationId || undefined,
      name: "",
      description: "",
      price: "",
      images: [],
      primaryImage: "",
      contactDetails: "",
      address: "",
      googleMapsLink: "",
      websiteUrl: "",
      notes: "",
      displayOrder: data.activities.length,
    };
    updateData({ activities: [...data.activities, newActivity] });
  };

  const removeActivity = (index: number) => {
    const newActivities = data.activities.filter((_, i) => i !== index);
    updateData({ activities: newActivities });
  };

  const updateActivity = (index: number, field: string, value: string | string[]) => {
    const newActivities = [...data.activities];
    newActivities[index] = { ...newActivities[index], [field]: value };
    updateData({ activities: newActivities });
  };

  // Debounced image URL update
  const updateImageWithDebounce = (index: number, url: string) => {
    // Update immediately
    updateActivity(index, "primaryImage", url);

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
    console.log("=== ACTIVITY AUTOFILL ===");
    console.log("Index:", index);
    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    const updates: Partial<typeof data.activities[0]> = {};

    if (extractedData.name) updates.name = extractedData.name;
    if (extractedData.description) updates.description = extractedData.description;
    if (extractedData.price || extractedData.priceRange) updates.price = extractedData.price || extractedData.priceRange || "";
    if (extractedData.contactDetails || extractedData.contactInfo) updates.contactDetails = extractedData.contactDetails || extractedData.contactInfo || "";
    if (extractedData.address) updates.address = extractedData.address;
    if (extractedData.googleMapsLink) updates.googleMapsLink = extractedData.googleMapsLink;
    if (extractedData.websiteUrl) updates.websiteUrl = extractedData.websiteUrl;
    // Notes field is for additional manual notes only (description is separate)
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

    const newActivities = [...data.activities];
    newActivities[index] = { ...newActivities[index], ...updates };
    updateData({ activities: newActivities });

    console.log("Activity updated:", newActivities[index]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Activities</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Suggest activities and experiences for your clients (optional)
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
                  You need to add destinations on the Destinations page before adding activities.
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
              onClick={addActivity}
              disabled={!selectedDestinationId}
              data-testid="button-add-activity"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </div>
        )}
      </div>

      {filteredActivities.length === 0 && hasDestinations ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No activities added yet</p>
          <p className="text-sm text-muted-foreground mt-2">Click "Add Activity" to suggest experiences</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredActivities.map((activity) => {
            const originalIndex = data.activities.findIndex(act => act === activity);

            return (
              <div
                key={originalIndex}
                className="bg-card border border-border rounded-xl overflow-hidden animate-slide-up shadow-sm hover-scale"
                data-testid={`activity-item-${originalIndex}`}
              >
                {/* Header with Auto-fill Toggle */}
                <Collapsible
                  open={autofillOpen === originalIndex}
                  onOpenChange={(open) => setAutofillOpen(open ? originalIndex : null)}
                >
                  <div className="p-6 border-b border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg font-serif">{activity.name || `Activity`}</h4>
                        {activity.destinationId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.destinations.find(d => d.name === activity.destinationId)?.name || activity.destinationId}
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
                          onClick={() => removeActivity(originalIndex)}
                          data-testid={`button-remove-activity-${originalIndex}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="space-y-4">
                      <AutofillInput
                        itemType="activity"
                        onExtracted={(data) => handleAutofill(originalIndex, data)}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Form Fields */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`activity-name-${originalIndex}`}>Activity Name</Label>
                    <Input
                      id={`activity-name-${originalIndex}`}
                      value={activity.name}
                      onChange={(e) => updateActivity(originalIndex, "name", e.target.value)}
                      placeholder="e.g., Old Town Walking Tour"
                      data-testid={`input-activity-name-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-description-${originalIndex}`}>Description</Label>
                    <Textarea
                      id={`activity-description-${originalIndex}`}
                      value={activity.description}
                      onChange={(e) => updateActivity(originalIndex, "description", e.target.value)}
                      placeholder="Describe the activity..."
                      rows={4}
                      data-testid={`textarea-activity-description-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-price-${originalIndex}`}>Price</Label>
                    <Input
                      id={`activity-price-${originalIndex}`}
                      value={activity.price}
                      onChange={(e) => updateActivity(originalIndex, "price", e.target.value)}
                      placeholder="e.g., €50 per person"
                      data-testid={`input-activity-price-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-contact-${originalIndex}`}>Contact Details (Optional)</Label>
                    <Input
                      id={`activity-contact-${originalIndex}`}
                      value={activity.contactDetails || ""}
                      onChange={(e) => updateActivity(originalIndex, "contactDetails", e.target.value)}
                      placeholder="Phone, email, or contact details"
                      data-testid={`input-activity-contact-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-address-${originalIndex}`}>Address (Optional)</Label>
                    <Input
                      id={`activity-address-${originalIndex}`}
                      value={activity.address || ""}
                      onChange={(e) => updateActivity(originalIndex, "address", e.target.value)}
                      placeholder="e.g., 123 Main Street, City"
                      data-testid={`input-activity-address-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-maps-${originalIndex}`}>Google Maps Link (Optional)</Label>
                    <Input
                      id={`activity-maps-${originalIndex}`}
                      type="url"
                      value={activity.googleMapsLink || ""}
                      onChange={(e) => updateActivity(originalIndex, "googleMapsLink", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      data-testid={`input-activity-maps-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-website-${originalIndex}`}>Website/Booking Link (Optional)</Label>
                    <Input
                      id={`activity-website-${originalIndex}`}
                      type="url"
                      value={activity.websiteUrl || ""}
                      onChange={(e) => updateActivity(originalIndex, "websiteUrl", e.target.value)}
                      placeholder="https://..."
                      data-testid={`input-activity-website-${originalIndex}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`activity-image-${originalIndex}`}>Image</Label>
                    <Input
                      id={`activity-image-${originalIndex}`}
                      type="url"
                      value={activity.primaryImage || ""}
                      onChange={(e) => updateImageWithDebounce(originalIndex, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      data-testid={`input-activity-image-${originalIndex}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from website. Paste a different image URL if needed.
                    </p>
                    {activity.primaryImage &&
                      !isImageFormatSupportedForPdf(activity.primaryImage) && (
                        <p className="text-amber-700 text-xs mt-1">
                          This image format ({getImageFormatFromUrl(activity.primaryImage) || "UNKNOWN"}) may not display in PDF exports. For best results, use JPEG or PNG images.
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
                    <Label htmlFor={`activity-notes-${originalIndex}`}>Notes (Optional)</Label>
                    <Textarea
                      id={`activity-notes-${originalIndex}`}
                      value={activity.notes || ""}
                      onChange={(e) => updateActivity(originalIndex, "notes", e.target.value)}
                      placeholder="e.g., Tickets only at door, arrive 30 mins early, bring ID..."
                      rows={3}
                      data-testid={`textarea-activity-notes-${originalIndex}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Another button - appears when there are items */}
      {filteredActivities.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addActivity}
            disabled={!selectedDestinationId}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Activity
          </Button>
        </div>
      )}
    </div>
  );
}
