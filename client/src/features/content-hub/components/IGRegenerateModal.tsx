import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

interface IGRegenerateModalProps {
  isOpen: boolean;
  currentItemCount: number;
  isRegenerating: boolean;
  onClose: () => void;
  onConfirm: (itemCount: number) => Promise<void>;
}

const ITEM_COUNT_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function IGRegenerateModal({
  isOpen,
  currentItemCount,
  isRegenerating,
  onClose,
  onConfirm,
}: IGRegenerateModalProps) {
  const [itemCount, setItemCount] = useState(currentItemCount);

  useEffect(() => {
    if (isOpen) {
      setItemCount(currentItemCount);
    }
  }, [currentItemCount, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isRegenerating) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isRegenerating, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="ch-ig-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isRegenerating) {
          onClose();
        }
      }}
    >
      <div className="ch-ig-regenerate-modal" role="dialog" aria-modal="true" aria-labelledby="ig-regenerate-title">
        <div className="ch-ig-picker-header">
          <h2 id="ig-regenerate-title" className="ch-ig-picker-title">Regenerate carousel?</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isRegenerating}
            className="ch-ig-modal-close-button"
            aria-label="Close regenerate modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="ch-ig-regenerate-copy">
          This will replace your current draft, including any edits you&apos;ve made and any images you&apos;ve chosen.
        </p>

        <div className="ch-ig-regenerate-field">
          <label htmlFor="ig-regenerate-item-count" className="ch-ig-generate-label">Items:</label>
          <select
            id="ig-regenerate-item-count"
            value={itemCount}
            onChange={(event) => setItemCount(Number(event.target.value))}
            disabled={isRegenerating}
            className="ch-ig-generate-select ch-ig-regenerate-select"
          >
            {ITEM_COUNT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="ch-ig-regenerate-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isRegenerating}
            className="ch-inline-button ch-inline-button-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm(itemCount)}
            disabled={isRegenerating}
            className="ch-inline-button ch-inline-button-danger"
          >
            {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}
