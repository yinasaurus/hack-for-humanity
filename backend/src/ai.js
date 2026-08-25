import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();

/** Prefer Gemini when set; else OpenAI; else mock. */
export function aiProvider() {
  if (geminiKey) return 'gemini';
  if (openaiKey) return 'openai';
  return 'mock';
}

export function hasLiveAi() {
  return aiProvider() !== 'mock';
}

function openaiClient() {
  if (!openaiKey) return null;
  return new OpenAI({ apiKey: openaiKey });
}

function geminiModel() {
  if (!geminiKey) return null;
  const genAI = new GoogleGenerativeAI(geminiKey);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });
}

function parseJsonLoose(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned || '{}');
}

const MEAL_GATE_PROMPT = `You gate meal / drink photos for a clinical companion app.
First decide isMeal. Be strict.

isMeal = true ONLY if edible food or a drink is the main subject (plate, bowl, cup, can, bottle, takeaway container, clearly edible items).
isMeal = false for: laptops, keyboards, monitors, phones, code/terminals, desks, documents, rooms, people without food, pets, empty surfaces, packaging alone with no food visible, or anything unclear.

Also set possibleScreenPhoto (boolean). This is a soft clinician hint only — never reject the check-in for it.
possibleScreenPhoto = true when the meal looks photographed from another screen (phone/monitor/tablet), a search-result image, a printed photo of food, strong moiré/pixel grid, bezel/browser chrome around the food, or other signs it may not be a real plate in front of the camera.
possibleScreenPhoto = false when it looks like a real plated meal / takeaway / drink in physical space, or when unsure.
Do NOT set isMeal false just because possibleScreenPhoto is true — if food or drink is the main subject, isMeal stays true.

=== Estimation path (important) ===
The NORMAL case is a plain visual photo of food or drink with NO nutrition label visible or intentionally photographed.
Visual-only estimation is the DEFAULT path — not a fallback. Do NOT assume labels are present. Do NOT treat missing labels as low quality or low confidence by itself.
If a nutrition label happens to be clearly visible AND legible in the photo, you MAY use those numbers and set usedNutritionLabel = true. That is a bonus edge case, not the primary accuracy strategy.

=== Confidence (visual-first calibration) ===
confidence reflects how standardized / knowable the item is — NOT whether a label was read.
- high: recognizable, standardized branded / mass-produced packaged product OR a specific well-known fast-food item with fairly consistent published nutrition (e.g. a familiar energy-drink can, a specific chain sandwich). Use high even when estimating from product knowledge without reading a label. ALSO use high when usedNutritionLabel is true.
- medium: a generic recognizable dish or food type with real portion / recipe variability (e.g. "pan-fried dumplings", "homemade pasta", "restaurant rice bowl" — count and ingredients can vary a lot).
- low: ambiguous, mixed plate, unclear portion, heavily occluded, or unfamiliar food where the estimate is weakly grounded.

A branded can estimated from appearance alone can be "high". A plate of dumplings without a clear count should usually be "medium" or "low", never "high" just because the photo is clear.

Return JSON only:
- isMeal (boolean) — required
- possibleScreenPhoto (boolean) — required
- usedNutritionLabel (boolean) — required; true only if a legible nutrition label in the photo was used for the numbers
- foodType (string)
- estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG (numbers)
- confidence ("high" | "medium" | "low")
- notes (short string; clinician-facing; may briefly say visual estimate vs label)

If isMeal is false: foodType "Not a meal or drink photo", all macros 0, confidence "high", possibleScreenPhoto false, usedNutritionLabel false.
Do NOT invent food when unsure — set isMeal false.
Do NOT diagnose eating disorders. Do NOT shame portions; estimate neutrally.`;

/**
 * Food/photo analysis — clinician-only numeric estimates.
 * Never expose nutrition fields on patient-facing routes.
 * Rejects non-meal images. Live providers never invent meals on API failure.
 */
export async function analyzeFoodPhoto({ imageBase64, mimeType = 'image/jpeg' }) {
  const provider = aiProvider();
  if (provider === 'mock') {
    return mockAnalyze(imageBase64);
  }

  try {
    if (provider === 'gemini') {
      const model = geminiModel();
      const result = await model.generateContent([
        { text: `${MEAL_GATE_PROMPT}\n\nClassify this image. If it is not clearly a meal, set isMeal to false.` },
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        },
      ]);
      const raw = result.response.text();
      return normalizeAnalysis(parseJsonLoose(raw));
    }

    // OpenAI fallback
    const openai = openaiClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MEAL_GATE_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Classify this image. If it is not clearly a meal, set isMeal to false.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 400,
    });
    const raw = response.choices[0]?.message?.content || '{}';
    return normalizeAnalysis(parseJsonLoose(raw));
  } catch (err) {
    console.error('analyzeFoodPhoto failed:', err.message);
    const e = new Error(VISION_UNAVAILABLE_ERROR);
    e.status = 503;
    e.code = 'VISION_UNAVAILABLE';
    e.cause = err;
    throw e;
  }
}

/** Friendly patient-facing copy when a photo is not food/drink (no scores, no guilt). */
export const NOT_A_MEAL_ERROR =
  'That photo doesn’t look like food or a drink. When you’re ready, try again — no pressure.';

/** Live vision failed (quota, network, etc.) — do not invent a meal. */
export const VISION_UNAVAILABLE_ERROR =
  'We couldn’t check that photo right now. Please try again in a moment — no pressure.';

export function isNotAMeal(analysis) {
  return Boolean(analysis && analysis.isMeal === false);
}

/**
 * Pattern summarization for clinicians — observations only, never diagnoses.
 */
export async function generateClinicianSummary({
  patientName,
  metrics,
  analyses,
  alertReasons,
}) {
  const analysisBrief = analyses.slice(-14).map((a) => ({
    date: a.createdAt?.slice(0, 10),
    foodType: a.foodType,
    estimatedCalories: a.estimatedCalories,
    confidence: a.confidence,
    possibleScreenPhoto: Boolean(a.possibleScreenPhoto),
  }));

  const lowConf = analyses.filter((a) => a.confidence === 'low').length;
  const possibleScreenCount = analyses.filter((a) => a.possibleScreenPhoto).length;
  const provider = aiProvider();

  if (provider === 'mock') {
    return mockSummary({
      patientName,
      metrics,
      alertReasons,
      lowConf,
      possibleScreenCount,
    });
  }

  const system = `You write brief pre-appointment summaries for clinicians supporting patients who log meals with a companion app.
Rules:
- Observations only — never diagnose, never prescribe, never instruct the clinician what to do.
- Phrase as patterns ("logging dropped off over the past week"), not clinical conclusions.
- Nutritional numbers from photo analysis are ALWAYS approximate visual estimates. Even "high" confidence means a better-grounded guess (e.g. familiar branded product), NOT exact lab values. Prefer phrasing like "~450 kcal (estimated)" or "roughly ~… kcal" — never present calories as exact.
- Note low-confidence analyses when relevant; still frame medium/high as estimates.
- If possibleScreenPhotoCount > 0, mention gently that some photos may have been of a screen/image rather than a plate — soft context only, not an accusation.
- Return JSON: { "summary": string, "shouldAlert": boolean, "alertReason": string|null }
- If shouldAlert is true, alertReason MUST be a concrete explainable string.
- Do NOT set shouldAlert solely because of possible screen photos.
- Do NOT invent or reference any patient free-text visit notes — you will not receive them.`;

  const userPayload = JSON.stringify({
    patientName,
    metrics,
    recentAnalyses: analysisBrief,
    existingAlertReasons: alertReasons,
    lowConfidenceCount: lowConf,
    possibleScreenPhotoCount: possibleScreenCount,
  });

  try {
    if (provider === 'gemini') {
      const model = geminiModel();
      const result = await model.generateContent(`${system}\n\nPatient context:\n${userPayload}`);
      const parsed = parseJsonLoose(result.response.text());
      return {
        summary:
          parsed.summary ||
          mockSummary({ patientName, metrics, alertReasons, lowConf }).summary,
        shouldAlert: Boolean(parsed.shouldAlert),
        alertReason: parsed.alertReason || null,
        source: 'gemini',
      };
    }

    const openai = openaiClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPayload },
      ],
      max_tokens: 500,
    });
    const parsed = parseJsonLoose(response.choices[0]?.message?.content || '{}');
    return {
      summary:
        parsed.summary ||
        mockSummary({ patientName, metrics, alertReasons, lowConf }).summary,
      shouldAlert: Boolean(parsed.shouldAlert),
      alertReason: parsed.alertReason || null,
      source: 'openai',
    };
  } catch (err) {
    console.error('generateClinicianSummary failed:', err.message);
    return {
      ...mockSummary({ patientName, metrics, alertReasons, lowConf }),
      note: 'LLM unavailable; rule-based summary shown.',
    };
  }
}

/**
 * Turn a clinician care note into a gentle multi-day reminder schedule.
 * Timing / soft prompts only — never calories, weight, or "catch-up" stacking advice.
 */
export async function planGentleCareSchedule(goalText, { startDate } = {}) {
  const { mockPlanCareSchedule, normalizePlan } = await import('./careSchedule.js');
  const { toDateKey } = await import('./streaks.js');
  const start = startDate || toDateKey(new Date());
  const text = String(goalText || '').trim();
  if (!text) {
    return mockPlanCareSchedule('a gentle care moment', { startDate: start });
  }

  const provider = aiProvider();
  if (provider === 'mock') {
    return mockPlanCareSchedule(text, { startDate: start });
  }

  const system = `You help clinicians schedule GENTLE care-moment reminders for an eating-disorder companion app (Buddi).
Rules:
- Output JSON only: {
  "summary": string,
  "windowDays": number,
  "slots": [ { "date": "YYYY-MM-DD", "mealLabel": "morning|midday|afternoon|evening|anytime", "prompt": string } ]
}
- Spread moments evenly across the window. NEVER put multiple catch-up moments on one day after a miss.
- Prompts must be warm, optional, non-coercive (e.g. "a soft apple moment if it feels okay"). No scores, calories, weight, BMI, or "you must".
- If the clinician says "3 apples in 2 days", plan ~3 soft moments across those 2 days without dumping everything into one meal.
- If they say "3 apples weekly", use windowDays=7 and space 3 moments.
- Dates must be on/after ${start}. windowDays between 1 and 21. Max 14 slots.
- mealLabel should vary (morning/midday/afternoon/evening) when multiple moments fall close together.`;

  try {
    if (provider === 'gemini') {
      const model = geminiModel();
      const result = await model.generateContent(
        `${system}\n\nClinician note:\n${text}\nStart date: ${start}`
      );
      const parsed = parseJsonLoose(result.response.text());
      return normalizePlan({ ...parsed, startDate: start, source: 'gemini' }, text);
    }

    const openai = openaiClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Clinician note:\n${text}\nStart date: ${start}` },
      ],
      max_tokens: 700,
    });
    const parsed = parseJsonLoose(response.choices[0]?.message?.content || '{}');
    return normalizePlan({ ...parsed, startDate: start, source: 'openai' }, text);
  } catch (err) {
    console.error('planGentleCareSchedule failed:', err.message);
    return {
      ...mockPlanCareSchedule(text, { startDate: start }),
      note: 'AI planner unavailable; gentle mock plan used.',
    };
  }
}

export function normalizeAnalysis(parsed = {}) {
  // Missing isMeal → treat as not a meal (fail closed). Models sometimes omit the field.
  const hasFlag = Object.prototype.hasOwnProperty.call(parsed, 'isMeal')
    || Object.prototype.hasOwnProperty.call(parsed, 'is_meal');
  const rawFlag = hasFlag ? parsed.isMeal ?? parsed.is_meal : false;
  const isMeal = rawFlag === true || rawFlag === 'true';

  const possibleScreenPhoto =
    parsed.possibleScreenPhoto === true ||
    parsed.possibleScreenPhoto === 'true' ||
    parsed.possible_screen_photo === true ||
    parsed.possible_screen_photo === 'true';

  if (!isMeal) {
    return {
      isMeal: false,
      possibleScreenPhoto: false,
      usedNutritionLabel: false,
      foodType: 'Not a meal photo',
      estimatedCalories: 0,
      estimatedProteinG: 0,
      estimatedCarbsG: 0,
      estimatedFatG: 0,
      confidence: 'high',
      notes: String(
        parsed.notes ||
          'Photo does not appear to show a meal. No calorie estimate stored.'
      ),
      error: false,
    };
  }

  const usedNutritionLabel =
    parsed.usedNutritionLabel === true ||
    parsed.usedNutritionLabel === 'true' ||
    parsed.used_nutrition_label === true ||
    parsed.used_nutrition_label === 'true';

  let confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low';
  // Legible on-photo label is a bonus path — treat as high confidence.
  if (usedNutritionLabel) confidence = 'high';

  return {
    isMeal: true,
    possibleScreenPhoto,
    usedNutritionLabel,
    foodType: String(parsed.foodType || 'Unclear meal'),
    estimatedCalories: Number(parsed.estimatedCalories) || 0,
    estimatedProteinG: Number(parsed.estimatedProteinG) || 0,
    estimatedCarbsG: Number(parsed.estimatedCarbsG) || 0,
    estimatedFatG: Number(parsed.estimatedFatG) || 0,
    confidence,
    notes: String(parsed.notes || ''),
    error: false,
  };
}

/** Clinician-facing calorie string — always approximate, never exact. */
export function formatApproxKcal(n) {
  const kcal = Math.round(Number(n) || 0);
  return `~${kcal} kcal (estimated)`;
}

/** Varied demo meals for mock mode / seeding (not live vision).
 * Confidence follows visual-first calibration: branded/standardized → high;
 * variable dishes → medium; unclear → low. Labels are rare (bonus). */
export const MOCK_MEAL_SAMPLES = [
  { foodType: 'Monster Energy green can', estimatedCalories: 210, estimatedProteinG: 0, estimatedCarbsG: 54, estimatedFatG: 0, confidence: 'high', usedNutritionLabel: false },
  { foodType: 'Coca-Cola can (330 ml)', estimatedCalories: 139, estimatedProteinG: 0, estimatedCarbsG: 35, estimatedFatG: 0, confidence: 'high', usedNutritionLabel: false },
  { foodType: 'McDonald’s Egg McMuffin', estimatedCalories: 300, estimatedProteinG: 17, estimatedCarbsG: 30, estimatedFatG: 12, confidence: 'high', usedNutritionLabel: false },
  { foodType: 'Pan-fried dumplings on a plate', estimatedCalories: 420, estimatedProteinG: 18, estimatedCarbsG: 48, estimatedFatG: 16, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Toast with avocado and egg', estimatedCalories: 380, estimatedProteinG: 16, estimatedCarbsG: 28, estimatedFatG: 22, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Rice bowl with vegetables and tofu', estimatedCalories: 470, estimatedProteinG: 18, estimatedCarbsG: 68, estimatedFatG: 12, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Yogurt bowl with fruit and granola', estimatedCalories: 320, estimatedProteinG: 14, estimatedCarbsG: 42, estimatedFatG: 9, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Noodle soup with greens', estimatedCalories: 410, estimatedProteinG: 15, estimatedCarbsG: 55, estimatedFatG: 11, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Homemade sandwich (unclear filling)', estimatedCalories: 390, estimatedProteinG: 17, estimatedCarbsG: 36, estimatedFatG: 18, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Oatmeal with banana and peanut butter', estimatedCalories: 350, estimatedProteinG: 12, estimatedCarbsG: 52, estimatedFatG: 11, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Salad with chickpeas and feta', estimatedCalories: 340, estimatedProteinG: 16, estimatedCarbsG: 30, estimatedFatG: 16, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Pasta with tomato sauce', estimatedCalories: 480, estimatedProteinG: 16, estimatedCarbsG: 72, estimatedFatG: 12, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Banana smoothie in a cup', estimatedCalories: 280, estimatedProteinG: 8, estimatedCarbsG: 48, estimatedFatG: 6, confidence: 'medium', usedNutritionLabel: false },
  { foodType: 'Mixed plate (several foods, unclear portions)', estimatedCalories: 520, estimatedProteinG: 20, estimatedCarbsG: 58, estimatedFatG: 18, confidence: 'low', usedNutritionLabel: false },
  { foodType: 'Unfamiliar plated dish', estimatedCalories: 0, estimatedProteinG: 0, estimatedCarbsG: 0, estimatedFatG: 0, confidence: 'low', usedNutritionLabel: false },
];

const MOCK_NOTES =
  'Mock visual estimate — not live vision. Set GEMINI_API_KEY (or OPENAI_API_KEY) for live analysis.';

function hashSeed(input = '') {
  let h = 2166136261;
  const s = String(input);
  // Sample the string so large base64 photos stay cheap
  const step = Math.max(1, Math.floor(s.length / 2000));
  for (let i = 0; i < s.length; i += step) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= s.length;
  return h >>> 0;
}

/** Pick a stable mock meal from photo bytes (or any seed string). */
export function mockAnalyze(seed = '') {
  const samples = MOCK_MEAL_SAMPLES;
  const idx = hashSeed(seed || String(Date.now())) % samples.length;
  const pick = samples[idx];
  return {
    ...pick,
    isMeal: true,
    possibleScreenPhoto: false,
    usedNutritionLabel: Boolean(pick.usedNutritionLabel),
    notes: pick.confidence === 'low'
      ? 'Mock demo — unclear visual estimate. Set GEMINI_API_KEY for real photo analysis; review photos directly.'
      : MOCK_NOTES,
    error: false,
  };
}

function mockSummary({ patientName, metrics, alertReasons, lowConf, possibleScreenCount = 0 }) {
  const rate7pct = Math.round((metrics.rate7 || 0) * 100);
  const rate30pct = Math.round((metrics.rate30 || 0) * 100);
  const parts = [];
  parts.push(
    `Logging consistency: ${patientName} checked in on ${rate7pct}% of the last 7 days and ${rate30pct}% of the last 30 days.`
  );
  if (possibleScreenCount > 0) {
    parts.push(
      `Photo context: ${possibleScreenCount} recent check-in(s) were soft-flagged as possibly photographed from a screen or image — review in person; the app does not reject or punish for this.`
    );
  }
  parts.push(
    `Engagement pattern: current streak ${metrics.streak || 0} day(s); consecutive missed days ${metrics.misses || 0}.`
  );
  if ((metrics.misses || 0) >= 5) {
    parts.push(
      'Notable shift: a multi-day gap in logging is visible and may be worth asking about gently in appointment.'
    );
  } else if ((metrics.rate7 || 0) < (metrics.rate30 || 0) - 0.25) {
    parts.push(
      'Notable shift: recent week looks quieter than the broader 30-day pattern.'
    );
  } else if ((metrics.streak || 0) >= 3) {
    parts.push('Recent days show steadier presence in the log.');
  }
  if (lowConf > 0) {
    parts.push(
      `Photo estimates: ${lowConf} recent analysis(es) were low-confidence visual estimates — treat ~kcal figures as soft context only, never exact intake.`
    );
  } else if ((metrics.totalDays || 0) > 0) {
    parts.push(
      'Photo estimates: recent analyses include approximate visual ~kcal guesses (even “high” confidence means a better-grounded estimate — not a measured value).'
    );
  }
  parts.push(
    'Framing: these are observational notes for clinician interpretation — not a diagnosis, risk score, or care decision.'
  );

  const shouldAlert = (metrics.misses || 0) >= 5 || (alertReasons && alertReasons.length > 0);
  return {
    summary: parts.join(' '),
    shouldAlert,
    alertReason: shouldAlert
      ? alertReasons?.[0] || `${metrics.misses} consecutive missed logs`
      : null,
    source: aiProvider() === 'mock' ? 'enriched-mock' : aiProvider(),
  };
}
