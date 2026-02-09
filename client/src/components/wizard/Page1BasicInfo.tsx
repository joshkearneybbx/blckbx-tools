import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WizardData } from "@/pages/CreateItinerary";
import { isReservedSlug } from "@/lib/reserved-slugs";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page1BasicInfo({ data, updateData }: Props) {
  const addTraveller = () => {
    const currentTravellers = data.travellers || [];
    const newTraveller = {
      name: "",
      type: "adult" as const,
      ageAtTravel: null,
      displayOrder: currentTravellers.length,
    };
    updateData({ travellers: [...currentTravellers, newTraveller] });
  };

  const removeTraveller = (index: number) => {
    const currentTravellers = data.travellers || [];
    const newTravellers = currentTravellers.filter((_, i) => i !== index);
    updateData({ travellers: newTravellers });
  };

  const updateTraveller = (index: number, field: string, value: string | number | null) => {
    const currentTravellers = data.travellers || [];
    const newTravellers = [...currentTravellers];
    newTravellers[index] = { ...newTravellers[index], [field]: value };
    
    // If changing type to adult, clear the age field
    if (field === "type" && value === "adult") {
      newTravellers[index].ageAtTravel = null;
    }
    
    updateData({ travellers: newTravellers });
  };

  const generateSlugPreview = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const slugPreview = generateSlugPreview(data.title || '');
  const slugIsReserved = slugPreview ? isReservedSlug(slugPreview) : false;

  return (
    <div className="space-y-8">
      {/* Travel Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Travel Details</h3>

        <div className="space-y-2">
          <Label htmlFor="title">Itinerary Title *</Label>
          <Input
            id="title"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="e.g., Latvia Christmas 2025"
            data-testid="input-title"
          />
          {slugPreview && !slugIsReserved && (
            <p className="text-sm text-muted-foreground">
              URL: <span className="font-mono">/itinerary/{slugPreview}</span>
            </p>
          )}
          {slugIsReserved && (
            <p className="text-sm text-red-600" data-testid="error-reserved-slug">
              This URL is reserved, please choose a different title
            </p>
          )}
        </div>
      </div>

      {/* Assistant Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Assistant Information</h3>

        <div className="space-y-2">
          <Label htmlFor="assistantName">Name *</Label>
          <Input
            id="assistantName"
            value={data.assistantName}
            onChange={(e) => updateData({ assistantName: e.target.value })}
            data-testid="input-assistant-name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assistantEmail">Email *</Label>
          <Input
            id="assistantEmail"
            type="email"
            value={data.assistantEmail}
            onChange={(e) => updateData({ assistantEmail: e.target.value })}
            data-testid="input-assistant-email"
          />
        </div>
      </div>

      {/* Traveller Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Travellers</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTraveller}
            data-testid="button-add-traveller"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Traveller
          </Button>
        </div>

        {!data.travellers || data.travellers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No travellers added yet. Click "Add Traveller" to add traveller details.
          </p>
        ) : (
          <div className="space-y-4">
            {data.travellers.map((traveller, index) => {
              const isChild = traveller.type === "child";
              const nameSuggestsChild = traveller.name.toLowerCase().includes("child");
              const typeMismatch = nameSuggestsChild && !isChild;

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg space-y-3 relative ${typeMismatch ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}`}
                  data-testid={`traveller-item-${index}`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeTraveller(index)}
                    data-testid={`button-remove-traveller-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  {/* Type Badge Indicator */}
                  <div className="flex items-center gap-2 pr-10">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={isChild ? "default" : "secondary"} className="text-xs">
                      {isChild ? "Child" : "Adult"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">Traveller #{index + 1}</span>
                  </div>

                  <div className="space-y-2 pr-10">
                    <Label htmlFor={`traveller-name-${index}`}>Name</Label>
                    <Input
                      id={`traveller-name-${index}`}
                      value={traveller.name}
                      onChange={(e) => updateTraveller(index, "name", e.target.value)}
                      placeholder="Traveller name"
                      data-testid={`input-traveller-name-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`traveller-type-${index}`}>
                      Type {isChild && <span className="text-red-500">*</span>}
                    </Label>
                    <Select
                      value={traveller.type}
                      onValueChange={(value) => updateTraveller(index, "type", value)}
                    >
                      <SelectTrigger id={`traveller-type-${index}`} data-testid={`select-traveller-type-${index}`}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">👤 Adult</SelectItem>
                        <SelectItem value="child">👶 Child</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Warning hint when name suggests child but type is adult */}
                    {typeMismatch && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ⚠️ Name contains "child" but type is set to Adult. Change type to Child if needed.
                      </p>
                    )}
                  </div>

                  {isChild && (
                    <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <Label htmlFor={`traveller-age-${index}`} className="text-blue-700 dark:text-blue-300">
                        Age at Travel <span className="text-red-500">*</span>
                        <span className="font-normal text-xs ml-1">(required for children)</span>
                      </Label>
                      <Input
                        id={`traveller-age-${index}`}
                        type="number"
                        value={traveller.ageAtTravel ?? ""}
                        onChange={(e) => updateTraveller(index, "ageAtTravel", e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="e.g., 8"
                        min="0"
                        max="18"
                        data-testid={`input-traveller-age-${index}`}
                        className={!traveller.ageAtTravel ? 'border-amber-500' : ''}
                      />
                      {!traveller.ageAtTravel && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ Age is required for child travellers
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
