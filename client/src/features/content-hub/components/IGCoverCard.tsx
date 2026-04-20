import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import IGImagePicker from "./IGImagePicker";
import { buildImageFilename, downloadImage, inferImageExtension } from "../lib/download-image";
import type { IGCover, ImageSearchResult } from "../types";

interface IGCoverCardProps {
  cover: IGCover;
  carouselHeadline: string;
  onChange: (next: IGCover) => void;
}

export default function IGCoverCard({ cover, carouselHeadline, onChange }: IGCoverCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = useCallback((image: ImageSearchResult) => {
    onChange({
      ...cover,
      image_url: image.image_url,
      image_source_url: image.source_url,
    });
    setPickerOpen(false);
  }, [cover, onChange]);

  const handleDownload = useCallback(async () => {
    if (!cover.image_url) return;

    try {
      const filename = buildImageFilename(
        carouselHeadline,
        "cover",
        inferImageExtension(cover.image_url),
      );
      await downloadImage(cover.image_url, filename);
    } catch {
      toast({
        title: "Couldn't download image",
        description: "The source may block direct downloads. Try right-click → Save image as.",
      });
    }
  }, [carouselHeadline, cover.image_url, toast]);

  return (
    <section className="ch-ig-editor-card">
      <div className="ch-ig-editor-section-title">Cover</div>

      <input
        value={cover.headline}
        onChange={(event) => onChange({ ...cover, headline: event.target.value })}
        placeholder="Carousel headline..."
        className="ch-ig-cover-title-input"
      />

      <div className="ch-ig-image-frame">
        {cover.image_url ? (
          <>
            <img src={cover.image_url} alt={cover.headline || "Instagram carousel cover"} className="ch-ig-image" />
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

      <div className="ch-ig-image-query">Search query: {cover.image_query || "—"}</div>

      <IGImagePicker
        isOpen={pickerOpen}
        initialQuery={cover.image_query}
        prefetchedCandidates={cover.image_candidates}
        onClose={() => setPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </section>
  );
}
