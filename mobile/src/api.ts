/**
 * API client with JWT session support.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PetAppearance } from './pets';

const envUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE =
  envUrl ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');

const TOKEN_KEY = 'kindplate.token';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'clinician';
  onboarded: boolean;
} & Partial<PetAppearance>;

export type Unlock = {
  milestoneDay: number;
  type: string;
  id: string;
  label: string;
  unlockedAt: string;
};

export type CompanionState = {
  mood: 'happy' | 'resting';
  streakDays: number;
  totalCheckInDays: number;
  daysSinceLastCheckIn: number | null;
  walksAvailable: boolean;
  unlocks: Unlock[];
  newlyUnlocked: Unlock[];
  /** YYYY-MM-DD days with a check-in (for soft calendar). */
  helloDays?: string[];
} & PetAppearance;

export type AuthResult = { user: User; token: string };

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Could not reach server (${res.status})`);
  }
}

export async function saveToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function authHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function login(
  email: string,
  password: string,
  role: 'patient' | 'clinician' = 'patient'
): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not sign in');
  await saveToken(data.token);
  return { user: data.user, token: data.token };
}

export async function signup(
  email: string,
  password: string,
  name: string
): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not create account');
  await saveToken(data.token);
  return { user: data.user, token: data.token };
}

export async function markOnboarded(userId: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/onboarded`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not update onboarding');
  return data.user;
}

export async function fetchCompanion(userId: string): Promise<CompanionState> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/companion`, {
    headers: await authHeaders(false),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not load companion');
  return data;
}

export async function updateAppearance(
  userId: string,
  appearance: PetAppearance
): Promise<CompanionState> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/appearance`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(appearance),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not save appearance');
  return data.companion;
}

export async function submitCheckIn(
  userId: string,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<{ checkIn: unknown; companion: CompanionState }> {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const res = await fetch(`${API_BASE}/api/patient/${userId}/check-in`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ imageBase64: cleaned, mimeType }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not save check-in');
  assertNoNutritionLeak(data);
  return data;
}

/** Prefer this on device — multipart is more reliable than huge JSON base64. */
export async function submitCheckInPhoto(
  userId: string,
  uri: string,
  mimeType = 'image/jpeg'
): Promise<{ checkIn: unknown; companion: CompanionState }> {
  const form = new FormData();
  form.append('photo', {
    uri,
    name: 'meal.jpg',
    type: mimeType,
  } as unknown as Blob);

  const headers = await authHeaders(false);
  const res = await fetch(`${API_BASE}/api/patient/${userId}/check-in`, {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not save check-in');
  assertNoNutritionLeak(data);
  return data;
}

export function assertNoNutritionLeak(payload: unknown) {
  const banned = [
    'estimatedCalories',
    'estimatedProteinG',
    'estimatedCarbsG',
    'estimatedFatG',
    'calories',
    'macros',
    'nutritionScore',
  ];
  const json = JSON.stringify(payload);
  for (const key of banned) {
    if (json.includes(`"${key}"`)) {
      throw new Error(`Patient API leaked nutrition field: ${key}`);
    }
  }
}
