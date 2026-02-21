interface ChipOption {
  label: string;
  value: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export function ChipSelect({ options, selected, onChange, className }: ChipSelectProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    onChange([...selected, value]);
  };

  return (
    <div className={["flex flex-wrap gap-2", className ?? ""].join(" ")}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isSelected
                ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                : "border-[#E6E5E0] bg-white text-[#424242] hover:border-[#D0D6D0]",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
