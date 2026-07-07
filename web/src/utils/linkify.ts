export interface TextSegment {
  type: 'text' | 'url';
  value: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const TRAILING_PUNCT = /[.,;:!?)'\]"}\]]+$/;

export function splitTextByUrls(text: string): TextSegment[] {
  if (!text) return [{ type: 'text', value: '' }];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    const trimmed = raw.replace(TRAILING_PUNCT, '');
    const trailing = raw.slice(trimmed.length);

    if (trimmed) {
      segments.push({ type: 'url', value: trimmed });
    }
    if (trailing) {
      segments.push({ type: 'text', value: trailing });
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: 'text', value: text }];
}
