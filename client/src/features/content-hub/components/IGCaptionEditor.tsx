import { useMemo, useState } from "react";
import IGFlagChips from "./IGFlagChips";

interface IGCaptionEditorProps {
  caption: string;
  hashtags: string[];
  clearedFlags: string[];
  onCaptionChange: (next: string) => void;
  onHashtagsChange: (next: string[]) => void;
  onClearFlag: (flagText: string) => void;
}

function getTextareaRows(value: string, minimumRows = 3) {
  return Math.max(minimumRows, value.split(/\r?\n/).length);
}

function sanitizeHashtag(value: string) {
  return value.toLowerCase().replaceAll("#", "").replace(/\s+/g, "").trim();
}

export default function IGCaptionEditor({
  caption,
  hashtags,
  clearedFlags,
  onCaptionChange,
  onHashtagsChange,
  onClearFlag,
}: IGCaptionEditorProps) {
  const [draftHashtag, setDraftHashtag] = useState("");
  const canAddMore = hashtags.length < 5;
  const placeholder = useMemo(() => (
    hashtags.length === 0 ? "Add hashtag" : "Add another hashtag"
  ), [hashtags.length]);

  const commitHashtag = () => {
    const nextHashtag = sanitizeHashtag(draftHashtag);

    if (!nextHashtag || hashtags.includes(nextHashtag) || hashtags.length >= 5) {
      setDraftHashtag("");
      return;
    }

    onHashtagsChange([...hashtags, nextHashtag]);
    setDraftHashtag("");
  };

  return (
    <section className="ch-ig-editor-card">
      <div className="ch-ig-editor-section-title">Caption + Hashtags</div>

      <textarea
        value={caption}
        onChange={(event) => onCaptionChange(event.target.value)}
        rows={getTextareaRows(caption)}
        placeholder="Instagram caption..."
        className="ch-ig-item-body-input"
      />

      <IGFlagChips
        text={caption}
        clearedFlags={clearedFlags}
        onClear={onClearFlag}
      />

      <div className="ch-ig-hashtag-row">
        {hashtags.map((hashtag) => (
          <div key={hashtag} className="ch-ig-hashtag-chip">
            <span>#{hashtag}</span>
            <button
              type="button"
              onClick={() => onHashtagsChange(hashtags.filter((item) => item !== hashtag))}
              className="ch-ig-hashtag-remove"
              aria-label={`Remove hashtag ${hashtag}`}
            >
              ×
            </button>
          </div>
        ))}

        {canAddMore ? (
          <input
            value={draftHashtag}
            onChange={(event) => setDraftHashtag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commitHashtag();
              }
            }}
            onBlur={commitHashtag}
            placeholder={placeholder}
            className="ch-ig-hashtag-input"
          />
        ) : null}
      </div>
    </section>
  );
}
