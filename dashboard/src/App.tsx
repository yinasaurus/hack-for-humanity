import { useEffect, useState } from 'react';
import {
  addClinicianNote,
  clinicLogin,
  fetchAlerts,
  fetchAiStatus,
  fetchPatientDetail,
  fetchPatients,
  generateSummary,
  getClinicToken,
  setClinicToken,
} from './api';
import type { AlertRow, PatientRow } from './api';
import './App.css';
import { AuthenticatedMealImage } from './AuthenticatedMealImage';

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
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
    (async () => {
      try {
        const d = await fetchPatientDetail(selectedId);
        setDetail(d);
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

  const selectedAlert = alerts.find((a) => a.patientId === selectedId);
  const liveAi = aiStatus === 'live' || detail?.aiStatus === 'live';

  if (!authed) {
    return (
      <div className="app login-wrap">
        <form className="login-card" onSubmit={onLogin}>
          <p className="eyebrow">Clinician access</p>
          <h1>KindPlate Clinic</h1>
          <p className="muted">Signed sessions required. Demo: clinic@demo.local / demo</p>
          {error && <div className="banner error">{error}</div>}
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Clinician dashboard</p>
          <h1>KindPlate Clinic</h1>
          <p className="muted tiny">
            Meal photos, logging patterns, AI observations, and your notes — you decide next
            steps. AI mode:{' '}
            <strong className={liveAi ? 'ai-live' : 'ai-mock'}>
              {liveAi ? 'live OpenAI' : 'enriched mock (set OPENAI_API_KEY for live)'}
            </strong>
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost" onClick={load}>
            Refresh
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setClinicToken(null);
              setAuthed(false);
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="banner ethics">
        <strong>Ethics reminder:</strong> Estimates are observational. Patients never see
        calories or scores. AI observes — clinicians decide.
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      <section className="alerts">
        <h2>Why these alerts fired</h2>
        <p className="muted">
          Each flag includes the rule that triggered it. Tap a patient to jump to their chart.
          You decide any outreach.
        </p>
        {alerts.length === 0 ? (
          <p className="empty">No active alerts.</p>
        ) : (
          <ul className="alert-list">
            {alerts.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setSelectedId(a.patientId)}>
                  <div className="alert-top">
                    <strong>{a.patientName}</strong>
                    <span className={`sev sev-${a.severity || 'info'}`}>{a.severity || 'info'}</span>
                  </div>
                  <span className="alert-reason">{a.reason}</span>
                  {a.detail ? <span className="alert-detail">{a.detail}</span> : null}
                  {a.guidance ? <span className="alert-guide">{a.guidance}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Patients</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>7-day</th>
                <th>30-day</th>
                <th>Last log</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  className={p.id === selectedId ? 'selected' : undefined}
                  onClick={() => setSelectedId(p.id)}
                >
                  <td>{p.name}</td>
                  <td>{pct(p.rate7)}</td>
                  <td>{pct(p.rate30)}</td>
                  <td>{p.lastCheckIn ? new Date(p.lastCheckIn).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel detail">
          {!detail ? (
            <p className="muted">Select a patient</p>
          ) : (
            <>
              <div className="detail-head">
                <div>
                  <h2>{detail.patient.name}</h2>
                  <p className="muted">{detail.patient.email}</p>
                </div>
                <button type="button" onClick={onGenerate} disabled={summaryBusy}>
                  {summaryBusy ? 'Generating…' : 'Generate AI summary'}
                </button>
              </div>

              {selectedAlert ? (
                <div className="why-box">
                  <p className="why-label">Why this patient is flagged</p>
                  <p className="why-reason">{selectedAlert.reason}</p>
                  {selectedAlert.detail ? <p className="muted">{selectedAlert.detail}</p> : null}
                  {selectedAlert.guidance ? (
                    <p className="why-guide">{selectedAlert.guidance}</p>
                  ) : null}
                </div>
              ) : (
                <div className="why-box calm">
                  <p className="why-label">No active alert</p>
                  <p className="muted">
                    Logging patterns are within rule thresholds right now. Still observational —
                    you decide care.
                  </p>
                </div>
              )}

              <div className="metrics">
                <div>
                  <span className="label">Streak</span>
                  <strong>{detail.metrics.streak}</strong>
                </div>
                <div>
                  <span className="label">Misses</span>
                  <strong>{detail.metrics.misses}</strong>
                </div>
                <div>
                  <span className="label">7-day rate</span>
                  <strong>{pct(detail.metrics.rate7)}</strong>
                </div>
                <div>
                  <span className="label">30-day rate</span>
                  <strong>{pct(detail.metrics.rate30)}</strong>
                </div>
              </div>

              <h3>30-day logging map</h3>
              <div className="heat">
                {(detail.consistency30 || []).map(
                  (d: { date: string; logged: boolean }) => (
                    <span
                      key={d.date}
                      title={`${d.date}${d.logged ? ' — logged' : ' — no log'}`}
                      className={d.logged ? 'heat-on' : 'heat-off'}
                    />
                  )
                )}
              </div>

              {detail.calorieTrend?.length > 0 && (
                <>
                  <h3>Estimated intake trend (clinician only)</h3>
                  <p className="disclaimer">
                    Estimate only — not a diagnosis or care decision. Confidence varies; treat
                    low-confidence rows cautiously. Clinician decides.
                  </p>
                  <ul className="trend">
                    {detail.calorieTrend.map(
                      (t: {
                        date: string;
                        estimatedCalories: number;
                        foodType: string;
                        confidence: string;
                      }) => (
                        <li key={`${t.date}-${t.foodType}`}>
                          {t.date}: ~{t.estimatedCalories} kcal · {t.foodType} · {t.confidence}
                        </li>
                      )
                    )}
                  </ul>
                </>
              )}

              <article className="summary">
                <h3>Pre-appointment summary</h3>
                <p className="disclaimer">
                  AI-generated observational notes for clinician interpretation — not a risk
                  score and never shown as patient-facing nutrition numbers.
                </p>
                {detail.summary ? (
                  <>
                    <p>{detail.summary.summary}</p>
                    <p className="muted tiny">
                      Source: {detail.summary.source || 'ai'} · Observational only.
                    </p>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => navigator.clipboard.writeText(detail.summary.summary)}
                    >
                      Copy summary
                    </button>
                  </>
                ) : (
                  <p className="muted">No summary yet. Generate one before an appointment.</p>
                )}
              </article>

              <h3>Clinician notes</h3>
              <div className="notes">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Appointment thoughts (stored for your team — not shown to patient)"
                  rows={3}
                />
                <button type="button" onClick={onAddNote}>
                  Save note
                </button>
                <ul>
                  {(detail.clinicianNotes || []).map(
                    (n: { id: string; text: string; createdAt: string }) => (
                      <li key={n.id}>
                        <strong>{formatDate(n.createdAt)}</strong>
                        <p>{n.text}</p>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <h3>Recent check-ins (photos + estimates)</h3>
              <p className="disclaimer">
                Photo estimates are approximate. Patients never see these numbers. Clinician
                decides how to use them.
              </p>
              <ul className="checkins">
                {detail.checkIns.slice(0, 10).map(
                  (c: {
                    id: string;
                    createdAt: string;
                    photoUrl?: string | null;
                    analysis?: {
                      foodType: string;
                      estimatedCalories: number;
                      confidence: string;
                      notes: string;
                    } | null;
                  }) => (
                    <li key={c.id} className="checkin-row">
                      {c.photoUrl ? (
                        <AuthenticatedMealImage
                          className="meal-thumb"
                          photoUrl={c.photoUrl}
                          alt="Meal check-in"
                        />
                      ) : (
                        <div className="meal-thumb placeholder">No photo</div>
                      )}
                      <div>
                        <strong>{formatDate(c.createdAt)}</strong>
                        {c.analysis ? (
                          <p>
                            {c.analysis.foodType} · ~{c.analysis.estimatedCalories} kcal ·
                            confidence {c.analysis.confidence}
                            {c.analysis.confidence === 'low'
                              ? ' — treat estimate cautiously'
                              : ''}
                          </p>
                        ) : (
                          <p className="muted">No analysis stored</p>
                        )}
                      </div>
                    </li>
                  )
                )}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
