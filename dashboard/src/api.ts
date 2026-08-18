const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export { API_BASE };

const TOKEN_KEY = 'kindplate.clinic.token';

export function getClinicToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setClinicToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = getClinicToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type PatientRow = {
  id: string;
  name: string;
  email: string;
  rate7: number;
  rate30: number;
  streak: number;
  lastCheckIn?: string;
  totalDays: number;
};

export type AlertRow = {
  id: string;
  patientId: string;
  patientName: string;
  reason: string;
  detail?: string;
  guidance?: string;
  severity: string;
  createdAt: string;
};

export async function clinicLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: 'clinician' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not sign in');
  setClinicToken(data.token);
  return data.user;
}

export async function fetchAiStatus(): Promise<'live' | 'mock'> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    return data.aiStatus === 'live' ? 'live' : 'mock';
  } catch {
    return 'mock';
  }
}

export async function fetchPatients(): Promise<PatientRow[]> {
  const res = await fetch(`${API_BASE}/api/clinician/patients`, {
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load patients');
  return data.patients;
}

export async function fetchAlerts(): Promise<AlertRow[]> {
  const res = await fetch(`${API_BASE}/api/clinician/alerts`, {
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load alerts');
  return data.alerts;
}

export async function fetchPatientDetail(id: string) {
  const res = await fetch(`${API_BASE}/api/clinician/patients/${id}`, {
    headers: authHeaders(false),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load patient');
  return data;
}

export async function generateSummary(patientId: string) {
  const res = await fetch(`${API_BASE}/api/generate-summary`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ patientId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not generate summary');
  return data;
}

export async function addClinicianNote(patientId: string, text: string) {
  const res = await fetch(`${API_BASE}/api/clinician/patients/${patientId}/notes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not save note');
  return data.note;
}
