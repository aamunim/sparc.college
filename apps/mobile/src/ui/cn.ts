/** className জোড়া লাগানো (false/undefined বাদ)। */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
