import { Category } from "../lib/types";
import { cn } from "../lib/utils";

const chips: Array<{ label: string; value: Category }> = [
  { label: "All", value: "all" },
  { label: "Shopping", value: "shopping" },
  { label: "Going Out", value: "going_out" },
  { label: "Gifting", value: "gifting" },
  { label: "Travel", value: "travel" },
  { label: "Staying In", value: "staying_in" },
];

export function FilterChips({
  active,
  onChange,
}: {
  active: Category;
  onChange: (value: Category) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          className={cn(
            "chip px-4 py-2 text-sm",
            active === chip.value ? "chip-active" : "text-[var(--black)]",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
