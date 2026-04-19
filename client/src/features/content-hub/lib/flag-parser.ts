export interface Flag {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface TextSegment {
  type: "text";
  text: string;
  startIndex: number;
  endIndex: number;
  displayStartIndex: number;
  displayEndIndex: number;
}

export interface FlagSegment {
  type: "flag";
  text: string;
  rawText: string;
  ordinal: number;
  startIndex: number;
  endIndex: number;
  displayStartIndex: number;
  displayEndIndex: number;
  flag: Flag;
}

export type ParsedContentSegment = TextSegment | FlagSegment;

const FLAG_PATTERN = /\[\[\?:([\s\S]*?)\]\]/g;

function hashFlagId(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

function createFlagId(text: string, ordinal: number) {
  return hashFlagId(`${ordinal}:${text}`);
}

export function parseFlagSegments(content: string): ParsedContentSegment[] {
  const segments: ParsedContentSegment[] = [];
  let lastIndex = 0;
  let displayIndex = 0;
  let ordinal = 0;

  FLAG_PATTERN.lastIndex = 0;
  let match = FLAG_PATTERN.exec(content);

  while (match) {
    const rawText = match[0] ?? "";
    const text = match[1] ?? "";
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + rawText.length;

    if (startIndex > lastIndex) {
      const plainText = content.slice(lastIndex, startIndex);
      segments.push({
        type: "text",
        text: plainText,
        startIndex: lastIndex,
        endIndex: startIndex,
        displayStartIndex: displayIndex,
        displayEndIndex: displayIndex + plainText.length,
      });
      displayIndex += plainText.length;
    }

    const flag: Flag = {
      id: createFlagId(text, ordinal),
      text,
      startIndex,
      endIndex,
    };

    segments.push({
      type: "flag",
      text,
      rawText,
      ordinal,
      startIndex,
      endIndex,
      displayStartIndex: displayIndex,
      displayEndIndex: displayIndex + text.length,
      flag,
    });

    displayIndex += text.length;
    ordinal += 1;
    lastIndex = endIndex;
    match = FLAG_PATTERN.exec(content);
  }

  if (lastIndex < content.length) {
    const plainText = content.slice(lastIndex);
    segments.push({
      type: "text",
      text: plainText,
      startIndex: lastIndex,
      endIndex: content.length,
      displayStartIndex: displayIndex,
      displayEndIndex: displayIndex + plainText.length,
    });
  }

  return segments;
}

/**
 * Extracts all [[?:...]] flags from content.
 * Flag ID is deterministic: hash of the flag text + ordinal position.
 * Same content produces the same flag IDs across reloads.
 */
export function parseFlags(content: string): Flag[] {
  return parseFlagSegments(content)
    .filter((segment): segment is FlagSegment => segment.type === "flag")
    .map((segment) => segment.flag);
}

/**
 * Returns content with all [[?:...]] markers stripped (just the inner text).
 * Use for plain-text views, word counts, etc.
 */
export function stripFlagMarkers(content: string): string {
  return parseFlagSegments(content)
    .map((segment) => segment.text)
    .join("");
}

/**
 * Returns content with all flag IDs in `clearedFlagIds` having their
 * markers stripped, leaving uncleared flags wrapped.
 */
export function applyCleared(content: string, clearedFlagIds: string[]): string {
  const clearedSet = new Set(clearedFlagIds);

  return parseFlagSegments(content)
    .map((segment) => {
      if (segment.type === "text") {
        return segment.text;
      }

      return clearedSet.has(segment.flag.id) ? segment.text : segment.rawText;
    })
    .join("");
}
