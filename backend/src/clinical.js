const NUMBER_FIELDS = ['heightCm', 'weightKg', 'dailyCalorieTarget'];

export function clinicalProfileFromUser(user = {}) {
  const profile = user.clinicalProfile || {};
  return {
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    dailyCalorieTarget: profile.dailyCalorieTarget ?? null,
    customGoals: Array.isArray(profile.customGoals) ? profile.customGoals : [],
    updatedAt: profile.updatedAt || null,
  };
}

export function normalizeClinicalProfile(body = {}, previous = {}) {
  const next = { ...clinicalProfileFromUser({ clinicalProfile: previous }) };
  for (const key of NUMBER_FIELDS) {
    if (body[key] === undefined) continue;
    if (body[key] === null || body[key] === '') {
      next[key] = null;
      continue;
    }
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${key} must be a positive number`);
    next[key] = value;
  }
  if (body.customGoals !== undefined) {
    if (!Array.isArray(body.customGoals)) throw new Error('customGoals must be an array');
    next.customGoals = body.customGoals
      .map((goal) => String(goal || '').trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 20);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Patient-safe copy for reminders: text goals only, never clinical measurements/targets. */
export function patientReminderFromClinicalProfile(profile = {}) {
  const goals = Array.isArray(profile.customGoals) ? profile.customGoals : [];
  const messages = goals.map((goal) => {
    const nonNumerical = String(goal)
      .replace(/\b\d+(?:\.\d+)?\b/g, '')
      .replace(/\b(?:calories?|kcal|kilograms?|kg|grams?|g|centimeters?|cm|pounds?|lbs?)\b/gi, '')
      .replace(/\s*\/\s*(?:day|week|month)s?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
      .trim();
    return `A gentle reminder: ${nonNumerical || 'your care goal'}`;
  });
  return messages.length
    ? { title: 'A note from your care team', messages }
    : null;
}
