import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, Eye, Pencil, ArrowRight, MapPin, List as ListIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFullProject, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { DestinationBar } from '@/components/DestinationBar';
import { useDestinations, useCreateDestination, useUpdateDestination, useDeleteDestination } from '@/hooks/useDestinations';
import { AutofillInput, type ExtractedData } from '@/components/AutofillInput';
import { pb, type Accommodation, type Activity, type Dining, type Bar } from '@/lib/pocketbase';

type ItemTab = 'accommodations' | 'activities' | 'dining' | 'bars';

// Simplified item card for list mode (no destination assignment)
function ItemCard<T extends { id: string; name: string }>({
  item,
  type,
  onEdit,
  onDelete,
  onToggleSelect,
  isSelected,
}: {
  item: T;
  type: ItemTab;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  isSelected?: boolean;
}) {
  const typeLabels = {
    accommodations: 'Accommodation',
    activities: 'Activity',
    dining: 'Restaurant',
    bars: 'Bar',
  };

  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onToggleSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(item.id)}
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{item.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {typeLabels[type]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function ListEditor({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ItemTab>('accommodations');
  const [selectedForConvert, setSelectedForConvert] = useState<Set<string>>(new Set());
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: fullProject, isLoading } = useFullProject(projectId);
  const updateProjectMutation = useUpdateProject();
  const createProjectMutation = useCreateProject();

  // Item mutations - simplified for list mode
  const createItemMutation = useMutation({
    mutationFn: async ({ collection, data }: { collection: string; data: any }) => {
      return await pb.collection(collection).create({
        ...data,
        project: projectId,
        destination: null, // Lists don't have destinations
      });
    },
    onSuccess: () => {
      // Refetch project data
      window.location.reload();
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ collection, id, data }: { collection: string; id: string; data: any }) => {
      return await pb.collection(collection).update(id, data);
    },
    onSuccess: () => {
      window.location.reload();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ collection, id }: { collection: string; id: string }) => {
      return await pb.collection(collection).delete(id);
    },
    onSuccess: () => {
      window.location.reload();
    }
  });

  const allItems = [
    ...(fullProject?.accommodations || []).map(i => ({ ...i, type: 'accommodations' as const })),
    ...(fullProject?.activities || []).map(i => ({ ...i, type: 'activities' as const })),
    ...(fullProject?.dining || []).map(i => ({ ...i, type: 'dining' as const })),
    ...(fullProject?.bars || []).map(i => ({ ...i, type: 'bars' as const })),
  ];

  const handleAddItem = (data: any) => {
    const collectionMap = {
      accommodations: 'blckbx_accommodations',
      activities: 'blckbx_activities',
      dining: 'blckbx_dining',
      bars: 'blckbx_bars',
    };

    createItemMutation.mutate({
      collection: collectionMap[activeTab],
      data,
    });

    setAddDialogOpen(false);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    const collectionMap = {
      accommodations: 'blckbx_accommodations',
      activities: 'blckbx_activities',
      dining: 'blckbx_dining',
      bars: 'blckbx_bars',
    };

    updateItemMutation.mutate({
      collection: collectionMap[activeTab],
      id: editingItem.id,
      data: editingItem,
    });

    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!deleteId) return;

    const collectionMap = {
      accommodations: 'blckbx_accommodations',
      activities: 'blckbx_activities',
      dining: 'blckbx_dining',
      bars: 'blckbx_bars',
    };

    deleteItemMutation.mutate({
      collection: collectionMap[activeTab],
      id: deleteId,
    });

    setDeleteId(null);
  };

  const handleConvertToItinerary = () => {
    if (selectedForConvert.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to convert.",
        variant: "destructive",
      });
      return;
    }

    // Create a new itinerary project with selected items
    createProjectMutation.mutate({
      name: fullProject?.project.name + ' (Itinerary)',
      projectType: 'itinerary',
      customUrlSlug: '',
      assistantName: fullProject?.project.assistantName || '',
      assistantEmail: fullProject?.project.assistantEmail || '',
      status: 'draft',
      isTemplate: false,
      outboundTravelVisible: true,
      returnTravelVisible: true,
      helpfulInfoVisible: true,
    }, {
      onSuccess: (newProject) => {
        // Copy selected items to the new project
        const copyPromises = Array.from(selectedForConvert).map(itemId => {
          const item = allItems.find(i => i.id === itemId);
          if (!item) return Promise.resolve();

          const collectionMap = {
            accommodations: 'accommodations',
            activities: 'activities',
            dining: 'dining',
            bars: 'bars',
          };

          // Create a copy in the new project
          return pb.collection(collectionMap[item.type]).create({
            ...item,
            project: newProject.id,
            destination: null, // Will be assigned to destination later
            displayOrder: item.displayOrder,
          });
        });

        Promise.all(copyPromises).then(() => {
          toast({
            title: "Converted to Itinerary",
            description: `A new itinerary has been created with ${selectedForConvert.size} items.`,
          });
          setConvertDialogOpen(false);
          setSelectedForConvert(new Set());
          window.location.href = `/itinerary/edit/${newProject.id}`;
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <ListIcon className="w-3 h-3" />
                List Mode
              </Badge>
              <h1 className="text-xl font-semibold">{fullProject?.project.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/itinerary/edit/${projectId}`}>
                <Button variant="outline" size="sm">
                  Back to Edit
                </Button>
              </Link>
              {selectedForConvert.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setConvertDialogOpen(true)}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Convert to Itinerary ({selectedForConvert.size})
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Info banner */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <ListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">List Mode</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Add items without assigning them to destinations. When ready, convert to an itinerary
                  to organize items into destinations with travel logistics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select All */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allItems.length > 0 && selectedForConvert.size === allItems.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedForConvert(new Set(allItems.map(i => i.id)));
                } else {
                  setSelectedForConvert(new Set());
                }
              }}
            />
            <span className="text-sm text-muted-foreground">
              {selectedForConvert.size > 0
                ? `${selectedForConvert.size} of ${allItems.length} selected`
                : 'Select all'}
            </span>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add {activeTab.slice(0, -1)}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ItemTab)}>
          <TabsList>
            <TabsTrigger value="accommodations">
              Accommodations
              <Badge variant="secondary" className="ml-2">
                {fullProject?.accommodations?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activities">
              Activities
              <Badge variant="secondary" className="ml-2">
                {fullProject?.activities?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="dining">
              Dining
              <Badge variant="secondary" className="ml-2">
                {fullProject?.dining?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="bars">
              Bars
              <Badge variant="secondary" className="ml-2">
                {fullProject?.bars?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTab === 'accommodations' && (fullProject?.accommodations || []).map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="accommodations"
                  onEdit={handleEditItem}
                  onDelete={(id) => setDeleteId(id)}
                  onToggleSelect={(id) => {
                    const newSet = new Set(selectedForConvert);
                    if (newSet.has(id)) {
                      newSet.delete(id);
                    } else {
                      newSet.add(id);
                    }
                    setSelectedForConvert(newSet);
                  }}
                  isSelected={selectedForConvert.has(item.id)}
                />
              ))}
              {activeTab === 'activities' && (fullProject?.activities || []).map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="activities"
                  onEdit={handleEditItem}
                  onDelete={(id) => setDeleteId(id)}
                  onToggleSelect={(id) => {
                    const newSet = new Set(selectedForConvert);
                    if (newSet.has(id)) {
                      newSet.delete(id);
                    } else {
                      newSet.add(id);
                    }
                    setSelectedForConvert(newSet);
                  }}
                  isSelected={selectedForConvert.has(item.id)}
                />
              ))}
              {activeTab === 'dining' && (fullProject?.dining || []).map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="dining"
                  onEdit={handleEditItem}
                  onDelete={(id) => setDeleteId(id)}
                  onToggleSelect={(id) => {
                    const newSet = new Set(selectedForConvert);
                    if (newSet.has(id)) {
                      newSet.delete(id);
                    } else {
                      newSet.add(id);
                    }
                    setSelectedForConvert(newSet);
                  }}
                  isSelected={selectedForConvert.has(item.id)}
                />
              ))}
              {activeTab === 'bars' && (fullProject?.bars || []).map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  type="bars"
                  onEdit={handleEditItem}
                  onDelete={(id) => setDeleteId(id)}
                  onToggleSelect={(id) => {
                    const newSet = new Set(selectedForConvert);
                    if (newSet.has(id)) {
                      newSet.delete(id);
                    } else {
                      newSet.add(id);
                    }
                    setSelectedForConvert(newSet);
                  }}
                  isSelected={selectedForConvert.has(item.id)}
                />
              ))}
            </div>

            {(activeTab === 'accommodations' && (!fullProject?.accommodations || fullProject.accommodations.length === 0) ||
              activeTab === 'activities' && (!fullProject?.activities || fullProject.activities.length === 0) ||
              activeTab === 'dining' && (!fullProject?.dining || fullProject.dining.length === 0) ||
              activeTab === 'bars' && (!fullProject?.bars || fullProject.bars.length === 0)) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No {activeTab.slice(0, -1)} yet</p>
                  <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add {activeTab.slice(0, -1)}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add {activeTab.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Add a new {activeTab.slice(0, -1)} to your list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <AutofillInput
              onExtracted={(data) => {
                // Populate form with extracted data
                setEditingItem(data);
              }}
              itemType={activeTab === 'accommodations' ? 'accommodation' : activeTab === 'activities' ? 'activity' : activeTab === 'dining' ? 'dining' : 'bar'}
            />
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editingItem?.name || ''}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Enter name..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingItem?.description || ''}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                placeholder="Enter description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editingItem?.address || ''}
                onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                placeholder="Enter address..."
              />
            </div>
            <div className="space-y-2">
              <Label>Google Maps Link</Label>
              <Input
                type="url"
                value={editingItem?.googleMapsLink || ''}
                onChange={(e) => setEditingItem({ ...editingItem, googleMapsLink: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Info</Label>
              <Input
                value={editingItem?.contactInfo || ''}
                onChange={(e) => setEditingItem({ ...editingItem, contactInfo: e.target.value })}
                placeholder="Phone, email..."
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={editingItem?.websiteUrl || ''}
                onChange={(e) => setEditingItem({ ...editingItem, websiteUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                value={editingItem?.price || ''}
                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                placeholder="$$$, €€€, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingItem?.notes || ''}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditingItem(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!editingItem?.name}>
              Add {activeTab.slice(0, -1)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {activeTab.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editingItem?.name || ''}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editingItem?.description || ''}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editingItem?.address || ''}
                onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Google Maps Link</Label>
              <Input
                type="url"
                value={editingItem?.googleMapsLink || ''}
                onChange={(e) => setEditingItem({ ...editingItem, googleMapsLink: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Info</Label>
              <Input
                value={editingItem?.contactInfo || ''}
                onChange={(e) => setEditingItem({ ...editingItem, contactInfo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={editingItem?.websiteUrl || ''}
                onChange={(e) => setEditingItem({ ...editingItem, websiteUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                value={editingItem?.price || ''}
                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingItem?.notes || ''}
                onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingItem(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this item from your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Itinerary Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Itinerary</DialogTitle>
            <DialogDescription>
              Create a new itinerary with {selectedForConvert.size} selected items. You'll be able to add destinations and travel logistics afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              A new itinerary project will be created with a copy of the selected items.
              Your original list will remain unchanged.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertToItinerary}>
              <MapPin className="w-4 h-4 mr-2" />
              Convert to Itinerary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
