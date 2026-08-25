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

export type PetGender = 'male' | 'female';

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'patient' | 'clinician';
  onboarded: boolean;
  petGender?: PetGender;
} & Partial<PetAppearance>;

export type Unlock = {
  milestoneDay: number;
  type: string;
  id: string;
  label: string;
  unlockedAt: string;
};

export type CheckupCelebrationPending = {
  id: string;
  attendedOn: string;
  message: string;
};

export type ClinicianReminder = {
  id: string;
  note: string;
  frequency: 'daily' | 'weekly' | 'every_2_days' | 'every_3_days';
  hour: number;
  timeOfDay?: 'morning' | 'midday' | 'evening';
  carePlan?: {
    summary?: string;
    startDate?: string;
    endDate?: string;
    slots?: {
      id: string;
      date: string;
      mealLabel: string;
      prompt: string;
      status: string;
    }[];
  } | null;
  todayMoment?: {
    id: string;
    date: string;
    mealLabel: string;
    prompt: string;
    isToday: boolean;
  } | null;
};

export type CompanionState = {
  mood: 'happy' | 'resting';
  vitality: 'bright' | 'fatigued' | 'dim' | 'dormant';
  growthStage: 'baby' | 'little' | 'growing' | 'playful' | 'adventurer' | 'grown';
  petGender: PetGender;
  walksAvailable: boolean;
  unlocks: Unlock[];
  newlyUnlocked: Unlock[];
  /** YYYY-MM-DD days with a check-in (for soft presence dots). */
  helloDays?: string[];
  /** One-time clinician checkup celebration, if waiting to be shown. */
  checkupCelebration?: CheckupCelebrationPending | null;
  /** Clinician-scheduled reminder (note + frequency; not AI). */
  clinicianReminder?: ClinicianReminder | null;
  careGoals?: { title: string; messages: string[] } | null;
} & PetAppearance;

export type AuthResult = { user: User; token: string };

/** Full response returned after the patient chooses their first companion. */
export type OnboardingResult = {
  user: User;
  companion: CompanionState;
};

export type OnboardingInput = Omit<Partial<PetAppearance>, 'petType' | 'petName'> & {
  petType: string;
  petName: string;
  petGender?: PetGender;
  timezone?: string;
};

/** Used when the device cannot expose a valid IANA timezone. */
export const DEFAULT_TIMEZONE = 'Asia/Singapore';

/**
 * Resolve the device timezone without making onboarding depend on a native
 * module. Intl is available in Expo's native and web runtimes; invalid values
 * are rejected so the API always receives an IANA timezone identifier.
 */
export function getDeviceTimezone(): string {
  try {
    const candidate = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof candidate === 'string' && candidate.trim()) {
      // Constructing a formatter is the platform-supported validity check for
      // IANA identifiers. Some browsers return an empty/legacy value here.
      new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format();
      return candidate;
    }
  } catch {
    // Fall through to the stable product default.
  }
  return DEFAULT_TIMEZONE;
}

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

export function completeOnboarding(
  userId: string,
  input: OnboardingInput
): Promise<OnboardingResult>;
/** Legacy call shape retained for the unused older onboarding screen. */
export function completeOnboarding(
  userId: string,
  petType: string,
  petName: string,
  petGender: PetGender,
  timezone?: string
): Promise<User>;
export async function completeOnboarding(
  userId: string,
  inputOrPetType: OnboardingInput | string,
  legacyPetName?: string,
  legacyPetGender?: PetGender,
  legacyTimezone?: string
): Promise<OnboardingResult | User> {
  const legacyCall = typeof inputOrPetType === 'string';
  const input: OnboardingInput = legacyCall
    ? {
        petType: inputOrPetType,
        petName: legacyPetName || '',
        petGender: legacyPetGender || 'female',
        timezone: legacyTimezone,
      }
    : inputOrPetType;
  const timezone = input.timezone || getDeviceTimezone();
  const res = await fetch(`${API_BASE}/api/patient/${userId}/onboarding`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ ...input, petGender: input.petGender || 'female', timezone }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not save your companion');
  assertNoNutritionLeak(data);
  return legacyCall ? data.user : { user: data.user, companion: data.companion };
}

/**
 * Keep the backend's local-calendar day boundary current when a patient signs
 * in on a device whose timezone changed after onboarding. This is deliberately
 * best-effort at call sites so an unavailable sync route never blocks access.
 */
export async function syncTimezone(userId: string, timezone = getDeviceTimezone()): Promise<User> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/timezone`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ timezone }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not sync timezone');
  return data.user;
}

export async function fetchCompanion(userId: string): Promise<CompanionState> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/companion`, {
    headers: await authHeaders(false),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not load companion');
  assertNoNutritionLeak(data);
  return data;
}

/** Mark checkup celebration as seen so it does not repeat. */
export async function acknowledgeCheckupCelebration(
  userId: string,
  celebrationId: string
): Promise<CompanionState> {
  const res = await fetch(
    `${API_BASE}/api/patient/${userId}/checkup-celebration/${celebrationId}/ack`,
    {
      method: 'POST',
      headers: await authHeaders(),
    }
  );
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not acknowledge celebration');
  return data;
}

/** Move today's/overdue care-plan moments later — no catch-up stacking. */
export async function skipCarePlanToday(userId: string): Promise<CompanionState> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/care-plan/skip-today`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not adjust care plan');
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
  mimeType = 'image/jpeg',
  visitNote?: string
): Promise<{ checkIn: unknown; companion: CompanionState; visitNoteSaved?: boolean }> {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const body: Record<string, string> = { imageBase64: cleaned, mimeType };
  const note = (visitNote || '').trim();
  if (note) body.visitNote = note;
  const res = await fetch(`${API_BASE}/api/patient/${userId}/check-in`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
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
  mimeType = 'image/jpeg',
  visitNote?: string
): Promise<{ checkIn: unknown; companion: CompanionState; visitNoteSaved?: boolean }> {
  const form = new FormData();
  form.append('photo', {
    uri,
    name: 'checkin.jpg',
    type: mimeType,
  } as unknown as Blob);
  const note = (visitNote || '').trim();
  if (note) form.append('visitNote', note);

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

/** Optional free-text for care team — stored verbatim; no AI processing. */
export async function submitVisitNote(
  userId: string,
  text: string,
  checkInId?: string
): Promise<{ visitNoteSaved: boolean; id: string; createdAt: string }> {
  const res = await fetch(`${API_BASE}/api/patient/${userId}/visit-notes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      text: text.trim(),
      ...(checkInId ? { checkInId } : {}),
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data.error || 'Could not save note');
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
