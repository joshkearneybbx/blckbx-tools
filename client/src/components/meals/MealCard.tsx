import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Pencil, RefreshCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { enhanceImageUrl, getMealMacros, type MacroOverride, type MealPlanItem } from "@/lib/meals/api";

interface MealCardProps {
  item: MealPlanItem;
  macroOverride?: MacroOverride;
  noteOverride?: string;
  onSwap: () => void;
  onFeedback: (feedback: "liked" | "disliked") => void;
  onSaveMacros: (macros: MacroOverride) => void;
  onSaveNote: (note: string) => Promise<void> | void;
  onSaveTitle: (title: string) => Promise<void> | void;
}

const MEAL_TYPE_STYLES: Record<string, string> = {
  dinner: "bg-[#F3E8FF] text-[#7C3AED]",
  lunch: "bg-[#FFF8E1] text-[#B8860B]",
  breakfast: "bg-[#FFF0E6] text-[#C4653A]",
  snack: "bg-[#E8F5E9] text-[#1EA86B]",
};

function toInputValue(value?: number): string {
  return typeof value === "number" && value > 0 ? String(value) : "";
}

function parseMacroInput(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function MealCard({
  item,
  macroOverride,
  noteOverride,
  onSwap,
  onFeedback,
  onSaveMacros,
  onSaveNote,
  onSaveTitle,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const currentFeedback = item.feedback ?? null;
  const title = item.title ?? item.recipe?.title ?? "Untitled meal";
  const [titleDraft, setTitleDraft] = useState(title);
  const ingredients = item.ingredients ?? item.recipe?.ingredients ?? [];
  const instructions = item.instructions ?? item.recipe?.instructions ?? [];
  const imageUrl = enhanceImageUrl(item.image_url || item.recipe?.image_url || "");
  const noteText = (noteOverride ?? "").trim();
  const [noteDraft, setNoteDraft] = useState(noteText);
  const macros = getMealMacros(item, macroOverride ? { [item.meal_plan_item_id ?? item.id]: macroOverride } : undefined);
  const [macroDraft, setMacroDraft] = useState({
    calories: toInputValue(macros.calories),
    protein: toInputValue(macros.protein),
    carbs: toInputValue(macros.carbs),
    fat: toInputValue(macros.fat),
  });

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(title);
    }
  }, [isEditingTitle, title]);

  useEffect(() => {
    if (!isEditingMacros) {
      setMacroDraft({
        calories: toInputValue(macros.calories),
        protein: toInputValue(macros.protein),
        carbs: toInputValue(macros.carbs),
        fat: toInputValue(macros.fat),
      });
    }
  }, [isEditingMacros, macros.calories, macros.protein, macros.carbs, macros.fat]);

  useEffect(() => {
    if (!isEditingNote) {
      setNoteDraft(noteText);
    }
  }, [isEditingNote, noteText]);

  const macroMetaItems = [
    typeof macros.calories === "number" ? `${Math.round(macros.calories)} kcal` : null,
    typeof macros.protein === "number" ? `${Math.round(macros.protein)}g protein` : null,
    typeof macros.carbs === "number" ? `${Math.round(macros.carbs)}g carbs` : null,
    typeof macros.fat === "number" ? `${Math.round(macros.fat)}g fat` : null,
  ].filter(Boolean) as string[];

  const metaItems = [
    `${item.cook_time ?? 0} min`,
    ...macroMetaItems,
    `${item.servings ?? 1} servings`,
    item.source ? item.source : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-[10px] border border-[#E6E5E0] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={title}
              onError={() => setImgError(true)}
              className="h-12 w-12 shrink-0 rounded-[8px] object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="min-w-0">
            <span className={[
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
              MEAL_TYPE_STYLES[item.meal_type] ?? "bg-[#F8F8F8] text-[#424242]",
            ].join(" ")}>{item.meal_type}</span>
            {isEditingTitle ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  className="h-7 w-full min-w-[180px] rounded-md border border-[#E6E5E0] bg-white px-2 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
                />
                <button
                  type="button"
                  disabled={isSavingTitle}
                  onClick={() => {
                    setTitleDraft(title);
                    setIsEditingTitle(false);
                  }}
                  className="rounded-md border border-[#E6E5E0] px-2 py-1 text-[11px] font-medium text-[#6B6B68]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingTitle || !titleDraft.trim()}
                  onClick={async () => {
                    const nextTitle = titleDraft.trim();
                    if (!nextTitle || nextTitle === title) {
                      setIsEditingTitle(false);
                      return;
                    }
                    setIsSavingTitle(true);
                    try {
                      await onSaveTitle(nextTitle);
                      setIsEditingTitle(false);
                    } finally {
                      setIsSavingTitle(false);
                    }
                  }}
                  className="rounded-md bg-[#E7C51C] px-2 py-1 text-[11px] font-semibold text-black disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-[#1a1a1a] [font-family:Inter,sans-serif]">{title}</h4>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="rounded-md border border-[#E6E5E0] p-1 text-[#6B6B68]"
                  aria-label="Edit recipe name"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFeedback("liked")}
            className={[
              "rounded-md border p-1.5",
              currentFeedback === "liked"
                ? "border-[#1EA86B] text-[#1EA86B]"
                : "border-[#E6E5E0] text-[#9B9797]",
            ].join(" ")}
            aria-label="Like"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFeedback("disliked")}
            className={[
              "rounded-md border p-1.5",
              currentFeedback === "disliked"
                ? "border-[#E33737] text-[#E33737]"
                : "border-[#E6E5E0] text-[#9B9797]",
            ].join(" ")}
            aria-label="Dislike"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-md border border-[#E6E5E0] p-1.5 text-[#6B6B68]"
            aria-label="Expand"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onSwap}
            className="inline-flex items-center gap-1 rounded-md border border-[#1a1a1a] px-2 py-1 text-xs font-medium text-[#1a1a1a]"
          >
            <RefreshCcw className="h-3 w-3" />
            Swap
          </button>
          <button
            type="button"
            onClick={() => setIsEditingMacros((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E6E5E0] px-2 py-1 text-xs font-medium text-[#6B6B68]"
          >
            <Pencil className="h-3 w-3" />
            Edit Macros
          </button>
          <button
            type="button"
            onClick={() => setIsEditingNote((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-md border border-[#E6E5E0] px-2 py-1 text-xs font-medium text-[#6B6B68]"
          >
            <MessageSquare className="h-3 w-3" />
            {noteText ? "Edit Note" : "Add Note"}
          </button>
        </div>
      </div>

      <div className="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B6B68] [font-family:Inter,sans-serif]">
        {metaItems.map((meta) => (
          <span key={meta}>{meta}</span>
        ))}
      </div>

      {isEditingMacros ? (
        <div className="mt-2 rounded-md border border-[#E6E5E0] bg-[#FAF9F8] p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-[#6B6B68]">
              Calories (kcal)
              <input
                type="number"
                min="0"
                step="1"
                value={macroDraft.calories}
                onChange={(event) => setMacroDraft((prev) => ({ ...prev, calories: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[#E6E5E0] bg-white px-2 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
              />
            </label>
            <label className="text-[11px] text-[#6B6B68]">
              Protein (g)
              <input
                type="number"
                min="0"
                step="1"
                value={macroDraft.protein}
                onChange={(event) => setMacroDraft((prev) => ({ ...prev, protein: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[#E6E5E0] bg-white px-2 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
              />
            </label>
            <label className="text-[11px] text-[#6B6B68]">
              Carbs (g)
              <input
                type="number"
                min="0"
                step="1"
                value={macroDraft.carbs}
                onChange={(event) => setMacroDraft((prev) => ({ ...prev, carbs: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[#E6E5E0] bg-white px-2 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
              />
            </label>
            <label className="text-[11px] text-[#6B6B68]">
              Fat (g)
              <input
                type="number"
                min="0"
                step="1"
                value={macroDraft.fat}
                onChange={(event) => setMacroDraft((prev) => ({ ...prev, fat: event.target.value }))}
                className="mt-1 w-full rounded-md border border-[#E6E5E0] bg-white px-2 py-1.5 text-xs text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMacroDraft({
                  calories: toInputValue(macros.calories),
                  protein: toInputValue(macros.protein),
                  carbs: toInputValue(macros.carbs),
                  fat: toInputValue(macros.fat),
                });
                setIsEditingMacros(false);
              }}
              className="rounded-md border border-[#E6E5E0] px-2.5 py-1 text-xs font-medium text-[#6B6B68]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveMacros({
                  calories: parseMacroInput(macroDraft.calories),
                  protein: parseMacroInput(macroDraft.protein),
                  carbs: parseMacroInput(macroDraft.carbs),
                  fat: parseMacroInput(macroDraft.fat),
                });
                setIsEditingMacros(false);
              }}
              className="rounded-md bg-[#E7C51C] px-2.5 py-1 text-xs font-semibold text-black hover:bg-[#d4b419]"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {isEditingNote ? (
        <div className="mt-2 rounded-md border border-[#E6E5E0] bg-[#FAF9F8] p-3">
          <label className="block text-[11px] text-[#6B6B68] mb-1.5">
            Note for client
          </label>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={3}
            placeholder="Add a note for the client (e.g. serving suggestions, substitutions, tips)..."
            className="w-full rounded-md border border-[#E6E5E0] bg-white px-2.5 py-2 text-xs text-[#1a1a1a] resize-y focus:outline-none focus:ring-2 focus:ring-[#E7C51C]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNoteDraft(noteText);
                setIsEditingNote(false);
              }}
              className="rounded-md border border-[#E6E5E0] px-2.5 py-1 text-xs font-medium text-[#6B6B68]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveNote(noteDraft);
                setIsEditingNote(false);
              }}
              className="rounded-md bg-[#E7C51C] px-2.5 py-1 text-xs font-semibold text-black hover:bg-[#d4b419]"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-3 border-t border-[#E6E5E0] pt-3 text-xs [font-family:Inter,sans-serif]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <h5 className="mb-1 font-semibold text-[#1a1a1a]">Ingredients</h5>
              <ul className="list-disc space-y-1 pl-4 text-[#424242]">
                {ingredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`}>{ingredient}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="mb-1 font-semibold text-[#1a1a1a]">Method</h5>
              <ol className="list-decimal space-y-1 pl-4 text-[#424242]">
                {instructions.map((instruction, index) => (
                  <li key={`${instruction}-${index}`}>{instruction}</li>
                ))}
              </ol>
              {item.source_url ? (
                <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[#7C3AED] underline">
                  View source
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {noteText ? (
        <div className="mt-3 rounded-md border border-[#E6E5E0] bg-[#FAF9F8] px-3 py-2">
          <div className="flex items-start gap-2 text-xs [font-family:Inter,sans-serif]">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-[#6B6B68] shrink-0" />
            <div className="w-full">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[#424242]">Note</p>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(true)}
                  className="text-[11px] font-medium text-[#6B6B68] underline underline-offset-2"
                >
                  Edit
                </button>
              </div>
              <p className="text-[#6B6B68] italic whitespace-pre-wrap">{noteText}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
