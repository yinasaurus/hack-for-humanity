import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const hasKey = Boolean(process.env.OPENAI_API_KEY);

function client() {
  if (!hasKey) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Food/photo analysis — clinician-only numeric estimates.
 * Never expose this payload on patient-facing routes.
 */
export async function analyzeFoodPhoto({ imageBase64, mimeType = 'image/jpeg' }) {
  const openai = client();
  if (!openai) {
    return mockAnalyze();
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze meal photos for a clinical food-logging companion app.
Return JSON only with keys:
- foodType (string, plain description of likely foods)
- estimatedCalories (number, rough estimate)
- estimatedProteinG (number)
- estimatedCarbsG (number)
- estimatedFatG (number)
- confidence ("high" | "medium" | "low")
- notes (short string; if unfamiliar cuisine, say so and set confidence low)

Do NOT diagnose eating disorders. Do NOT judge portion adequacy. Be observational only.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Estimate the food in this photo.' },
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
    const parsed = JSON.parse(raw);
    return normalizeAnalysis(parsed);
  } catch (err) {
    console.error('analyzeFoodPhoto failed:', err.message);
    return {
      ...mockAnalyze(),
      confidence: 'low',
      notes: 'Automatic analysis unavailable; clinician should review the photo directly.',
      error: true,
    };
  }
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
  const openai = client();
  const analysisBrief = analyses.slice(-14).map((a) => ({
    date: a.createdAt?.slice(0, 10),
    foodType: a.foodType,
    estimatedCalories: a.estimatedCalories,
    confidence: a.confidence,
  }));

  const lowConf = analyses.filter((a) => a.confidence === 'low').length;

  if (!openai) {
    return mockSummary({ patientName, metrics, alertReasons, lowConf });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You write brief pre-appointment summaries for clinicians supporting patients who log meals with a companion app.
Rules:
- Observations only — never diagnose, never prescribe, never instruct the clinician what to do.
- Phrase as patterns ("logging dropped off over the past week"), not clinical conclusions.
- Mention nutritional trends only as rough estimates from photo analysis; note low-confidence analyses.
- Return JSON: { "summary": string, "shouldAlert": boolean, "alertReason": string|null }
- If shouldAlert is true, alertReason MUST be a concrete explainable string.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            patientName,
            metrics,
            recentAnalyses: analysisBrief,
            existingAlertReasons: alertReasons,
            lowConfidenceCount: lowConf,
          }),
        },
      ],
      max_tokens: 500,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || mockSummary({ patientName, metrics, alertReasons, lowConf }).summary,
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

function normalizeAnalysis(parsed) {
  const confidence = ['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low';
  return {
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

function mockAnalyze() {
  const samples = [
    {
      foodType: 'Toast with avocado and egg',
      estimatedCalories: 380,
      estimatedProteinG: 16,
      estimatedCarbsG: 28,
      estimatedFatG: 22,
      confidence: 'medium',
      notes: 'Heuristic demo estimate (set OPENAI_API_KEY for live vision). Rough only.',
    },
    {
      foodType: 'Rice bowl with vegetables and tofu',
      estimatedCalories: 470,
      estimatedProteinG: 18,
      estimatedCarbsG: 68,
      estimatedFatG: 12,
      confidence: 'medium',
      notes: 'Heuristic demo estimate. Portion size uncertain from photo alone.',
    },
    {
      foodType: 'Yogurt bowl with fruit and granola',
      estimatedCalories: 320,
      estimatedProteinG: 14,
      estimatedCarbsG: 42,
      estimatedFatG: 9,
      confidence: 'medium',
      notes: 'Heuristic demo estimate. Toppings may vary widely.',
    },
    {
      foodType: 'Noodle soup with greens',
      estimatedCalories: 410,
      estimatedProteinG: 15,
      estimatedCarbsG: 55,
      estimatedFatG: 11,
      confidence: 'medium',
      notes: 'Broth depth is hard to judge from a still photo.',
    },
    {
      foodType: 'Unfamiliar plated dish',
      estimatedCalories: 0,
      estimatedProteinG: 0,
      estimatedCarbsG: 0,
      estimatedFatG: 0,
      confidence: 'low',
      notes: 'Low confidence — presentation unfamiliar; review the photo directly before using numbers.',
    },
  ];
  return { ...samples[Math.floor(Math.random() * samples.length)], error: false };
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
    source: process.env.OPENAI_API_KEY ? 'openai' : 'enriched-mock',
  };
}
