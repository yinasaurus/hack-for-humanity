# Demo day — 90 seconds

## Before you start

1. **AI key** in `backend/.env`: prefer `GEMINI_API_KEY` (or `OPENAI_API_KEY`). Restart backend. Clinic should show **Live AI**.
2. **Phone ↔ PC**: same Wi‑Fi/hotspot. Set `mobile/.env` → `EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3001`. Restart Expo. Smoke-test `http://YOUR_PC_IP:3001/api/health` on the phone.
3. Firewall (Admin, once): `powershell -ExecutionPolicy Bypass -File scripts/open-demo-ports.ps1`

## Ethics (say out loud)

1. Patients never see calories, macros, or scores.
2. Companion rests — never suffers or dies.
3. AI observes; clinicians decide.

## 90-second path

| Time | Show |
|------|------|
| :00–:20 | Phone: `maya@demo.local` / `demo` → companion → Talk / Wave |
| :20–:40 | Meal photo (live camera) → saved hello |
| :40–:55 | Style look / keepsake path, or Quiet time |
| :55–:75 | Clinic: `clinic@demo.local` / `demo` → Jordan alert → **Why this alert** |
| :75–:90 | Maya/Sam → Generate AI summary · optional care reminder (note + Morning/Midday/Evening) |

Backup if camera fails: existing Maya photos on clinic + Jordan alert + ethics lines.

## Skip (don’t burn time)

Real DB, App Store, clinician mobile app, anti-cheat / patient calorie UI.
