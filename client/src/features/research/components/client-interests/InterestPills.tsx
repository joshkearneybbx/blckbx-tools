import type { ProfileInterest } from "../../lib/types";
import { TagPill } from "./TagPill";

function sortInterests(items: ProfileInterest[]) {
  return [...items].sort((a, b) => {
    if (a.editable !== b.editable) return a.editable ? -1 : 1;
    return b.strength - a.strength;
  });
}

export function InterestPills(props: {
  interests: ProfileInterest[];
  highlightedEdgeKey?: string | null;
  onEdit: (interest: ProfileInterest) => void;
  onDelete: (interest: ProfileInterest) => void;
}) {
  const sorted = sortInterests(props.interests);

  if (sorted.length === 0) {
    return <div className="empty-state px-4 py-5 text-sm">No interests added yet</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((interest) => (
        <TagPill
          key={interest.edge_key}
          interest={interest}
          highlighted={props.highlightedEdgeKey === interest.edge_key}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  );
}
