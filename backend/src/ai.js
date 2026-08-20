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

const MEAL_GATE_PROMPT = `You gate meal photos for a clinical companion app.
First decide isMeal. Be strict.

isMeal = true ONLY if edible food or a drink is the main subject (plate, bowl, cup, takeaway container, clearly edible items).
isMeal = false for: laptops, keyboards, monitors, phones, code/terminals, desks, documents, rooms, people without food, pets, empty surfaces, packaging alone with no food visible, or anything unclear.

Return JSON only:
- isMeal (boolean) — required
- foodType (string)
- estimatedCalories, estimatedProteinG, estimatedCarbsG, estimatedFatG (numbers)
- confidence ("high" | "medium" | "low")
- notes (short string)

If isMeal is false: foodType "Not a meal photo", all macros 0, confidence "high".
Do NOT invent food when unsure — set isMeal false.
Do NOT diagnose eating disorders. Do NOT judge portions.`;

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

/** Friendly patient-facing copy when a photo is not a meal (no scores, no guilt). */
export const NOT_A_MEAL_ERROR =
  'That photo doesn’t look like a meal. When you’re ready, try again with your food — no pressure.';

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
  }));

  const lowConf = analyses.filter((a) => a.confidence === 'low').length;
  const provider = aiProvider();

  if (provider === 'mock') {
    return mockSummary({ patientName, metrics, alertReasons, lowConf });
  }

  const system = `You write brief pre-appointment summaries for clinicians supporting patients who log meals with a companion app.
Rules:
- Observations only — never diagnose, never prescribe, never instruct the clinician what to do.
- Phrase as patterns ("logging dropped off over the past week"), not clinical conclusions.
- Mention nutritional trends only as rough estimates from photo analysis; note low-confidence analyses.
- Return JSON: { "summary": string, "shouldAlert": boolean, "alertReason": string|null }
- If shouldAlert is true, alertReason MUST be a concrete explainable string.`;

  const userPayload = JSON.stringify({
    patientName,
    metrics,
    recentAnalyses: analysisBrief,
    existingAlertReasons: alertReasons,
    lowConfidenceCount: lowConf,
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

export function normalizeAnalysis(parsed = {}) {
  // Missing isMeal → treat as not a meal (fail closed). Models sometimes omit the field.
  const hasFlag = Object.prototype.hasOwnProperty.call(parsed, 'isMeal')
    || Object.prototype.hasOwnProperty.call(parsed, 'is_meal');
  const rawFlag = hasFlag ? parsed.isMeal ?? parsed.is_meal : false;
  const isMeal = rawFlag === true || rawFlag === 'true';

  if (!isMeal) {
    return {
      isMeal: false,
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

  const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low';
  return {
    isMeal: true,
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

/** Varied demo meals for mock mode / seeding (not live vision). */
export const MOCK_MEAL_SAMPLES = [
  { foodType: 'Toast with avocado and egg', estimatedCalories: 380, estimatedProteinG: 16, estimatedCarbsG: 28, estimatedFatG: 22, confidence: 'medium' },
  { foodType: 'Rice bowl with vegetables and tofu', estimatedCalories: 470, estimatedProteinG: 18, estimatedCarbsG: 68, estimatedFatG: 12, confidence: 'medium' },
  { foodType: 'Yogurt bowl with fruit and granola', estimatedCalories: 320, estimatedProteinG: 14, estimatedCarbsG: 42, estimatedFatG: 9, confidence: 'medium' },
  { foodType: 'Noodle soup with greens', estimatedCalories: 410, estimatedProteinG: 15, estimatedCarbsG: 55, estimatedFatG: 11, confidence: 'medium' },
  { foodType: 'Grilled fish with steamed rice', estimatedCalories: 450, estimatedProteinG: 32, estimatedCarbsG: 48, estimatedFatG: 10, confidence: 'medium' },
  { foodType: 'Chicken porridge with egg', estimatedCalories: 360, estimatedProteinG: 22, estimatedCarbsG: 40, estimatedFatG: 9, confidence: 'medium' },
  { foodType: 'Vegetable stir-fry with noodles', estimatedCalories: 430, estimatedProteinG: 14, estimatedCarbsG: 58, estimatedFatG: 14, confidence: 'medium' },
  { foodType: 'Sandwich with cheese and tomato', estimatedCalories: 390, estimatedProteinG: 17, estimatedCarbsG: 36, estimatedFatG: 18, confidence: 'medium' },
  { foodType: 'Oatmeal with banana and peanut butter', estimatedCalories: 350, estimatedProteinG: 12, estimatedCarbsG: 52, estimatedFatG: 11, confidence: 'medium' },
  { foodType: 'Salad with chickpeas and feta', estimatedCalories: 340, estimatedProteinG: 16, estimatedCarbsG: 30, estimatedFatG: 16, confidence: 'medium' },
  { foodType: 'Congee with scallion and tofu', estimatedCalories: 310, estimatedProteinG: 14, estimatedCarbsG: 44, estimatedFatG: 7, confidence: 'medium' },
  { foodType: 'Pasta with tomato sauce', estimatedCalories: 480, estimatedProteinG: 16, estimatedCarbsG: 72, estimatedFatG: 12, confidence: 'medium' },
  { foodType: 'Egg fried rice with peas', estimatedCalories: 440, estimatedProteinG: 15, estimatedCarbsG: 60, estimatedFatG: 14, confidence: 'medium' },
  { foodType: 'Banana smoothie and toast', estimatedCalories: 370, estimatedProteinG: 11, estimatedCarbsG: 58, estimatedFatG: 9, confidence: 'medium' },
  { foodType: 'Unfamiliar plated dish', estimatedCalories: 0, estimatedProteinG: 0, estimatedCarbsG: 0, estimatedFatG: 0, confidence: 'low' },
];

const MOCK_NOTES =
  'Mock demo label — not from the photo. Set GEMINI_API_KEY (or OPENAI_API_KEY) for live vision.';

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
    notes: pick.confidence === 'low'
      ? 'Mock demo — no live vision. Set GEMINI_API_KEY for real photo analysis; review photos directly.'
      : MOCK_NOTES,
    error: false,
  };
}

function mockSummary({ patientName, metrics, alertReasons, lowConf }) {
  const rate7pct = Math.round((metrics.rate7 || 0) * 100);
  const rate30pct = Math.round((metrics.rate30 || 0) * 100);
  const parts = [];
  parts.push(
    `Logging consistency: ${patientName} checked in on ${rate7pct}% of the last 7 days and ${rate30pct}% of the last 30 days.`
  );
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
      `Photo estimates: ${lowConf} recent analysis(es) were low-confidence, so calorie/macro trends should be treated as soft context only.`
    );
  } else if ((metrics.totalDays || 0) > 0) {
    parts.push(
      'Photo estimates: recent analyses are available for rough nutritional trend context (estimates only — not dietary advice).'
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
