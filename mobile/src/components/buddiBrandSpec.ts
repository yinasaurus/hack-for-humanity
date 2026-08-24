export type BuddiBrandSize = 'large' | 'regular' | 'compact';

export type BuddiBrandSpec = {
  /** Icon edge length in logical pixels. */
  iconSize: number;
  /** Gap between the icon and the wordmark. */
  gap: number;
  /** Wordmark size in logical pixels. */
  textSize: number;
  /** Wordmark line height keeps the lockup vertically centered. */
  textLineHeight: number;
};

/**
 * Shared lockup dimensions. Keeping these outside the component makes the
 * visual contract easy to audit without importing React Native in tests.
 */
export const BUDDI_BRAND_SPECS: Record<BuddiBrandSize, BuddiBrandSpec> = {
  large: { iconSize: 46, gap: 10, textSize: 40, textLineHeight: 48 },
  regular: { iconSize: 34, gap: 8, textSize: 22, textLineHeight: 28 },
  compact: { iconSize: 28, gap: 7, textSize: 18, textLineHeight: 23 },
};

export function getBuddiBrandSpec(size: BuddiBrandSize = 'regular'): BuddiBrandSpec {
  return BUDDI_BRAND_SPECS[size];
}
