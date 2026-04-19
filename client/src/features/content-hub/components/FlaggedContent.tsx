import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { parseFlagSegments } from "../lib/flag-parser";

interface FlaggedContentProps {
  content: string;
  clearedFlagIds: string[];
  onChange: (nextContent: string) => void;
  onClearFlag: (flagId: string) => void;
  className?: string;
  placeholder?: string;
}

type SelectionOffsets = {
  start: number;
  end: number;
};

const FLAG_TOOLTIP = "Verify this — the AI marked it as needing checking";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEditorHtml(content: string, clearedFlagIds: string[]) {
  const clearedSet = new Set(clearedFlagIds);

  return parseFlagSegments(content)
    .map((segment) => {
      if (segment.type === "text") {
        return `<span data-ch-segment="text">${escapeHtml(segment.text)}</span>`;
      }

      const flagId = escapeHtml(segment.flag.id);
      const textHtml = escapeHtml(segment.text);
      const ordinal = String(segment.ordinal);

      if (clearedSet.has(segment.flag.id)) {
        return `<span data-ch-segment="flag" data-flag-id="${flagId}" data-flag-ordinal="${ordinal}"><span data-ch-flag-text="true">${textHtml}</span></span>`;
      }

      return `<span data-ch-segment="flag" data-flag-id="${flagId}" data-flag-ordinal="${ordinal}" class="ch-flag-segment"><span class="ch-flag" data-ch-flag-text="true">${textHtml}</span><button type="button" class="ch-flag-badge" data-ch-flag-badge="true" data-flag-id="${flagId}" data-flag-ordinal="${ordinal}" contenteditable="false" aria-label="${escapeHtml(FLAG_TOOLTIP)}"><span aria-hidden="true">?</span><span class="ch-flag-badge-tooltip" contenteditable="false">${escapeHtml(FLAG_TOOLTIP)}</span></button></span>`;
    })
    .join("");
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (!(node instanceof HTMLElement)) {
    return "";
  }

  if (node.dataset.chFlagBadge === "true" || node.classList.contains("ch-flag-badge-tooltip")) {
    return "";
  }

  if (node.tagName === "BR") {
    return "\n";
  }

  if (node.dataset.chSegment === "flag") {
    const textElement = node.querySelector<HTMLElement>('[data-ch-flag-text="true"]');
    const flagText = textElement?.textContent ?? "";
    return `[[?:${flagText}]]`;
  }

  const childContent = Array.from(node.childNodes).map(serializeNode).join("");

  if (node.dataset.chSegment === "text") {
    return childContent;
  }

  if (node.tagName === "DIV" || node.tagName === "P") {
    return `${childContent}\n`;
  }

  return childContent;
}

function serializeEditorContent(root: HTMLElement) {
  return Array.from(root.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");
}

function getEditableTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.parentElement) {
          return NodeFilter.FILTER_REJECT;
        }

        if (node.parentElement.closest("[contenteditable='false']")) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof Text) {
      textNodes.push(currentNode);
    }

    currentNode = walker.nextNode();
  }

  return textNodes;
}

function getSelectionOffsets(root: HTMLElement): SelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const textNodes = getEditableTextNodes(root);
  let start: number | null = null;
  let end: number | null = null;
  let currentOffset = 0;

  for (const textNode of textNodes) {
    const textLength = textNode.textContent?.length ?? 0;

    if (range.startContainer === textNode) {
      start = currentOffset + range.startOffset;
    }

    if (range.endContainer === textNode) {
      end = currentOffset + range.endOffset;
    }

    currentOffset += textLength;
  }

  if (start == null || end == null) {
    return {
      start: currentOffset,
      end: currentOffset,
    };
  }

  return { start, end };
}

function restoreSelection(root: HTMLElement, offsets: SelectionOffsets) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const textNodes = getEditableTextNodes(root);
  if (textNodes.length === 0) {
    const emptyRange = document.createRange();
    emptyRange.selectNodeContents(root);
    emptyRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(emptyRange);
    return;
  }

  const range = document.createRange();
  let currentOffset = 0;
  let startSet = false;
  let endSet = false;

  for (const textNode of textNodes) {
    const textLength = textNode.textContent?.length ?? 0;
    const nextOffset = currentOffset + textLength;

    if (!startSet && offsets.start <= nextOffset) {
      range.setStart(textNode, Math.max(0, Math.min(textLength, offsets.start - currentOffset)));
      startSet = true;
    }

    if (!endSet && offsets.end <= nextOffset) {
      range.setEnd(textNode, Math.max(0, Math.min(textLength, offsets.end - currentOffset)));
      endSet = true;
      break;
    }

    currentOffset = nextOffset;
  }

  const lastTextNode = textNodes[textNodes.length - 1];
  const lastTextLength = lastTextNode.textContent?.length ?? 0;

  if (!startSet) {
    range.setStart(lastTextNode, lastTextLength);
  }

  if (!endSet) {
    range.setEnd(lastTextNode, lastTextLength);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function getSelectedFlagSegment(root: HTMLElement) {
  const selection = window.getSelection();
  const anchorNode = selection?.anchorNode ?? null;
  const anchorElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;

  if (!anchorElement) {
    return null;
  }

  const segment = anchorElement.closest<HTMLElement>('[data-ch-segment="flag"]');
  return segment && root.contains(segment) ? segment : null;
}

function insertTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  selection.deleteFromDocument();

  const range = selection.getRangeAt(0);
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  const nextRange = document.createRange();
  nextRange.setStart(textNode, text.length);
  nextRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(nextRange);
}

export default function FlaggedContent({
  content,
  clearedFlagIds,
  onChange,
  onClearFlag,
  className,
  placeholder,
}: FlaggedContentProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const renderedContentRef = useRef("");
  const renderedClearedKeyRef = useRef("");
  const pendingSelectionRef = useRef<SelectionOffsets | null>(null);

  const clearedFlagsKey = useMemo(() => clearedFlagIds.join("\u0000"), [clearedFlagIds]);

  const syncFromDom = useCallback((selectedFlagSegment: HTMLElement | null) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    pendingSelectionRef.current = getSelectionOffsets(root);

    const nextContent = serializeEditorContent(root);

    if (selectedFlagSegment) {
      const currentFlagId = selectedFlagSegment.dataset.flagId;
      const ordinal = Number(selectedFlagSegment.dataset.flagOrdinal ?? "-1");
      const nextFlags = parseFlagSegments(nextContent)
        .filter((segment) => segment.type === "flag");

      if (currentFlagId) {
        onClearFlag(currentFlagId);
      }

      const updatedFlag = ordinal >= 0 ? nextFlags[ordinal] : undefined;
      if (updatedFlag && updatedFlag.type === "flag") {
        onClearFlag(updatedFlag.flag.id);
      }
    }

    onChange(nextContent);
  }, [onChange, onClearFlag]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const currentContent = serializeEditorContent(root);
    if (currentContent === content && renderedClearedKeyRef.current === clearedFlagsKey) {
      renderedContentRef.current = content;
      renderedClearedKeyRef.current = clearedFlagsKey;
      return;
    }

    if (currentContent === content && renderedContentRef.current !== content && renderedClearedKeyRef.current === clearedFlagsKey) {
      renderedContentRef.current = content;
      renderedClearedKeyRef.current = clearedFlagsKey;
      return;
    }

    const selection = pendingSelectionRef.current
      ?? (document.activeElement === root ? getSelectionOffsets(root) : null);

    root.innerHTML = buildEditorHtml(content, clearedFlagIds);
    renderedContentRef.current = content;
    renderedClearedKeyRef.current = clearedFlagsKey;

    if (selection) {
      restoreSelection(root, selection);
    }

    pendingSelectionRef.current = null;
  }, [clearedFlagIds, clearedFlagsKey, content]);

  const handleInput = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    syncFromDom(getSelectedFlagSegment(root));
  }, [syncFromDom]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const badge = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-ch-flag-badge="true"]');
    if (!badge) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const flagId = badge.dataset.flagId;
    if (flagId) {
      onClearFlag(flagId);
    }
  }, [onClearFlag]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    insertTextAtSelection("\n");

    const root = rootRef.current;
    if (!root) {
      return;
    }

    syncFromDom(getSelectedFlagSegment(root));
  }, [syncFromDom]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const text = event.clipboardData.getData("text/plain");
    insertTextAtSelection(text);

    const root = rootRef.current;
    if (!root) {
      return;
    }

    syncFromDom(getSelectedFlagSegment(root));
  }, [syncFromDom]);

  return (
    <div
      ref={rootRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      spellCheck
      data-placeholder={placeholder}
      className={className}
      onInput={handleInput}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
}
