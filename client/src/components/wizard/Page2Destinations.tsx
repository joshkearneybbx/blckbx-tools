import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, GripVertical, MapPin, Calendar } from "lucide-react";
import type { WizardData } from "@/pages/CreateItinerary";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

// Helper function to format dates for HTML date inputs (yyyy-MM-dd format)
// PocketBase returns dates as "2026-02-15 00:00:00.000Z" but HTML date inputs need "2026-02-15"
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  // Handle ISO datetime format "2026-02-15 00:00:00.000Z" or "2026-02-15T00:00:00.000Z"
  // Extract just the date part "yyyy-MM-dd"
  return dateString.split('T')[0].split(' ')[0];
};

export default function Page2Destinations({ data, updateData }: Props) {
  // Defensive check: destinations might be undefined during initialization
  const safeDestinations = data.destinations || [];

  // Debug: log props to help identify undefined values
  console.log('Page2Destinations props:', {
    destinations: data.destinations,
    safeDestinations,
    destinationsLength: safeDestinations.length,
  });

  const addDestination = () => {
    const newDestination = {
      name: "",
      dates: "",
      startDate: "",
      endDate: "",
      location: "",
      weather: "",
      weatherUrl: "",
      notes: "",
      displayOrder: safeDestinations.length,
    };
    updateData({ destinations: [...safeDestinations, newDestination] });
  };

  const removeDestination = (index: number) => {
    const newDestinations = safeDestinations.filter((_, i) => i !== index);
    // Reorder remaining destinations
    const reorderedDestinations = newDestinations.map((dest, i) => ({
      ...dest,
      displayOrder: i,
    }));
    updateData({ destinations: reorderedDestinations });
  };

  const updateDestination = (index: number, field: string, value: any) => {
    console.log(`=== updateDestination === index: ${index}, field: "${field}", value:`, value);

    const newDestinations = [...safeDestinations];
    newDestinations[index] = { ...newDestinations[index], [field]: value };

    // Auto-generate dates display text when startDate/endDate change
    if (field === "startDate" || field === "endDate") {
      const startDate = newDestinations[index].startDate;
      const endDate = newDestinations[index].endDate;
      console.log(`Date change detected - startDate: "${startDate}", endDate: "${endDate}"`);
      if (startDate && endDate) {
        const formatted = formatDatesDisplay(startDate, endDate);
        console.log(`Auto-generated dates display: "${formatted}"`);
        newDestinations[index].dates = formatted;
      }
    }

    console.log("Updated destination:", newDestinations[index]);
    updateData({ destinations: newDestinations });
  };

  const moveDestination = (index: number, direction: "up" | "down") => {
    const newDestinations = [...safeDestinations];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newDestinations.length) return;

    // Swap
    [newDestinations[index], newDestinations[targetIndex]] = [
      newDestinations[targetIndex],
      newDestinations[index],
    ];

    // Update displayOrder
    newDestinations.forEach((dest, i) => {
      dest.displayOrder = i;
    });

    updateData({ destinations: newDestinations });
  };

  const formatDatesDisplay = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      const startMonth = months[start.getMonth()];
      const startDay = start.getDate();
      const endMonth = end.getMonth();
      const endDay = end.getDate();
      const year = end.getFullYear();

      if (start.getMonth() === end.getMonth()) {
        return `${startMonth} ${startDay}-${endDay}, ${year}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
      }
    } catch {
      return "";
    }
  };

  const calculateNights = (startDate: string, endDate: string): number => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Destinations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add all destinations for your trip. You must add at least one destination.
            </p>
          </div>
          <Button
            type="button"
            onClick={addDestination}
            data-testid="button-add-destination"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Destination
          </Button>
        </div>

        {safeDestinations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No destinations added yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click "Add Destination" to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeDestinations.map((destination, index) => {
              const nights = calculateNights(destination.startDate, destination.endDate);

              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-6 space-y-4 relative"
                  data-testid={`destination-item-${index}`}
                >
                  {/* Header with title and remove button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => moveDestination(index, "up")}
                          disabled={index === 0}
                          data-testid={`button-move-up-${index}`}
                        >
                          <GripVertical className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => moveDestination(index, "down")}
                          disabled={index === safeDestinations.length - 1}
                          data-testid={`button-move-down-${index}`}
                        >
                          <GripVertical className="w-4 h-4" />
                        </Button>
                      </div>
                      <h4 className="font-semibold text-lg">
                        {destination.name || `Destination ${index + 1}`}
                      </h4>
                      {nights > 0 && (
                        <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {nights} night{nights !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDestination(index)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-remove-destination-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`destination-name-${index}`}>Destination Name *</Label>
                      <Input
                        id={`destination-name-${index}`}
                        value={destination.name}
                        onChange={(e) => updateDestination(index, "name", e.target.value)}
                        placeholder="e.g., Riga, Latvia"
                        data-testid={`input-destination-name-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-location-${index}`}>Location/Area</Label>
                      <Input
                        id={`destination-location-${index}`}
                        value={destination.location}
                        onChange={(e) => updateDestination(index, "location", e.target.value)}
                        placeholder="e.g., Old Town, city center"
                        data-testid={`input-destination-location-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-start-${index}`}>Start Date *</Label>
                      <Input
                        id={`destination-start-${index}`}
                        type="date"
                        value={formatDateForInput(destination.startDate)}
                        onChange={(e) => updateDestination(index, "startDate", e.target.value)}
                        data-testid={`input-destination-start-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-end-${index}`}>End Date *</Label>
                      <Input
                        id={`destination-end-${index}`}
                        type="date"
                        value={formatDateForInput(destination.endDate)}
                        onChange={(e) => updateDestination(index, "endDate", e.target.value)}
                        min={formatDateForInput(destination.startDate)}
                        data-testid={`input-destination-end-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-weather-${index}`}>Weather</Label>
                      <Input
                        id={`destination-weather-${index}`}
                        value={destination.weather || ""}
                        onChange={(e) => updateDestination(index, "weather", e.target.value)}
                        placeholder="e.g., Cold, -5°C to 2°C, snow expected"
                        data-testid={`input-destination-weather-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`destination-weather-url-${index}`}>Weather Link</Label>
                      <Input
                        id={`destination-weather-url-${index}`}
                        type="url"
                        value={destination.weatherUrl || ""}
                        onChange={(e) => updateDestination(index, "weatherUrl", e.target.value)}
                        placeholder="https://weather.com/..."
                        data-testid={`input-destination-weather-url-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`destination-notes-${index}`}>Notes</Label>
                    <Textarea
                      id={`destination-notes-${index}`}
                      value={destination.notes || ""}
                      onChange={(e) => updateDestination(index, "notes", e.target.value)}
                      placeholder="Any additional notes about this destination..."
                      rows={2}
                      data-testid={`textarea-destination-notes-${index}`}
                    />
                  </div>

                  {/* Display preview of dates */}
                  {destination.dates && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                      <Calendar className="w-4 h-4" />
                      <span>{destination.dates}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Helper info */}
      {safeDestinations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Drag destinations to reorder them. The order determines the sequence of your itinerary.
          </p>
        </div>
      )}
    </div>
  );
}
