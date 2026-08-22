import {
  checkInRate,
  consecutiveMisses,
  currentStreak,
  uniqueSortedDays,
} from './streaks.js';

/**
 * Rule-based alert thresholds with explainable reason strings.
 * AI may rephrase, but every alert MUST keep a concrete reason.
 * Clinician decides — these are observational flags only.
 */

export function evaluateAlerts(patient, checkIns, analyses = []) {
  const alerts = [];
  const misses = consecutiveMisses(checkIns);
  const rate7 = checkInRate(checkIns, 7);
  const rate10 = checkInRate(checkIns, 10);
  const rate30 = checkInRate(checkIns, 30);
  const streak = currentStreak(checkIns);
  const totalDays = uniqueSortedDays(checkIns).length;
  const target = Number(patient.clinicalProfile?.dailyCalorieTarget) || null;
  const today = new Date().toISOString().slice(0, 10);
  const todayIntake = analyses
    .filter((a) => String(a.createdAt || '').slice(0, 10) === today && a.isMeal !== false)
    .reduce((sum, a) => sum + (Number(a.estimatedCalories) || 0), 0);
  const deficitPct = target ? Math.max(0, (target - todayIntake) / target) : null;

  let intakeSeverity = 'normal';
  if (deficitPct != null) {
    if (deficitPct > 0.5) intakeSeverity = 'level3';
    else if (deficitPct >= 0.45) intakeSeverity = 'level2';
    else if (deficitPct >= 0.25) intakeSeverity = 'level1';
  }
  if (intakeSeverity !== 'normal') {
    const labels = { level1: 'Routine summary', level2: 'Same-day review', level3: 'High-priority review' };
    alerts.push({
      patientId: patient.id, patientName: patient.name,
      reason: `${labels[intakeSeverity]}: estimated intake below clinician target`,
      detail: `Estimated daily deficit is ${Math.round(deficitPct * 100)}% against the configured target.`,
      guidance: 'Photo-based estimates are approximate. Clinician review is required.',
      severity: intakeSeverity, createdAt: new Date().toISOString(),
    });
  }

  if (misses >= 5) {
    alerts.push({
      patientId: patient.id,
      patientName: patient.name,
      reason: `${misses} consecutive missed logs`,
      detail:
        `No meal check-in for ${misses} days in a row. Rule threshold is 5+ consecutive misses.`,
      guidance:
        'Observational only — not a diagnosis. Clinician decides whether outreach is appropriate.',
      severity: 'attention',
      createdAt: new Date().toISOString(),
    });
  }

  const olderCheckIns = checkIns.filter((c) => {
    const age =
      (Date.now() - new Date(c.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return age > 10 && age <= 20;
  });
  const olderRate = olderCheckIns.length / 10;
  if (olderRate >= 0.5 && rate10 <= olderRate - 0.4) {
    alerts.push({
      patientId: patient.id,
      patientName: patient.name,
      reason: 'Sharp drop in logging frequency over 10 days',
      detail: `Earlier window ~${Math.round(olderRate * 100)}% of days; recent 10-day rate ~${Math.round(
        rate10 * 100
      )}%. Drop of 40+ percentage points triggers this flag.`,
      guidance:
        'Pattern change worth a glance before the next appointment. AI observes; you decide.',
      severity: 'attention',
      createdAt: new Date().toISOString(),
    });
  }

  if (totalDays >= 5 && rate30 < 0.2 && misses >= 3) {
    const already = alerts.some((a) => a.reason.includes('consecutive'));
    if (!already) {
      alerts.push({
        patientId: patient.id,
        patientName: patient.name,
        reason: `Low logging consistency over 30 days (${Math.round(rate30 * 100)}% of days)`,
        detail: `Only ${Math.round(rate30 * 100)}% of the last 30 days include a check-in, with ${misses} consecutive misses.`,
        guidance:
          'Soft consistency signal for clinical context — not a risk score.',
        severity: 'info',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    alerts,
    metrics: {
      streak,
      misses,
      rate7,
      rate10,
      rate30,
      totalDays,
      lowConfidenceAnalyses: analyses.filter((a) => a.confidence === 'low').length,
      todayEstimatedIntake: todayIntake,
      dailyDeficitPct: deficitPct,
      intakeSeverity,
    },
  };
}
