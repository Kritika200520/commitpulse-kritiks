import { sanitizeFont } from './sanitizer';

export const FONT_MAP = {
  jetbrains: '"JetBrains Mono", monospace',
  fira: '"Fira Code", monospace',
  roboto: '"Roboto", sans-serif',
} as const;

/**
 * Resolve a font name to a CSS font-family string.
 * - If `font` matches a predefined key in `FONT_MAP` (case-insensitive), returns that stack.
 * - If `font` is a valid custom font name, returns `"<Font>", sans-serif`.
 * - Otherwise returns `null`.
 */
export function resolveFont(font?: string | null): string | null {
  const sanitized = sanitizeFont(font ?? undefined);
  if (!sanitized) return null;

  const key = sanitized.toLowerCase();
  const predefined = (FONT_MAP as Record<string, string>)[key];
  if (predefined) return predefined;

  return `"${sanitized}", sans-serif`;
}

export type FontKey = keyof typeof FONT_MAP;

export default FONT_MAP;

/**
 * Returns true if the given font name matches a predefined key in FONT_MAP.
 * Used to avoid redundant Google Fonts fetches for already-bundled fonts.
 */
export function isPredefinedFontKey(font?: string | null): boolean {
  if (!font) return false;
  return Object.prototype.hasOwnProperty.call(FONT_MAP, font.toLowerCase().trim());
}
