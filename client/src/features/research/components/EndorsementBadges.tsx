import { Endorsement } from "../lib/types";

export function EndorsementBadges({ endorsements }: { endorsements?: Endorsement[] }) {
  if (!endorsements?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {endorsements.map((endorsement, index) => (
        <div
          key={`${endorsement.source}-${endorsement.award}-${index}`}
          className="inline-flex items-center gap-[5px] py-[3px] text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--sand-900)]"
        >
          <span className="h-1 w-1 bg-[var(--black)]" />
          <span>{`${endorsement.source} ${endorsement.award}`}</span>
        </div>
      ))}
    </div>
  );
}
