import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Eye, EyeOff, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { CARD_CLASS, SECONDARY_BUTTON } from '../lib/styles';
import { getFileUrl } from '../lib/api';
import type { ShortlistOption } from '../lib/types';

interface ShortlistOptionCardProps {
  option: ShortlistOption;
  onEdit: (option: ShortlistOption) => void;
  onDelete: (option: ShortlistOption) => void;
  onToggleVisible: (option: ShortlistOption) => void;
}

export default function ShortlistOptionCard({ option, onEdit, onDelete, onToggleVisible }: ShortlistOptionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const primary = option.primaryImage || option.images?.[0];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${CARD_CLASS} ${isDragging ? 'opacity-70' : ''} ${!option.visible ? 'opacity-55' : ''} p-4`}
    >
      <div className="flex items-center gap-3">
        <button type="button" className="cursor-grab border border-[#D4D0CB] bg-white p-2 text-[#6B6865]" {...attributes} {...listeners} aria-label="Drag option">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="h-16 w-20 flex-shrink-0 border border-[#D4D0CB] bg-white">
          {primary ? (
            <img src={getFileUrl(option, primary)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#F5F3F0]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#0A0A0A]">{option.name || 'Untitled option'}</h3>
            {option.rating && <span className="border border-[#D4D0CB] bg-white px-2 py-0.5 text-xs text-[#6B6865]">{option.rating}</span>}
          </div>
          {option.sourceType === 'autofill' && <p className="mt-1 text-xs text-[#6B6865]">Autofilled</p>}
        </div>
        {option.quote && <div className="text-right text-sm font-semibold tabular-nums text-[#0A0A0A]">{option.quote}</div>}
        <button type="button" onClick={() => onToggleVisible(option)} className={SECONDARY_BUTTON} aria-label="Toggle visibility">
          {option.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => onEdit(option)} className={SECONDARY_BUTTON} aria-label="Edit option">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(option)} className={SECONDARY_BUTTON} aria-label="Delete option">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
