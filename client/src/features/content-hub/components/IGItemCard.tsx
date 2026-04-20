import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import IGFlagChips from "./IGFlagChips";
import IGImagePicker from "./IGImagePicker";
import { buildImageFilename, downloadImage, inferImageExtension } from "../lib/download-image";
import type { IGItem, ImageSearchResult } from "../types";

interface IGItemCardProps {
  item: IGItem;
  index: number;
  carouselHeadline: string;
  clearedFlags: string[];
  onChange: (next: IGItem) => void;
  onClearFlag: (field: "name" | "body", flagText: string) => void;
}

function getTextareaRows(value: string, minimumRows = 3) {
  return Math.max(minimumRows, value.split(/\r?\n/).length);
}

export default function IGItemCard({
  item,
  index,
  carouselHeadline,
  clearedFlags,
  onChange,
  onClearFlag,
}: IGItemCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = useCallback((image: ImageSearchResult) => {
    onChange({
      ...item,
      image_url: image.image_url,
      image_source_url: image.source_url,
    });
    setPickerOpen(false);
  }, [item, onChange]);

  const handleDownload = useCallback(async () => {
    if (!item.image_url) return;

    try {
      const filename = buildImageFilename(
        carouselHeadline,
        `item-${index + 1}`,
        inferImageExtension(item.image_url),
      );
      await downloadImage(item.image_url, filename);
    } catch {
      toast({
        title: "Couldn't download image",
        description: "The source may block direct downloads. Try right-click → Save image as.",
      });
    }
  }, [carouselHeadline, index, item.image_url, toast]);

  return (
    <section className="ch-ig-editor-card">
      <div className="ch-ig-editor-section-title">Item {index + 1}</div>

      <input
        value={item.name}
        onChange={(event) => onChange({ ...item, name: event.target.value })}
        placeholder="Item name..."
        className="ch-ig-item-name-input"
      />

      <IGFlagChips
        text={item.name}
        clearedFlags={clearedFlags}
        onClear={(flagText) => onClearFlag("name", flagText)}
      />

      <textarea
        value={item.body}
        onChange={(event) => onChange({ ...item, body: event.target.value })}
        rows={getTextareaRows(item.body)}
        placeholder="Item body..."
        className="ch-ig-item-body-input"
      />

      <IGFlagChips
        text={item.body}
        clearedFlags={clearedFlags}
        onClear={(flagText) => onClearFlag("body", flagText)}
      />

      <div className="ch-ig-image-frame">
        {item.image_url ? (
          <>
            <img src={item.image_url} alt={item.name || `Instagram carousel item ${index + 1}`} className="ch-ig-image" />
            <div className="ch-ig-image-overlay">
              <div className="ch-ig-image-overlay-actions">
                <button type="button" onClick={handleDownload} className="ch-ig-image-button">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button type="button" onClick={() => setPickerOpen(true)} className="ch-ig-image-button">
                  Change image
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="ch-ig-image-empty">
            <div className="ch-ig-image-empty-copy">No image yet</div>
            <button type="button" onClick={() => setPickerOpen(true)} className="ch-ig-image-button">
              Pick image
            </button>
          </div>
        )}
      </div>

      <div className="ch-ig-image-query">Search query: {item.image_query || "—"}</div>

      <IGImagePicker
        isOpen={pickerOpen}
        initialQuery={item.image_query}
        prefetchedCandidates={item.image_candidates}
        onClose={() => setPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </section>
  );
}
