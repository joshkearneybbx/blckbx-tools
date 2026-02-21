import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface ShoppingCategoryProps {
  category: string;
  items: string[];
}

function categoryIcon(category: string): string {
  const key = category.toLowerCase();
  if (key.includes("fruit") || key.includes("veg")) return "🥬";
  if (key.includes("meat") || key.includes("fish")) return "🥩";
  if (key.includes("dairy") || key.includes("egg")) return "🧀";
  if (key.includes("tins") || key.includes("jar")) return "🥫";
  if (key.includes("pantry") || key.includes("spice")) return "🧂";
  if (key.includes("nut") || key.includes("seed")) return "🥜";
  if (key.includes("carb") || key.includes("grain")) return "🍞";
  return "📦";
}

export function ShoppingCategory({ category, items }: ShoppingCategoryProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const itemKeys = useMemo(
    () => items.map((item, index) => `${category}-${item}-${index}`),
    [category, items]
  );

  return (
    <div className="rounded-[14px] border border-[#E6E5E0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcon(category)}</span>
          <h4 className="text-sm font-semibold text-[#1a1a1a] [font-family:Inter,sans-serif]">{category}</h4>
        </div>
        <span className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">{items.length} items</span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const key = itemKeys[index];
          const isChecked = !!checked[key];

          return (
            <label key={key} className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [key]: !!value }))}
                className="mt-0.5 border-[#D0D6D0] data-[state=checked]:border-[#1a1a1a] data-[state=checked]:bg-[#1a1a1a]"
              />
              <span
                className={[
                  "text-sm text-[#424242] [font-family:Inter,sans-serif]",
                  isChecked ? "text-[#9B9797] line-through" : "",
                ].join(" ")}
              >
                {item}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
