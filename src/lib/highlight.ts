export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Splits text containing `==emphasized==` markers into clean segments.
 * Strips any stray unmatched `==` tokens so raw `==` markers never leak to UI.
 */
export function parseHighlightSegments(input: string): HighlightSegment[] {
  if (!input) return [];
  const segments: HighlightSegment[] = [];
  const regex = /==([^=]+?)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      const plain = input.slice(lastIndex, match.index).replace(/==/g, "");
      if (plain) segments.push({ text: plain, highlighted: false });
    }
    const inner = match[1].replace(/==/g, "").trim();
    if (inner) {
      segments.push({ text: inner, highlighted: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    const tail = input.slice(lastIndex).replace(/==/g, "");
    if (tail) segments.push({ text: tail, highlighted: false });
  }

  return segments;
}

/**
 * Plain text stripping all `==` highlight markers for meta tags, RSS, or clipboard copy.
 */
export function stripHighlightMarkers(input: string): string {
  if (!input) return "";
  return input.replace(/==([^=]+?)==/g, "$1").replace(/==/g, "");
}
