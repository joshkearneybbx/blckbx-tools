import type { ProfileAffinity } from "../../lib/types";
import { BrandPill } from "./BrandPill";

function sortAffinities(items: ProfileAffinity[]) {
  return [...items].sort((a, b) => {
    if (a.editable !== b.editable) return a.editable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function AffinityPills(props: {
  affinities: ProfileAffinity[];
  highlightedEdgeKey?: string | null;
  onEdit: (affinity: ProfileAffinity) => void;
  onDelete: (affinity: ProfileAffinity) => void;
}) {
  const sorted = sortAffinities(props.affinities);

  if (sorted.length === 0) {
    return <div className="empty-state px-4 py-5 text-sm">No brand affinities added yet</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((affinity) => (
        <BrandPill
          key={affinity.edge_key}
          affinity={affinity}
          highlighted={props.highlightedEdgeKey === affinity.edge_key}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  );
}
