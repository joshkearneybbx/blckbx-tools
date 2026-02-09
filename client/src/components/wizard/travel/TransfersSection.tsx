/**
 * TransfersSection - Section for managing multiple transfers
 * Includes add button, list of TransferCards, and handles reordering
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Car } from "lucide-react";
import type { TransferSegment } from "@/lib/travel-types";
import { createEmptyTransfer, reorderTransfers } from "@/lib/travel-types";
import { TransferCard } from "./TransferCard";
import { EditTransferModal } from "./EditTransferModal";

interface TransfersSectionProps {
  title: string;
  transfers: TransferSegment[];
  onChange: (transfers: TransferSegment[]) => void;
}

export function TransfersSection({
  title,
  transfers,
  onChange,
}: TransfersSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingTransfer, setEditingTransfer] = useState<TransferSegment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleAddTransfer = () => {
    const newTransfer = createEmptyTransfer(transfers.length);
    setEditingTransfer(newTransfer);
    setShowEditModal(true);
  };

  const handleEditTransfer = (transfer: TransferSegment) => {
    setEditingTransfer(transfer);
    setShowEditModal(true);
  };

  const handleSaveTransfer = (transfer: TransferSegment) => {
    const existingIndex = transfers.findIndex((t) => t.id === transfer.id);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...transfers];
      updated[existingIndex] = transfer;
      onChange(updated);
    } else {
      // Add new
      onChange([...transfers, transfer]);
    }
    setShowEditModal(false);
    setEditingTransfer(null);
  };

  const handleRemoveTransfer = (id: string) => {
    const updated = transfers
      .filter((t) => t.id !== id)
      .map((t, i) => ({ ...t, order: i }));
    onChange(updated);
  };

  const handleMoveTransfer = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= transfers.length) return;
    onChange(reorderTransfers(transfers, fromIndex, toIndex));
  };

  // Sort by order
  const sortedTransfers = [...transfers].sort((a, b) => a.order - b.order);

  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-800/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          {transfers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({transfers.length} transfer{transfers.length !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAddTransfer();
            }}
            className="h-7 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Transfer
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Transfer List */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {sortedTransfers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No transfers added. Click "Add Transfer" to add one.
            </div>
          ) : (
            <>
              {sortedTransfers.map((transfer, index) => (
                <div key={transfer.id} className="relative">
                  <TransferCard
                    transfer={transfer}
                    index={index}
                    onEdit={() => handleEditTransfer(transfer)}
                    onRemove={() => handleRemoveTransfer(transfer.id)}
                  />
                  {/* Reorder buttons for mobile/accessibility */}
                  {sortedTransfers.length > 1 && (
                    <div className="absolute right-20 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100">
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveTransfer(index, 'up')}
                          className="h-5 w-5 p-0"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                      )}
                      {index < sortedTransfers.length - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveTransfer(index, 'down')}
                          className="h-5 w-5 p-0"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Edit Transfer Modal */}
      <EditTransferModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTransfer(null);
        }}
        onSave={handleSaveTransfer}
        transfer={editingTransfer}
      />
    </div>
  );
}
