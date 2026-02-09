import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import logoUrl from "@assets/blckbx-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, GripVertical, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { CustomSectionWithData } from "@shared/schema";

type FieldType = "text" | "textarea" | "number" | "date" | "url" | "image";

interface FieldDefinition {
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: number;
}

export default function SectionBuilder() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CustomSectionWithData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<CustomSectionWithData[]>({
    queryKey: ["/api/custom-sections"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; fields: FieldDefinition[] }) => {
      return await apiRequest("POST", "/api/custom-sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-sections"] });
      toast({
        title: "Section created",
        description: "The custom section template has been created.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; fields: FieldDefinition[] }) => {
      return await apiRequest("PUT", `/api/custom-sections/${data.id}`, {
        name: data.name,
        description: data.description,
        fields: data.fields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-sections"] });
      toast({
        title: "Section updated",
        description: "The custom section template has been updated.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/custom-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-sections"] });
      toast({
        title: "Section deleted",
        description: "The custom section template has been deleted.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSectionName("");
    setSectionDescription("");
    setFields([]);
    setEditingSection(null);
    setDialogOpen(false);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        fieldName: `field_${fields.length + 1}`,
        fieldLabel: "",
        fieldType: "text",
        isRequired: 0,
      },
    ]);
  };

  const handleUpdateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleEdit = (section: CustomSectionWithData) => {
    setEditingSection(section);
    setSectionName(section.name);
    setSectionDescription(section.description || "");
    setFields(
      section.fields.map((f) => ({
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        fieldType: f.fieldType as FieldType,
        isRequired: f.isRequired,
      }))
    );
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!sectionName.trim()) {
      toast({
        title: "Error",
        description: "Section name is required.",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "Error",
        description: "At least one field is required.",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidFields = fields.some((f) => !f.fieldLabel.trim());
    if (hasInvalidFields) {
      toast({
        title: "Error",
        description: "All fields must have a label.",
        variant: "destructive",
      });
      return;
    }

    if (editingSection) {
      updateMutation.mutate({
        id: editingSection.id,
        name: sectionName,
        description: sectionDescription,
        fields,
      });
    } else {
      createMutation.mutate({
        name: sectionName,
        description: sectionDescription,
        fields,
      });
    }
  };

  const fieldTypeLabels: Record<FieldType, string> = {
    text: "Short Text",
    textarea: "Long Text",
    number: "Number",
    date: "Date",
    url: "URL",
    image: "Image URL",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/itinerary">
                <img
                  src={logoUrl}
                  alt="BlckBx"
                  className="h-12 w-auto cursor-pointer hover-elevate active-elevate-2 rounded p-1"
                  data-testid="img-logo"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Section Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Create reusable section templates for your itineraries
                </p>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-section">
              <Plus className="w-4 h-4 mr-2" />
              Create Section
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !sections || sections.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">No custom sections yet</p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-section">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <Card key={section.id} data-testid={`card-section-${section.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                      {section.description && (
                        <CardDescription className="mt-1">{section.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary" data-testid={`badge-field-count-${section.id}`}>
                      {section.fields.length} {section.fields.length === 1 ? "field" : "fields"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.fields.slice(0, 3).map((field) => (
                      <div key={field.id} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {fieldTypeLabels[field.fieldType as FieldType]}
                        </Badge>
                        <span className="text-muted-foreground">{field.fieldLabel}</span>
                        {field.isRequired === 1 && (
                          <span className="text-destructive text-xs">*</span>
                        )}
                      </div>
                    ))}
                    {section.fields.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{section.fields.length - 3} more...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 flex-1"
                      onClick={() => handleEdit(section)}
                      data-testid={`button-edit-section-${section.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive flex-1"
                      onClick={() => setDeleteId(section.id)}
                      data-testid={`button-delete-section-${section.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Section Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-section-builder">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit" : "Create"} Custom Section</DialogTitle>
            <DialogDescription>
              Define a reusable section template with custom fields.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name *</Label>
              <Input
                id="section-name"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g., Car Rental Details"
                data-testid="input-section-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                data-testid="textarea-section-description"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddField} data-testid="button-add-field">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No fields yet. Click "Add Field" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={index} data-testid={`card-field-${index}`}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-5 h-5 text-muted-foreground mt-2" />
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Field Label *</Label>
                                <Input
                                  value={field.fieldLabel}
                                  onChange={(e) =>
                                    handleUpdateField(index, { fieldLabel: e.target.value })
                                  }
                                  placeholder="e.g., Company Name"
                                  data-testid={`input-field-label-${index}`}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Field Type</Label>
                                <Select
                                  value={field.fieldType}
                                  onValueChange={(value) =>
                                    handleUpdateField(index, { fieldType: value as FieldType })
                                  }
                                >
                                  <SelectTrigger data-testid={`select-field-type-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Short Text</SelectItem>
                                    <SelectItem value="textarea">Long Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="url">URL</SelectItem>
                                    <SelectItem value="image">Image URL</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.isRequired === 1}
                                  onChange={(e) =>
                                    handleUpdateField(index, {
                                      isRequired: e.target.checked ? 1 : 0,
                                    })
                                  }
                                  className="rounded"
                                  data-testid={`checkbox-field-required-${index}`}
                                />
                                Required field
                              </label>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveField(index)}
                            data-testid={`button-remove-field-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} data-testid="button-cancel-section">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-section"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {editingSection ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingSection ? "Update Section" : "Create Section"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this section template. Any itineraries using this
              section will keep their data, but new itineraries won't be able to use this
              template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
