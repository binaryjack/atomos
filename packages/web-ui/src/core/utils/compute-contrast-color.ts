/**
 * WCAG 2.1 contrast utilities.
 * All maths per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Convert a single 0-255 channel to its linearised value. */
const linearise = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance of an sRGB colour (0–1). */
export const relativeLuminance = function(r: number, g: number, b: number): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
};

/** WCAG contrast ratio between two luminances. Always ≥ 1. */
export const contrastRatio = function(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Parse a CSS hex colour (#rgb, #rrggbb) into [r, g, b] 0–255. Returns null on failure. */
export const parseHex = function(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    const r = parseInt(clean[0]! + clean[0]!, 16);
    const g = parseInt(clean[1]! + clean[1]!, 16);
    const b = parseInt(clean[2]! + clean[2]!, 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
};

export interface ContrastResult {
  /** The best-contrast text colour for use on the given background. */
  readonly textColor: string;
  /** The muted variant (for secondary/icons) */
  readonly mutedColor: string;
  /** WCAG contrast ratio against white text */
  readonly ratioOnWhite: number;
  /** WCAG contrast ratio against dark text */
  readonly ratioOnDark: number;
  /** The actual contrast ratio of the chosen textColor */
  readonly ratio: number;
  /** AA large-text pass (≥ 3.0) */
  readonly passAA: boolean;
  /** AA normal-text pass (≥ 4.5) */
  readonly passAAA: boolean;
  /** Human-readable grade */
  readonly grade: 'AAA' | 'AA' | 'AA Large' | 'Fail';
}

const WHITE_L = relativeLuminance(248, 250, 252); // #f8fafc
const DARK_L  = relativeLuminance(15,  23,  42);  // #0f172a

/**
 * Given a background hex colour, compute the best-contrast foreground
 * and the WCAG grade.
 */
export const computeContrastColor = function(bgHex: string): ContrastResult {
  const parsed = parseHex(bgHex);
  if (!parsed) {
    // fallback for unknown/non-hex colours
    return {
      textColor: '#f8fafc', mutedColor: '#94a3b8',
      ratioOnWhite: 1, ratioOnDark: 1, ratio: 1,
      passAA: false, passAAA: false, grade: 'Fail',
    };
  }

  const [r, g, b]   = parsed;
  const bgL         = relativeLuminance(r, g, b);
  const ratioWhite  = contrastRatio(WHITE_L, bgL);
  const ratioDark   = contrastRatio(DARK_L,  bgL);
  const useWhite    = ratioWhite >= ratioDark;
  const ratio       = useWhite ? ratioWhite : ratioDark;
  const textColor   = useWhite ? '#f8fafc' : '#0f172a';
  const mutedColor  = useWhite ? '#94a3b8' : '#475569';

  const grade: ContrastResult['grade'] =
    ratio >= 7   ? 'AAA'      :
    ratio >= 4.5 ? 'AA'       :
    ratio >= 3   ? 'AA Large' : 'Fail';

  return {
    textColor,
    mutedColor,
    ratioOnWhite: ratioWhite,
    ratioOnDark:  ratioDark,
    ratio,
    passAA:  ratio >= 4.5,
    passAAA: ratio >= 7,
    grade,
  };
};
