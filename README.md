# Buddi

Clinic-connected meal companion for anorexia-supportive care: **companionship over competition**.

| Part | Folder | Stack |
|------|--------|--------|
| Patient app | `mobile/` | Expo SDK 57 (React Native) — **Buddi** |
| Clinician dashboard | `dashboard/` | Vite + React — **Buddi Clinic** |
| API | `backend/` | Express + JWT + JSON file store |

## What it does

- **Patient check-in** — live camera only (no gallery). Optional free-text visit note for the care team (never AI-processed).
- **Companion** — selectable 3D pet with engagement-based vitality (`bright` → `fatigued` / `dim` / `dormant`). Lower engagement shows a calm resting/sleepy presentation (slow idle, soft eyes, breathing) — not opacity dimming or punishment.
- **Milestones & cosmetics** — streak high-water unlocks keepsakes (scarf, scenes, glasses, etc.); wardrobe styling on Home / Customize.
- **Quiet Time** — optional soft ambient bonding screen (always available).
- **AI (clinic-side)** — meal photo analysis + clinician digests + explainable observational alerts. Patients never see calories, macros, or scores.
- **Clinician dashboard** — patient list, alerts, summaries, visit notes (verbatim), care reminders, checkup celebration.

## Non-negotiables

- Live camera only (no gallery picker)
- Companion is happy or resting — never punished / suffering
- Patients never see calories, macros, or scores (enforced in the API)
- AI observes; clinicians decide
- Checkup celebration and care reminders are **attendance / clinician-scheduled** — not body metrics or AI scheduling

---

## Prerequisites

- **Node.js 22+** (LTS recommended)
- npm
- For the phone app: **Expo Go** on Android (SDK 57), **or** an EAS Android APK
- Same Wi-Fi (or hotspot) as your laptop when testing on a real phone

---

## 1. Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

| Variable | Required? | Notes |
|----------|-----------|--------|
| `JWT_SECRET` | **Yes** | Long random string — server will not start without it |
| `GEMINI_API_KEY` | Optional | Live meal vision + clinician summaries (preferred) |
| `OPENAI_API_KEY` | Optional | Fallback if Gemini is unset |
| *(neither AI key)* | — | Deterministic **mock** AI (fine for UI demos) |

```bash
npm install
npm run seed
npm run dev
```

- API: http://localhost:3001
- Health: http://localhost:3001/api/health

Re-seed anytime (rewrites `backend/data/store.json`):

```bash
npm run seed
```

From repo root: `npm run backend` / `npm run backend:seed` / `npm run backend:test`.

---

## 2. Clinician dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open the Vite URL (usually http://localhost:5173).

**Sign in:** `clinic@demo.local` / `demo`

---

## 3. Patient mobile app

```bash
cd mobile
npm install
```

### Point the phone at your API

Create or edit `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_PC_LAN_IP:3001
```

| Where you run | Typical API URL |
|---------------|-----------------|
| iOS Simulator | `http://localhost:3001` (default if unset) |
| Android emulator | `http://10.0.2.2:3001` (default if unset) |
| Physical phone | `http://YOUR_LAN_IP:3001` (**required**) |

Restart Expo after changing `.env`. Optional Windows firewall helper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/open-demo-ports.ps1
```

### Start Expo

```bash
cd mobile
npx expo start
```

Or from repo root: `npm run mobile`.

### Demo accounts (password `demo` for all)

| Email | Scenario |
|-------|----------|
| `maya@demo.local` | Healthy / engaged + visit note |
| `riley@demo.local` | Soft rest (short gap) |
| `jordan@demo.local` | Long gap / dormant + miss alert |
| `blake@demo.local` | Next check-in unlocks day-5 scarf |
| `casey@demo.local` | Day-10 cosmetics already on |
| `sam@demo.local` | Rich history for clinician digest |
| `clinic@demo.local` | Clinician dashboard |

In **dev builds** (`__DEV__` / Expo Go), a small **Demo ▾** chip (top-right) jumps between seeded `@demo.local` patients. It does not appear in production builds without `EXPO_PUBLIC_DEMO_MODE=1`.

---

## Android vs iPhone

| Device | How to open |
|--------|-------------|
| **Android** | Expo Go (SDK 57) or EAS preview APK |
| **iPhone** | Store Expo Go is often older SDK — prefer Android handset or show the dashboard on a laptop unless you have an Apple Developer + EAS iOS build |

---

## Quick start (three terminals)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd dashboard && npm run dev

# Terminal 3
cd mobile && npx expo start
```

---

## What to show in a demo

See **[DEMO.md](./DEMO.md)** for the pitch path.

Ethics lines:

1. **Patients never see calories, macros, or scores.**
2. **Companion rests as a cozy default — never suffers or dies.**
3. **AI observes; clinicians decide.**

---

## Known limitations

- **Vitality ↔ intake (internal):** Companion vitality can be influenced by estimated calorie deficit vs clinician target. Patients never see those numbers; the coupling is a deliberate tradeoff, not a patient-facing score.
- **Growth chapters:** Unlock milestones also drive a gentle **scale / proportion** presentation in the 3D viewer (baby → grown chapters), not unlocks alone. Wardrobe cosmetics stay separate from body “weight” metaphors.
- **Demo timezones:** Seeded histories assume **Asia/Singapore** day boundaries. Logging in on a device in another timezone can rewrite the patient TZ and shift miss/streak narratives — keep the demo phone on Singapore time when showing Riley/Jordan/Blake stories.
- **Licensing gaps:** Current `rabbit.glb` attribution is still pending confirmation; see `mobile/assets/characters/ATTRIBUTION.md`.

---

## Project layout

```
backend/     Express API, seed data, AI (Gemini → OpenAI → mock)
dashboard/   Clinician web UI
mobile/      Patient Expo app (3D companion, check-in, settings)
scripts/     Demo helpers (firewall ports, LAN Expo)
DEMO.md      Pitch / demo checklist
```

Asset credits: `mobile/assets/characters/ATTRIBUTION.md`, `mobile/assets/audio/animal-calls/LICENSES.md`.

---

## Intentionally out of scope

- Production database / multi-instance hosting
- App Store / Play Store submission without EAS + store accounts
- Clinician mobile app
- Patient-facing calorie UI or punitive companion states
