import { Cog, Pencil, User, X } from "lucide-react";
import type { ProfileAffinity } from "../../lib/types";

function formatSpend(totalSpendPence?: number | null) {
  if (!totalSpendPence) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(totalSpendPence / 100);
}

export function BrandPill({
  affinity,
  highlighted,
  onEdit,
  onDelete,
}: {
  affinity: ProfileAffinity;
  highlighted?: boolean;
  onEdit: (affinity: ProfileAffinity) => void;
  onDelete: (affinity: ProfileAffinity) => void;
}) {
  const purchaseMeta =
    !affinity.editable && (affinity.purchase_count || affinity.total_spend_pence)
      ? `${affinity.purchase_count || 0} purchases${affinity.total_spend_pence ? `, ${formatSpend(affinity.total_spend_pence)} spent` : ""}`
      : null;
  const detail = [
    affinity.added_by ? `Source: Added by ${affinity.added_by}` : null,
    affinity.inferred_from ? `Source: ${affinity.inferred_from}` : null,
    affinity.note ? `Note: ${affinity.note}` : null,
    purchaseMeta ? `Purchases: ${purchaseMeta}` : null,
    affinity.updated_at ? `Updated: ${affinity.updated_at}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      className={`group inline-flex items-center gap-2 border px-3 py-2 text-sm ${
        affinity.editable ? "border-[var(--border)] bg-[var(--sand-100)] text-[var(--text)]" : "border-[var(--sand-200)] bg-[var(--sand-200)] text-[#666]"
      } ${highlighted ? "border-[var(--black)] ring-2 ring-[var(--black)]/10" : ""}`}
      title={detail}
    >
      <span>{affinity.name}</span>
      {affinity.tier ? (
        <span className="border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
          {affinity.tier.replace(/_/g, " ")}
        </span>
      ) : null}
      {purchaseMeta ? <span className="text-xs text-[#666]">{purchaseMeta}</span> : null}
      {affinity.editable ? <User className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
      {affinity.editable ? (
        <span className="ml-1 inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={() => onEdit(affinity)} aria-label="Edit affinity">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(affinity)} aria-label="Delete affinity">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
