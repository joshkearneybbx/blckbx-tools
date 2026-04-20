import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface IGMetaNoteProps {
  note: string | undefined;
}

export default function IGMetaNote({ note }: IGMetaNoteProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!note?.trim()) {
    return null;
  }

  return (
    <section className="ch-ig-meta-note">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ch-ig-meta-note-toggle"
        aria-expanded={isOpen}
      >
        <span>ⓘ Generation notes</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen ? (
        <div className="ch-ig-meta-note-body">{note}</div>
      ) : null}
    </section>
  );
}
