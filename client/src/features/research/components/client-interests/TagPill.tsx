import { Cog, Pencil, User, X } from "lucide-react";
import type { ProfileInterest } from "../../lib/types";

function toPercent(strength: number) {
  return Math.max(10, Math.min(100, strength <= 1 ? Math.round(strength * 100) : Math.round(strength)));
}

export function TagPill({
  interest,
  highlighted,
  onEdit,
  onDelete,
}: {
  interest: ProfileInterest;
  highlighted?: boolean;
  onEdit: (interest: ProfileInterest) => void;
  onDelete: (interest: ProfileInterest) => void;
}) {
  const detail = [
    interest.added_by ? `Source: Added by ${interest.added_by}` : null,
    interest.inferred_from ? `Source: ${interest.inferred_from}` : null,
    interest.note ? `Note: ${interest.note}` : null,
    interest.updated_at ? `Updated: ${interest.updated_at}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className={`group relative inline-flex items-center gap-2 border px-3 py-2 text-sm ${
        interest.editable ? "border-[var(--border)] bg-[var(--sand-100)] text-[var(--text)]" : "border-[var(--sand-200)] bg-[var(--sand-200)] text-[#666]"
      } ${highlighted ? "border-[var(--black)] ring-2 ring-[var(--black)]/10" : ""}`}
      title={detail}
    >
      <span className="pr-1">{interest.label}</span>
      {interest.editable ? <User className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
      {interest.editable ? (
        <span className="ml-1 inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={() => onEdit(interest)} aria-label="Edit interest">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(interest)} aria-label="Delete interest">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : null}
      <span
        className="absolute bottom-0 left-0 h-[2px] bg-[#3ECFB2]"
        style={{ width: `${toPercent(interest.strength)}%` }}
      />
    </div>
  );
}
