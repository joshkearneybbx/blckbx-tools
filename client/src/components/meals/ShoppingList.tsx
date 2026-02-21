import { Button } from "@/components/ui/button";
import type { ShoppingList as ShoppingListType } from "@/lib/meals/api";
import { ShoppingCategory } from "./ShoppingCategory";

interface ShoppingListProps {
  shoppingList: ShoppingListType;
  onBack: () => void;
  onExportPdf: () => Promise<void>;
  isExportingPdf?: boolean;
  onMarkAsSent?: () => Promise<void>;
  isMarkingAsSent?: boolean;
  canMarkAsSent?: boolean;
}

export function ShoppingList({
  shoppingList,
  onBack,
  onExportPdf,
  isExportingPdf = false,
  onMarkAsSent,
  isMarkingAsSent = false,
  canMarkAsSent = true,
}: ShoppingListProps) {
  const categories = Object.entries(shoppingList);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#E6E5E0] bg-white px-5 py-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">Shopping List</h3>
          <p className="text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">Categorised by aisle to speed up shopping.</p>
        </div>
        <div className="flex items-center gap-2">
          {onMarkAsSent ? (
            <Button
              type="button"
              variant="outline"
              onClick={onMarkAsSent}
              disabled={isMarkingAsSent || !canMarkAsSent}
              className="border-[#E6E5E0]"
            >
              {isMarkingAsSent ? "Updating..." : "Mark as Sent"}
            </Button>
          ) : null}
          <Button type="button" onClick={onExportPdf} disabled={isExportingPdf} className="bg-[#E7C51C] text-black hover:bg-[#d4b419]">
            {isExportingPdf ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {categories.map(([category, items]) => (
          <ShoppingCategory key={category} category={category} items={items} />
        ))}
      </div>

      <div className="rounded-md border-l-4 border-[#E7C51C] bg-white p-4 text-xs text-[#424242] [font-family:Inter,sans-serif]">
        <p className="font-semibold text-[#1a1a1a]">Shopping tips</p>
        <p>Check your cupboards first and buy produce last to keep it fresh. Batch-cook proteins to save time.</p>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onBack} className="border-[#E6E5E0]">
          Back to Plan
        </Button>
      </div>
    </div>
  );
}
