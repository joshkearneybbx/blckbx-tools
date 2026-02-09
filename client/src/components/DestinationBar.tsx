import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, MapPin, List, GripVertical, Trash2, Edit, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Destination } from '@/lib/pocketbase';

interface DestinationBarProps {
  destinations: Destination[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (data: Omit<Destination, 'id' | 'project' | 'displayOrder'>) => void;
  onUpdate: (id: string, data: Partial<Destination>) => void;
  onDelete: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  projectType?: 'itinerary' | 'list';
  isReadOnly?: boolean;
}

export function DestinationBar({
  destinations,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  projectType = 'itinerary',
  isReadOnly = false,
}: DestinationBarProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDates, setNewDates] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [editName, setEditName] = useState('');
  const [editDates, setEditDates] = useState('');
  const [editLocation, setEditLocation] = useState('');

  // List mode doesn't have destinations
  if (projectType === 'list') {
    return (
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <List className="w-3 h-3" />
                List Mode
              </Badge>
              <span className="text-sm text-muted-foreground">
                Lists don't have destinations - items are standalone
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    if (!newName.trim()) return;

    onAdd({
      name: newName.trim(),
      dates: newDates || undefined,
      location: newLocation || undefined,
    });

    setNewName('');
    setNewDates('');
    setNewLocation('');
    setAddDialogOpen(false);
  };

  const handleEdit = (destination: Destination) => {
    setEditingId(destination.id);
    setEditName(destination.name);
    setEditDates(destination.dates || '');
    setEditLocation(destination.location || '');
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingId || !editName.trim()) return;

    onUpdate(editingId, {
      name: editName.trim(),
      dates: editDates || undefined,
      location: editLocation || undefined,
    });

    setEditDialogOpen(false);
    setEditingId(null);
  };

  const selectedDestination = destinations.find(d => d.id === selectedId);

  return (
    <div className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Destinations scroll area */}
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-2 pb-2">
              <Button
                variant={selectedId === null ? "default" : "ghost"}
                size="sm"
                onClick={() => onSelect(null)}
                className="gap-2 whitespace-nowrap"
              >
                <MapPin className="w-4 h-4" />
                All Destinations
              </Button>

              {destinations.map((dest, index) => (
                <Badge
                  key={dest.id}
                  variant={selectedId === dest.id ? "default" : "outline"}
                  className={`gap-2 px-3 py-1.5 cursor-pointer whitespace-nowrap ${
                    selectedId === dest.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                  onClick={() => onSelect(dest.id)}
                >
                  {onReorder && !isReadOnly && (
                    <GripVertical className="w-3 h-3 opacity-50" />
                  )}
                  <span className="font-medium">{dest.name}</span>
                  {dest.dates && (
                    <span className="text-xs opacity-70">{dest.dates}</span>
                  )}
                  {!isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <ChevronDown className="w-3 h-3 opacity-70 hover:opacity-100" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(dest); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(dest.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </Badge>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Add destination button */}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Destination
            </Button>
          )}
        </div>

        {/* Selected destination details */}
        {selectedDestination && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{selectedDestination.name}</span>
              </div>
              {selectedDestination.dates && (
                <div className="text-muted-foreground">{selectedDestination.dates}</div>
              )}
              {selectedDestination.location && (
                <div className="text-muted-foreground">• {selectedDestination.location}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Destination Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Destination</DialogTitle>
            <DialogDescription>
              Add a new destination to your itinerary. This could be a city, region, or specific location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dest-name">Destination Name *</Label>
              <Input
                id="dest-name"
                placeholder="e.g., Lisbon, Algarve Coast, Sintra"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest-dates">Dates</Label>
              <Input
                id="dest-dates"
                placeholder="e.g., June 15-18, 2025"
                value={newDates}
                onChange={(e) => setNewDates(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest-location">Location</Label>
              <Textarea
                id="dest-location"
                placeholder="e.g., Portugal's southern coast, 30km from Faro"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              Add Destination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Destination Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Destination</DialogTitle>
            <DialogDescription>
              Update the destination details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dest-name">Destination Name *</Label>
              <Input
                id="edit-dest-name"
                placeholder="e.g., Lisbon, Algarve Coast, Sintra"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dest-dates">Dates</Label>
              <Input
                id="edit-dest-dates"
                placeholder="e.g., June 15-18, 2025"
                value={editDates}
                onChange={(e) => setEditDates(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dest-location">Location</Label>
              <Textarea
                id="edit-dest-location"
                placeholder="e.g., Portugal's southern coast, 30km from Faro"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Destination?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the destination and all its associated items (accommodations, activities, dining, bars).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && onDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DestinationBar;
