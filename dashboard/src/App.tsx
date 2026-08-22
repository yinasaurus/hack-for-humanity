import { useEffect, useMemo, useState } from 'react';
import {
  addClinicianNote,
  celebrateCheckup,
  clearClinicianReminder,
  clinicLogin,
  fetchAlerts,
  fetchAiStatus,
  fetchPatientDetail,
  fetchPatients,
  generateSummary,
  getClinicToken,
  previewCarePlan,
  setClinicToken,
  setClinicianReminder,
  updateClinicalProfile,
  type ClinicalProfile,
  type CarePlan,
} from './api';
import type { AlertRow, PatientRow } from './api';
import './App.css';
import { AuthenticatedMealImage } from './AuthenticatedMealImage';

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDay(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}


type ReminderTimeOfDay = 'morning' | 'midday' | 'evening';

const REMINDER_TIME_OPTIONS: { id: ReminderTimeOfDay; label: string; hour: number; hint: string }[] = [
  { id: 'morning', label: 'Morning', hour: 8, hint: '~8:00 AM' },
  { id: 'midday', label: 'Midday', hour: 12, hint: '~12:00 PM' },
  { id: 'evening', label: 'Evening', hour: 18, hint: '~6:00 PM' },
];

function timeOfDayFromHour(hour?: number): ReminderTimeOfDay {
  const h = typeof hour === 'number' ? hour : 12;
  if (h <= 10) return 'morning';
  if (h <= 15) return 'midday';
  return 'evening';
}

function labelForTimeOfDay(id: ReminderTimeOfDay) {
  return REMINDER_TIME_OPTIONS.find((o) => o.id === id)?.label || id;
}


function todayDateInput() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getClinicToken()));
  const [email, setEmail] = useState('clinic@demo.local');
  const [password, setPassword] = useState('demo');
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchPatientDetail>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'live' | 'mock' | 'unknown'>('unknown');
  const [showTrend, setShowTrend] = useState(false);
  const [showCelebrateForm, setShowCelebrateForm] = useState(false);
  const [celebrateDate, setCelebrateDate] = useState(todayDateInput);
  const [celebrateNote, setCelebrateNote] = useState('');
  const [celebrateBusy, setCelebrateBusy] = useState(false);
  const [celebrateOk, setCelebrateOk] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState<
    'daily' | 'weekly' | 'every_2_days' | 'every_3_days'
  >('weekly');
  const [reminderTimeOfDay, setReminderTimeOfDay] = useState<ReminderTimeOfDay>('midday');
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderOk, setReminderOk] = useState<string | null>(null);
  const [carePlanPreview, setCarePlanPreview] = useState<CarePlan | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [clinical, setClinical] = useState<ClinicalProfile>({ heightCm: null, weightKg: null, dailyCalorieTarget: null, customGoals: [] });
  const [clinicalBusy, setClinicalBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a, status] = await Promise.all([
        fetchPatients(),
        fetchAlerts(),
        fetchAiStatus(),
      ]);
      setPatients(p);
      setAlerts(a);
      setAiStatus(status);
      if (!selectedId && p[0]) setSelectedId(p[0].id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load dashboard';
      setError(msg);
      if (msg.toLowerCase().includes('sign in') || msg.toLowerCase().includes('session')) {
        setClinicToken(null);
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  useEffect(() => {
    if (!selectedId || !authed) return;
    setShowTrend(false);
    setShowCelebrateForm(false);
    setCelebrateDate(todayDateInput());
    setCelebrateNote('');
    setCelebrateOk(null);
    setReminderNote('');
    setReminderFrequency('weekly');
    setReminderTimeOfDay('midday');
    setReminderOk(null);
    setCarePlanPreview(null);
    (async () => {
      try {
        const d = await fetchPatientDetail(selectedId);
        setDetail(d);
        setClinical(d.patient.clinicalProfile || { heightCm: null, weightKg: null, dailyCalorieTarget: null, customGoals: [] });
        const existing = d.clinicianReminder as
          | {
              note?: string;
              frequency?: 'daily' | 'weekly' | 'every_2_days' | 'every_3_days';
              hour?: number;
              timeOfDay?: ReminderTimeOfDay;
            }
          | null
          | undefined;
        if (existing?.note) {
          setReminderNote(existing.note);
          if (existing.frequency) setReminderFrequency(existing.frequency);
          setReminderTimeOfDay(
            existing.timeOfDay || timeOfDayFromHour(existing.hour)
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load patient');
      }
    })();
  }, [selectedId, authed]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await clinicLogin(email, password);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    }
  };

  const onGenerate = async () => {
    if (!selectedId) return;
    setSummaryBusy(true);
    setError(null);
    try {
      await generateSummary(selectedId);
      const [d, a] = await Promise.all([fetchPatientDetail(selectedId), fetchAlerts()]);
      setDetail(d);
      setAlerts(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summary could not be generated');
    } finally {
      setSummaryBusy(false);
    }
  };

  const onSaveClinical = async () => {
    if (!selectedId) return;
    setClinicalBusy(true); setError(null);
    try {
      const saved = await updateClinicalProfile(selectedId, clinical);
      setClinical(saved);
      setDetail(await fetchPatientDetail(selectedId));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save clinical goals'); }
    finally { setClinicalBusy(false); }
  };

  const onAddNote = async () => {
    if (!selectedId || !noteText.trim()) return;
    try {
      await addClinicianNote(selectedId, noteText.trim());
      setNoteText('');
      const d = await fetchPatientDetail(selectedId);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    }
  };

  const onCelebrateCheckup = async () => {
    if (!selectedId) return;
    setCelebrateBusy(true);
    setCelebrateOk(null);
    setError(null);
    try {
      await celebrateCheckup(selectedId, {
        attendedOn: celebrateDate || todayDateInput(),
        note: celebrateNote.trim() || undefined,
      });
      setCelebrateOk('Celebration sent — the patient will see a one-time warm hello from their companion.');
      setCelebrateNote('');
      setShowCelebrateForm(false);
      const d = await fetchPatientDetail(selectedId);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not celebrate checkup');
    } finally {
      setCelebrateBusy(false);
    }
  };

  const onSaveReminder = async () => {
    if (!selectedId || !reminderNote.trim()) return;
    setReminderBusy(true);
    setReminderOk(null);
    setError(null);
    try {
      await setClinicianReminder(selectedId, {
        note: reminderNote.trim(),
        frequency: reminderFrequency,
        hour: REMINDER_TIME_OPTIONS.find((o) => o.id === reminderTimeOfDay)?.hour ?? 12,
        timeOfDay: reminderTimeOfDay,
        planWithAi: Boolean(carePlanPreview),
        carePlan: carePlanPreview || undefined,
      });
      setReminderOk(
        carePlanPreview
          ? 'Saved with gentle AI-assisted day plan — moments are spread out; patient can move a day if needed.'
          : 'Reminder saved — patient companion will surface it gently.'
      );
      const d = await fetchPatientDetail(selectedId);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reminder');
    } finally {
      setReminderBusy(false);
    }
  };

  const onPreviewCarePlan = async () => {
    if (!selectedId || !reminderNote.trim()) return;
    setPlanBusy(true);
    setError(null);
    try {
      const { carePlan, aiProvider } = await previewCarePlan(selectedId, reminderNote.trim());
      setCarePlanPreview(carePlan);
      setReminderOk(
        `Plan ready (${aiProvider}). Review slots, then Save — Gemini spreads moments so nothing piles onto one day.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not plan with AI');
    } finally {
      setPlanBusy(false);
    }
  };

  const onClearReminder = async () => {
    if (!selectedId) return;
    setReminderBusy(true);
    setReminderOk(null);
    setError(null);
    try {
      await clearClinicianReminder(selectedId);
      setReminderNote('');
      setReminderFrequency('weekly');
      setReminderTimeOfDay('midday');
      setReminderOk('Reminder cleared.');
      const d = await fetchPatientDetail(selectedId);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear reminder');
    } finally {
      setReminderBusy(false);
    }
  };

  const alertCountByPatient = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) {
      map.set(a.patientId, (map.get(a.patientId) || 0) + 1);
    }
    return map;
  }, [alerts]);

  const patientAlerts = useMemo(
    () => alerts.filter((a) => a.patientId === selectedId),
    [alerts, selectedId]
  );

  const liveAi = aiStatus === 'live' || detail?.aiStatus === 'live';

  if (!authed) {
    return (
      <div className="app login-wrap">
        <form className="login-card" onSubmit={onLogin} aria-label="Clinician sign in">
          <p className="eyebrow">Clinician access</p>
          <h1>Buddi Clinic</h1>
          <p className="muted">Demo: clinic@demo.local / demo</p>
          {error && (
            <div className="banner error" role="alert">
              {error}
            </div>
          )}
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              aria-label="Clinician email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              aria-label="Clinician password"
            />
          </label>
          <button type="submit" aria-label="Sign in to clinician dashboard">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <h1>Buddi Clinic</h1>
          <p className="header-tagline">Photos · patterns · notes — you decide</p>
        </div>
        <div className="header-right">
          <span
            className={`ai-pill ${liveAi ? 'ai-pill-live' : 'ai-pill-mock'}`}
            role="status"
            aria-live="polite"
            title={
              liveAi
                ? 'Live vision + summaries active (Gemini or OpenAI)'
                : 'Set GEMINI_API_KEY in backend .env and restart for live AI'
            }
          >
            {liveAi ? 'Live AI' : 'Mock AI'}
          </span>
          <nav className="header-actions" aria-label="Dashboard actions">
            <button
              type="button"
              className="ghost"
              onClick={load}
              aria-label="Refresh patient list and alerts"
            >
              Refresh
            </button>
            <button
              type="button"
              className="ghost"
              aria-label="Sign out of clinician dashboard"
              onClick={() => {
                setClinicToken(null);
                setAuthed(false);
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <p className="ethics-line">
        Patients never see calories or scores. AI observes — clinicians decide.
        {!liveAi ? ' Mock mode: demo estimates, not live vision.' : ''}
      </p>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <div className="clinic-shell">
        <aside className="sidebar" aria-labelledby="patients-heading">
          <div className="sidebar-head">
            <h2 id="patients-heading">Patients</h2>
            {loading ? <span className="muted tiny">Loading…</span> : null}
          </div>
          <p className="sidebar-hint">
            % = days with a meal photo (not calories). Last = most recent check-in.
          </p>

          {alerts.length > 0 ? (
            <div className="flag-strip" aria-label="Active alerts">
              <span className="flag-strip-count">{alerts.length} flags</span>
              <ul className="flag-strip-list">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={a.patientId === selectedId ? 'on' : undefined}
                      onClick={() => setSelectedId(a.patientId)}
                      aria-label={`Open ${a.patientName}: ${a.reason}`}
                    >
                      <strong>{a.patientName}</strong>
                      <span>{a.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="empty-side">No active flags</p>
          )}

          <ul className="patient-list">
            {patients.map((p) => {
              const flags = alertCountByPatient.get(p.id) || 0;
              const on = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`patient-card ${on ? 'selected' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                    aria-pressed={on}
                    aria-label={`View patient ${p.name}`}
                  >
                    <div className="patient-card-top">
                      <strong>{p.name}</strong>
                      {flags > 0 ? (
                        <span className="flag-badge">{flags} flag{flags === 1 ? '' : 's'}</span>
                      ) : null}
                    </div>
                    <div className="patient-card-meta">
                      <span>
                        <em>Last 7 days</em> {Math.round(p.rate7 * 7)}/{7} days
                      </span>
                      <span>
                        <em>Last 30 days</em> {Math.round(p.rate30 * 30)}/{30} days
                      </span>
                      <span>
                        <em>Last photo</em>{' '}
                        {p.lastCheckIn ? formatDay(p.lastCheckIn) : 'None yet'}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main
          className="chart"
          aria-labelledby={detail ? 'patient-detail-heading' : undefined}
          aria-label={detail ? undefined : 'Patient detail'}
        >
          {!detail ? (
            <p className="muted chart-empty">Select a patient</p>
          ) : (
            <>
              <div className="chart-head">
                <div>
                  <h2 id="patient-detail-heading">{detail.patient.name}</h2>
                  <p className="muted tiny">{detail.patient.email}</p>
                </div>
                <button
                  type="button"
                  className="primary"
                  onClick={onGenerate}
                  disabled={summaryBusy}
                  aria-label={`Generate AI summary for ${detail.patient.name}`}
                >
                  {summaryBusy ? 'Generating…' : 'Generate summary'}
                </button>
              </div>

              {patientAlerts.length > 0 ? (
                <section className="block flags-block" aria-label="Why flagged">
                  <h3>Why flagged</h3>
                  <ul className="flag-detail-list">
                    {patientAlerts.map((a) => (
                      <li key={a.id}>
                        <p className="flag-title">{a.reason}</p>
                        {a.detail ? <p className="muted tiny">{a.detail}</p> : null}
                      </li>
                    ))}
                  </ul>
                  <p className="muted tiny">Observational only — you decide any outreach.</p>
                </section>
              ) : (
                <section className="block flags-block calm" aria-label="No alert">
                  <h3>No active flags</h3>
                  <p className="muted tiny">Patterns are within thresholds. Still observational.</p>
                </section>
              )}

              <section className="metrics" aria-label="Logging metrics">
                <div>
                  <span className="label">Streak</span>
                  <strong>{detail.metrics.streak}</strong>
                  <span className="metric-sub">days in a row</span>
                </div>
                <div>
                  <span className="label">Misses</span>
                  <strong>{detail.metrics.misses}</strong>
                  <span className="metric-sub">days since last</span>
                </div>
                <div>
                  <span className="label">Last 7 days</span>
                  <strong>
                    {Math.round(detail.metrics.rate7 * 7)}/{7}
                  </strong>
                  <span className="metric-sub">{pct(detail.metrics.rate7)} of days</span>
                </div>
                <div>
                  <span className="label">Last 30 days</span>
                  <strong>
                    {Math.round(detail.metrics.rate30 * 30)}/{30}
                  </strong>
                  <span className="metric-sub">{pct(detail.metrics.rate30)} of days</span>
                </div>
              </section>

              <section className="block" aria-label="Clinician-only clinical targets">
                <h3>Clinical targets</h3>
                <p className="muted tiny">Clinician-only. Numerical values are never returned by patient APIs.</p>
                <div className="celebrate-form">
                  <label className="field"><span>Height (cm)</span><input type="number" min="1" value={clinical.heightCm ?? ''} onChange={(e) => setClinical({ ...clinical, heightCm: e.target.value ? Number(e.target.value) : null })} /></label>
                  <label className="field"><span>Weight (kg)</span><input type="number" min="1" step="0.1" value={clinical.weightKg ?? ''} onChange={(e) => setClinical({ ...clinical, weightKg: e.target.value ? Number(e.target.value) : null })} /></label>
                  <label className="field"><span>Daily calorie target</span><input type="number" min="1" value={clinical.dailyCalorieTarget ?? ''} onChange={(e) => setClinical({ ...clinical, dailyCalorieTarget: e.target.value ? Number(e.target.value) : null })} /></label>
                  <label className="field"><span>Patient-facing food goals (one per line)</span><textarea rows={3} value={clinical.customGoals.join('\n')} onChange={(e) => setClinical({ ...clinical, customGoals: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })} placeholder="Two gentle apple moments this week" /></label>
                  <button type="button" className="primary" disabled={clinicalBusy} onClick={() => void onSaveClinical()}>{clinicalBusy ? 'Saving…' : 'Save clinical plan'}</button>
                </div>
              </section>

              <section className="block" aria-label="30-day logging map">
                <h3>30-day presence</h3>
                <div className="heat" role="img" aria-label="30-day logging presence map">
                  {(detail.consistency30 || []).map((d: { date: string; logged: boolean }) => (
                    <span
                      key={d.date}
                      title={`${d.date}${d.logged ? ' — logged' : ' — no log'}`}
                      className={d.logged ? 'heat-on' : 'heat-off'}
                    />
                  ))}
                </div>
              </section>

              <article className="block summary">
                <h3>Pre-appointment summary</h3>
                {detail.summary ? (
                  <>
                    <p>{detail.summary.summary}</p>
                    <div className="summary-actions">
                      <span className="muted tiny">
                        {detail.summary.source || 'ai'} · observational
                      </span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => navigator.clipboard.writeText(detail.summary.summary)}
                        aria-label="Copy AI summary to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">No summary yet — generate one before an appointment.</p>
                )}
              </article>

              <section className="block celebrate-checkup">
                <h3>Celebrate checkup</h3>
                <p className="muted tiny">
                  Manual only — marks that they attended. No body metrics, scores, or inferred
                  outcomes.
                </p>
                {!showCelebrateForm ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setCelebrateOk(null);
                      setCelebrateDate(todayDateInput());
                      setCelebrateNote('');
                      setShowCelebrateForm(true);
                    }}
                    aria-label={`Celebrate checkup for ${detail.patient.name}`}
                  >
                    Celebrate checkup
                  </button>
                ) : (
                  <form
                    className="celebrate-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void onCelebrateCheckup();
                    }}
                  >
                    <label className="field">
                      <span>Checkup date</span>
                      <input
                        type="date"
                        value={celebrateDate}
                        onChange={(e) => setCelebrateDate(e.target.value)}
                        required
                        aria-label="Checkup attended date"
                      />
                    </label>
                    <label className="field">
                      <span>Optional encouragement (shown to patient)</span>
                      <textarea
                        value={celebrateNote}
                        onChange={(e) => setCelebrateNote(e.target.value)}
                        placeholder='e.g. "great session today"'
                        rows={2}
                        maxLength={280}
                        aria-label="Optional encouragement note for patient"
                      />
                    </label>
                    <div className="celebrate-actions">
                      <button type="submit" className="primary" disabled={celebrateBusy}>
                        {celebrateBusy ? 'Sending…' : 'Send celebration'}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={celebrateBusy}
                        onClick={() => setShowCelebrateForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {celebrateOk ? <p className="ok tiny">{celebrateOk}</p> : null}
                {(detail.checkupCelebrations || []).length > 0 ? (
                  <ul className="note-list">
                    {(detail.checkupCelebrations || []).slice(0, 5).map(
                      (c: {
                        id: string;
                        attendedOn: string;
                        note?: string | null;
                        acknowledgedAt?: string | null;
                      }) => (
                        <li key={c.id}>
                          <time className="muted tiny">
                            Attended {c.attendedOn}
                            {c.acknowledgedAt ? ' · seen by patient' : ' · waiting for patient'}
                          </time>
                          <p>{c.note || 'Warm default message'}</p>
                        </li>
                      )
                    )}
                  </ul>
                ) : null}
              </section>

              <section className="block clinician-reminder">
                <h3>Care reminder + gentle AI plan</h3>
                <p className="muted tiny">
                  You write the care note (e.g. “3 apples this week” or “3 apples in 2 days”). Optional
                  Gemini suggests a soft day/meal spread — never catch-up stacking, no body metrics.
                </p>
                <form
                  className="celebrate-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onSaveReminder();
                  }}
                >
                  <label className="field">
                    <span>Reminder note (shown to patient)</span>
                    <textarea
                      value={reminderNote}
                      onChange={(e) => {
                        setReminderNote(e.target.value);
                        setCarePlanPreview(null);
                      }}
                      placeholder='e.g. "3 apples this week" or "3 soft apple moments in 2 days"'
                      rows={2}
                      maxLength={280}
                      required
                      aria-label={`Care reminder for ${detail.patient.name}`}
                    />
                  </label>
                  <label className="field">
                    <span>Fallback notification frequency</span>
                    <select
                      value={reminderFrequency}
                      onChange={(e) =>
                        setReminderFrequency(
                          e.target.value as 'daily' | 'weekly' | 'every_2_days' | 'every_3_days'
                        )
                      }
                      aria-label="Reminder frequency"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="every_2_days">Custom — every 2 days</option>
                      <option value="every_3_days">Custom — every 3 days</option>
                    </select>
                  </label>
                  <fieldset className="field time-of-day">
                    <legend>Time of day</legend>
                    <p className="muted tiny">
                      Rough window for the OS reminder — Morning / Midday / Evening (not exact minutes).
                    </p>
                    <div className="time-of-day-row" role="radiogroup" aria-label="Reminder time of day">
                      {REMINDER_TIME_OPTIONS.map((opt) => (
                        <label key={opt.id} className="time-chip">
                          <input
                            type="radio"
                            name="reminder-time"
                            value={opt.id}
                            checked={reminderTimeOfDay === opt.id}
                            onChange={() => setReminderTimeOfDay(opt.id)}
                          />
                          <span>
                            {opt.label}
                            <small>{opt.hint}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="celebrate-actions">
                    <button
                      type="button"
                      className="ghost"
                      disabled={planBusy || !reminderNote.trim()}
                      onClick={() => void onPreviewCarePlan()}
                    >
                      {planBusy ? 'Planning…' : 'Plan with Gemini'}
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={reminderBusy || !reminderNote.trim()}
                    >
                      {reminderBusy ? 'Saving…' : 'Save reminder'}
                    </button>
                    {detail.clinicianReminder ? (
                      <button
                        type="button"
                        className="ghost"
                        disabled={reminderBusy}
                        onClick={() => void onClearReminder()}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </form>
                {reminderOk ? <p className="ok tiny">{reminderOk}</p> : null}
                {carePlanPreview?.slots?.length ? (
                  <ul className="note-list">
                    <li>
                      <p className="muted tiny">{carePlanPreview.summary}</p>
                    </li>
                    {carePlanPreview.slots.map((s, i) => (
                      <li key={`${s.date}-${s.mealLabel}-${i}`}>
                        <time className="muted tiny">
                          {s.date} · {s.mealLabel}
                        </time>
                        <p>{s.prompt}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {detail.clinicianReminder ? (
                  <p className="muted tiny">
                    Active: {detail.clinicianReminder.frequency.replace(/_/g, ' ')} ·{' '}
                    {labelForTimeOfDay(
                      (detail.clinicianReminder as { timeOfDay?: ReminderTimeOfDay }).timeOfDay ||
                        timeOfDayFromHour(
                          (detail.clinicianReminder as { hour?: number }).hour
                        )
                    )}{' '}
                    · {detail.clinicianReminder.note}
                    {detail.clinicianReminder.carePlan?.slots?.length
                      ? ` · ${detail.clinicianReminder.carePlan.slots.length} planned moments`
                      : ''}
                  </p>
                ) : null}
              </section>

              <section className="block notes">
                <h3>Your notes</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="For your team — not shown to patient"
                  rows={2}
                  aria-label={`Clinician note for ${detail.patient.name}`}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={onAddNote}
                  aria-label={`Save clinician note for ${detail.patient.name}`}
                >
                  Save note
                </button>
                {(detail.clinicianNotes || []).length > 0 ? (
                  <ul className="note-list">
                    {(detail.clinicianNotes || []).map(
                      (n: { id: string; text: string; createdAt: string }) => (
                        <li key={n.id}>
                          <time className="muted tiny">{formatDate(n.createdAt)}</time>
                          <p>{n.text}</p>
                        </li>
                      )
                    )}
                  </ul>
                ) : null}
              </section>

              <section className="block">
                <h3>Recent check-ins</h3>
                <p className="muted tiny">
                  Latest 3 · clinic-only estimates. Patients never see these numbers.
                  Soft “possible screen photo” hints stay here too — check-in still counts.
                </p>
                <ul className="checkins">
                  {detail.checkIns.slice(0, 3).map(
                    (c: {
                      id: string;
                      createdAt: string;
                      photoUrl?: string | null;
                      analysis?: {
                        foodType: string;
                        estimatedCalories: number;
                        confidence: string;
                        notes: string;
                        pending?: boolean;
                        isMeal?: boolean;
                        possibleScreenPhoto?: boolean;
                      } | null;
                    }) => (
                      <li key={c.id} className="checkin-row">
                        {c.photoUrl ? (
                          <AuthenticatedMealImage
                            className="meal-thumb"
                            photoUrl={c.photoUrl}
                            alt={`Meal check-in from ${formatDate(c.createdAt)}`}
                          />
                        ) : (
                          <div className="meal-thumb placeholder">No photo</div>
                        )}
                        <div className="checkin-body">
                          <strong>{formatDate(c.createdAt)}</strong>
                          {c.analysis ? (
                            <>
                              <p>
                                {c.analysis.pending ? (
                                  <>Analyzing photo… · companion hello already saved</>
                                ) : c.analysis.isMeal === false ? (
                                  <>Not a meal photo · no estimate</>
                                ) : (
                                  <>
                                    {c.analysis.foodType}
                                    <span className="kcal">
                                      {' '}
                                      · ~{c.analysis.estimatedCalories} kcal
                                    </span>
                                    <span className={`conf conf-${c.analysis.confidence}`}>
                                      {' '}
                                      · {c.analysis.confidence}
                                    </span>
                                  </>
                                )}
                              </p>
                              {c.analysis.possibleScreenPhoto ? (
                                <p className="screen-flag">
                                  Possible screen photo · soft hint only — discuss in person if needed
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <p className="muted">No analysis</p>
                          )}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              </section>

              {detail.calorieTrend?.length > 0 ? (
                <section className="block">
                  <button
                    type="button"
                    className="disclosure"
                    aria-expanded={showTrend}
                    onClick={() => setShowTrend((v) => !v)}
                  >
                    {showTrend ? 'Hide' : 'Show'} intake trend ({detail.calorieTrend.length} days)
                  </button>
                  {showTrend ? (
                    <>
                      <p className="muted tiny">Rough photo estimates — clinician only.</p>
                      <ul className="trend">
                        {detail.calorieTrend.map(
                          (t: {
                            date: string;
                            estimatedCalories: number;
                            foodType: string;
                            confidence: string;
                          }) => (
                            <li key={`${t.date}-${t.estimatedCalories}`}>
                              <span>{t.date}</span>
                              <span>~{t.estimatedCalories} kcal</span>
                              <span className="muted">{t.confidence}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
