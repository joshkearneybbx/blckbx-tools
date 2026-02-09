import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import type { CustomSectionWithData } from "@shared/schema";

interface CustomSectionData {
  customSectionId: string;
  sectionTitle: string;
  fieldValues: Record<string, string>;
}

interface Page10CustomSectionsProps {
  data: CustomSectionData[];
  onChange: (data: CustomSectionData[]) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function Page10CustomSections({ data, onChange, onValidationChange }: Page10CustomSectionsProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const { data: availableSections, isLoading, error } = useQuery<CustomSectionWithData[]>({
    queryKey: ["/api/custom-sections"],
  });

  // Ensure data is always an array
  const sections = data || [];

  const handleAddSection = () => {
    if (!selectedSectionId || !availableSections) return;

    const section = availableSections.find(s => s.id === selectedSectionId);
    if (!section) return;

    const newSection: CustomSectionData = {
      customSectionId: selectedSectionId,
      sectionTitle: section.name,
      fieldValues: {},
    };

    onChange([...sections, newSection]);
    setSelectedSectionId("");
  };

  const handleRemoveSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };

  const handleUpdateFieldValue = (sectionIndex: number, fieldId: string, value: string) => {
    const newData = [...sections];
    newData[sectionIndex] = {
      ...newData[sectionIndex],
      fieldValues: {
        ...newData[sectionIndex].fieldValues,
        [fieldId]: value,
      },
    };
    onChange(newData);
  };

  const handleUpdateSectionTitle = (index: number, title: string) => {
    const newData = [...sections];
    newData[index] = { ...newData[index], sectionTitle: title };
    onChange(newData);
  };

  const getSectionDefinition = (sectionId: string) => {
    return availableSections?.find(s => s.id === sectionId);
  };

  const validateRequiredFields = () => {
    if (!availableSections || sections.length === 0) {
      onValidationChange?.(true);
      return true;
    }

    for (const sectionData of sections) {
      const section = getSectionDefinition(sectionData.customSectionId);
      if (!section) continue;

      for (const field of section.fields) {
        if (field.isRequired === 1) {
          const value = sectionData.fieldValues[field.id];
          if (!value || value.trim() === "") {
            onValidationChange?.(false);
            return false;
          }
        }
      }
    }

    onValidationChange?.(true);
    return true;
  };

  // Validate whenever data changes
  useEffect(() => {
    validateRequiredFields();
  }, [sections, availableSections]);

  const getFieldError = (sectionIndex: number, fieldId: string) => {
    const sectionData = sections[sectionIndex];
    const section = getSectionDefinition(sectionData.customSectionId);
    if (!section) return null;

    const field = section.fields.find(f => f.id === fieldId);
    if (!field || field.isRequired !== 1) return null;

    const value = sectionData.fieldValues[fieldId];
    if (!value || value.trim() === "") {
      return "This field is required";
    }

    return null;
  };

  const availableSectionsToAdd = availableSections?.filter(
    s => !sections.some(d => d.customSectionId === s.id)
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold mb-2">Custom Sections (Optional)</h2>
        <p className="text-muted-foreground">
          Add any custom sections you've created to this itinerary.
        </p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading custom sections...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load custom sections. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((sectionData, sectionIndex) => {
            const section = getSectionDefinition(sectionData.customSectionId);
            if (!section) return null;

            return (
              <Card key={sectionIndex} data-testid={`card-custom-section-${sectionIndex}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{section.name}</CardTitle>
                      <div className="space-y-2">
                        <Label>Section Title (Optional)</Label>
                        <Input
                          value={sectionData.sectionTitle}
                          onChange={(e) => handleUpdateSectionTitle(sectionIndex, e.target.value)}
                          placeholder={section.name}
                          data-testid={`input-section-title-${sectionIndex}`}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSection(sectionIndex)}
                      data-testid={`button-remove-section-${sectionIndex}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {section.fields.map((field) => {
                    const error = getFieldError(sectionIndex, field.id);
                    
                    return (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`field-${field.id}`}>
                          {field.fieldLabel}
                          {field.isRequired === 1 && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.fieldType === 'textarea' ? (
                          <Textarea
                            id={`field-${field.id}`}
                            value={sectionData.fieldValues[field.id] || ""}
                            onChange={(e) => handleUpdateFieldValue(sectionIndex, field.id, e.target.value)}
                            placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                            rows={3}
                            className={error ? "border-destructive" : ""}
                            data-testid={`textarea-${field.id}-${sectionIndex}`}
                          />
                        ) : (
                          <Input
                            id={`field-${field.id}`}
                            type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                            value={sectionData.fieldValues[field.id] || ""}
                            onChange={(e) => handleUpdateFieldValue(sectionIndex, field.id, e.target.value)}
                            placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                            className={error ? "border-destructive" : ""}
                            data-testid={`input-${field.id}-${sectionIndex}`}
                          />
                        )}
                        {error && (
                          <p className="text-sm text-destructive">{error}</p>
                        )}
                        {field.fieldType === 'url' && sectionData.fieldValues[field.id] && (
                          <a
                            href={sectionData.fieldValues[field.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Preview link
                          </a>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && availableSectionsToAdd.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Custom Section</CardTitle>
            <CardDescription>
              Select from your custom section templates to add to this itinerary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="flex-1" data-testid="select-section-template">
                  <SelectValue placeholder="Choose a section template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSectionsToAdd.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name} ({section.fields.length} fields)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddSection}
                disabled={!selectedSectionId}
                data-testid="button-add-custom-section"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && availableSectionsToAdd.length === 0 && sections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No custom section templates available. Create templates in the Section Builder first.
            </p>
            <a href="/itinerary/section-builder" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                Go to Section Builder
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && sections.length === 0 && availableSectionsToAdd.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No custom sections added yet. Use the selector above to add one.
        </div>
      )}
    </div>
  );
}
