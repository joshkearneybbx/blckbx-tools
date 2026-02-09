import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { WizardData } from "@/pages/CreateItinerary";

type Props = {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
};

export default function Page8HelpfulInfo({ data, updateData }: Props) {
  const updateInfo = (field: string, value: string) => {
    updateData({
      helpfulInformation: {
        ...data.helpfulInformation,
        [field]: value,
      },
    });
  };

  const addCustomField = () => {
    updateData({
      helpfulInformation: {
        ...data.helpfulInformation,
        customFields: [
          ...(data.helpfulInformation.customFields || []),
          { label: "", value: "" },
        ],
      },
    });
  };

  const removeCustomField = (index: number) => {
    updateData({
      helpfulInformation: {
        ...data.helpfulInformation,
        customFields: data.helpfulInformation.customFields.filter((_, i) => i !== index),
      },
    });
  };

  const updateCustomField = (index: number, field: "label" | "value", value: string) => {
    const newCustomFields = [...(data.helpfulInformation.customFields || [])];
    newCustomFields[index] = { ...newCustomFields[index], [field]: value };
    updateData({
      helpfulInformation: {
        ...data.helpfulInformation,
        customFields: newCustomFields,
      },
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add helpful contact information and emergency details. All fields are optional.
      </p>

      {/* Standard Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Standard Fields</h3>

        <div className="space-y-2">
          <Label htmlFor="localEmergency">Local Emergency Number</Label>
          <Input
            id="localEmergency"
            value={data.helpfulInformation.localEmergency}
            onChange={(e) => updateInfo("localEmergency", e.target.value)}
            placeholder="e.g., 112"
            data-testid="input-local-emergency"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nearestEmbassy">Nearest British Embassy/Consulate</Label>
          <Textarea
            id="nearestEmbassy"
            value={data.helpfulInformation.nearestEmbassy}
            onChange={(e) => updateInfo("nearestEmbassy", e.target.value)}
            placeholder="Include address and contact details"
            data-testid="textarea-nearest-embassy"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="travelInsurance">Travel Insurance Contact</Label>
          <Textarea
            id="travelInsurance"
            value={data.helpfulInformation.travelInsurance}
            onChange={(e) => updateInfo("travelInsurance", e.target.value)}
            placeholder="Insurance company name and emergency contact number"
            data-testid="textarea-travel-insurance"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="airlineCustomerService">Airline/Travel Provider Customer Service</Label>
          <Input
            id="airlineCustomerService"
            value={data.helpfulInformation.airlineCustomerService}
            onChange={(e) => updateInfo("airlineCustomerService", e.target.value)}
            placeholder="e.g., +44 123 456 7890"
            data-testid="input-airline-service"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="localMedicalClinic">Local Medical Clinic/Hospital</Label>
          <Textarea
            id="localMedicalClinic"
            value={data.helpfulInformation.localMedicalClinic}
            onChange={(e) => updateInfo("localMedicalClinic", e.target.value)}
            placeholder="Nearest medical facility with address and contact"
            data-testid="textarea-medical-clinic"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transportContacts">Local Transport Contacts</Label>
          <Textarea
            id="transportContacts"
            value={data.helpfulInformation.transportContacts}
            onChange={(e) => updateInfo("transportContacts", e.target.value)}
            placeholder="Taxi companies, car rental, etc."
            data-testid="textarea-transport-contacts"
          />
        </div>
      </div>

      {/* Custom Fields */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Additional Information</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomField}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Custom Field
          </Button>
        </div>

        {data.helpfulInformation.customFields && data.helpfulInformation.customFields.length > 0 ? (
          <div className="space-y-3">
            {data.helpfulInformation.customFields.map((field, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Label (e.g., Tour Guide)"
                    value={field.label}
                    onChange={(e) => updateCustomField(index, "label", e.target.value)}
                    data-testid={`input-custom-label-${index}`}
                  />
                  <Input
                    placeholder="Value (e.g., Ahmed +20 123 456)"
                    value={field.value}
                    onChange={(e) => updateCustomField(index, "value", e.target.value)}
                    data-testid={`input-custom-value-${index}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(index)}
                  className="mt-2"
                  data-testid={`button-remove-custom-${index}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No custom fields added. Click "Add Custom Field" to add additional information.
          </p>
        )}
      </div>
    </div>
  );
}
