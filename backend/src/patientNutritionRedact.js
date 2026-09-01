/**
 * Scrub numeric nutrition language from clinician-authored text before it
 * reaches patient-facing payloads. Clinician dashboard views stay unmodified.
 *
 * Intentionally regex-only — no NLP. Prefer masking the matched number+unit
 * with "[removed]" so the rest of the clinician's sentence stays readable.
 */

const REDACTED = '[removed]';

/**
 * Patterns for common calorie / macro / %‑of‑goal phrasing.
 * Order matters: longer / more specific forms first.
 */
const NUTRITION_NUMBER_PATTERNS = [
  // 2000 kcal / 500cal / 1,800 calories / 2.5 kcals
  /\b(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:kilo\s*calories?|kcals?|calories?|cals?)\b/gi,
  // kcal: 2000 / calories = 1800
  /\b(?:kilo\s*calories?|kcals?|calories?|cals?)\s*[:=]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\b/gi,
  // 50g protein / 30 grams of carbs / 10g fat
  /\b\d+(?:\.\d+)?\s*g(?:rams?)?\s*(?:of\s+)?(?:protein|carbs?|carbohydrates?|fat|fats)\b/gi,
  // protein: 50g / carbs 30 g / fat = 10 grams
  /\b(?:protein|carbs?|carbohydrates?|fat|fats)\s*[:=]?\s*\d+(?:\.\d+)?\s*g(?:rams?)?\b/gi,
  // 50% of goal / 80% of calorie target / 60% of daily intake
  /\b\d+(?:\.\d+)?\s*%\s*(?:of\s+)?(?:(?:daily\s+)?(?:calorie|kcal|cal)\s+)?(?:goal|target|intake)\b/gi,
];

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function redactPatientFacingNutritionLanguage(raw) {
  let text = String(raw ?? '');
  if (!text) return text;
  for (const pattern of NUTRITION_NUMBER_PATTERNS) {
    // Reset lastIndex for global regex reuse safety.
    pattern.lastIndex = 0;
    text = text.replace(pattern, REDACTED);
  }
  // Collapse accidental double spaces left by replacements, keep punctuation.
  return text.replace(/[ \t]{2,}/g, ' ').trim();
}

export const PATIENT_NUTRITION_REDACTION_PLACEHOLDER = REDACTED;
